import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getAuth } from 'firebase-admin/auth'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

/**
 * Account deletion, App Store Guideline 5.1.1(v).
 *
 * A callable rather than client code, because a client cannot: decrement
 * `registeredCount` on events it does not own, delete `follows` docs where the user is the
 * TARGET (rules only let the follower delete an edge), remove Storage objects it no longer
 * has a reference to, or delete messages in threads it has lost read access to. The first
 * three would leave orphans; the last is a privacy failure, not untidiness.
 *
 * THE ORDER IS THE DESIGN: cascade first, Auth user last. A mid-way failure then leaves a
 * recoverable, still-signed-in account that can try again, rather than an unreachable
 * orphan whose data survives with nobody able to delete it.
 */

/** Firestore's own batch limit, and what `deleteEvent` in services/events.ts already uses. */
const BATCH_LIMIT = 400

/**
 * Every Storage prefix rooted at a uid. The event-cover prefix is the HOSTER's uid rather
 * than an event id, which is why a hoster's covers are reachable here at all — see
 * storage.rules and utils/media.ts.
 */
export const STORAGE_PREFIXES: ((uid: string) => string)[] = [
  (uid) => `profilePhotos/${uid}/`,
  (uid) => `venuePhotos/${uid}/`,
  (uid) => `eventCovers/${uid}/`,
  (uid) => `chatMedia/${uid}/`,
]

interface Bucket {
  deleteFiles: (options: { prefix: string }) => Promise<unknown>
}

interface AuthLike {
  deleteUser: (uid: string) => Promise<void>
}

export interface DeleteDeps {
  db: Firestore
  bucket: Bucket
  auth: AuthLike
  /** Injectable so the future/past split in step 6 is deterministic under test. */
  now?: Date
  /** Injectable step recorder, so ordering can be asserted without patching internals. */
  onStep?: (step: string) => void
}

export interface DeleteReport {
  messages: number
  threadsRepaired: number
  registrations: number
  follows: number
  eventsCancelled: number
  batches: number
}

type DocRef = { path: string }
type Snapshot = { ref: DocRef; id: string; data: () => Record<string, unknown> | undefined }

/**
 * Deletes refs in chunks, returning how many batches it committed. A single batch over 900
 * message documents is rejected by Firestore outright, so this is not an optimisation.
 */
async function deleteInChunks(db: Firestore, refs: DocRef[]): Promise<number> {
  let batches = 0
  for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    for (const ref of refs.slice(i, i + BATCH_LIMIT)) batch.delete(ref as never)
    await batch.commit()
    batches += 1
  }
  return batches
}

async function refsIn(db: Firestore, collectionPath: string): Promise<DocRef[]> {
  const snap = await db.collection(collectionPath).get()
  return snap.docs.map((d: Snapshot) => d.ref)
}

function threadPathOf(messagePath: string): string {
  // conversations/{id}/messages/{mid} -> conversations/{id}
  return messagePath.split('/').slice(0, -2).join('/')
}

export async function cascadeDelete(deps: DeleteDeps, uid: string): Promise<DeleteReport> {
  const { db, bucket, auth } = deps
  const now = deps.now ?? new Date()
  const step = (name: string) => deps.onStep?.(name)

  const report: DeleteReport = {
    messages: 0,
    threadsRepaired: 0,
    registrations: 0,
    follows: 0,
    eventsCancelled: 0,
    batches: 0,
  }

  // ── 1. Messages the user authored, hard deleted ──────────────────────────
  // Hard deletion over anonymisation is the spec's deliberate choice: the stronger privacy
  // position, at the cost of DM threads reading one-sided afterwards.
  step('messages')
  const authored = await db.collectionGroup('messages').where('authorUid', '==', uid).get()
  const messageRefs = authored.docs.map((d: Snapshot) => d.ref)
  report.messages = messageRefs.length
  const affectedThreads = [...new Set(messageRefs.map((r) => threadPathOf(r.path)))]
  report.batches += await deleteInChunks(db, messageRefs)

  // ── 2. Thread metadata repair ────────────────────────────────────────────
  // lastMessage* is a denormalised snapshot. Left alone, a thread keeps showing text whose
  // message document no longer exists.
  step('threads')
  for (const threadPath of affectedThreads) {
    const remaining = await db.collection(`${threadPath}/messages`).get()
    const docs = remaining.docs
      .map((d: Snapshot) => d.data() ?? {})
      .sort((a, b) => millisOf(a.createdAt) - millisOf(b.createdAt))
    const newest = docs[docs.length - 1]
    await db.doc(threadPath).update({
      lastMessageText: (newest?.text as string) ?? '',
      lastMessageAuthor: (newest?.authorName as string) ?? '',
      lastMessageAt: newest?.createdAt ?? null,
      messageCount: docs.length,
    })
    report.threadsRepaired += 1
  }

  // ── 3. Registrations, and the counter on each event ──────────────────────
  step('registrations')
  const userSnap = await db.doc(`users/${uid}`).get()
  const registeredEventIds = ((userSnap.data()?.registeredEventIds as string[] | undefined) ?? [])
  for (const eventId of registeredEventIds) {
    const eventRef = db.doc(`events/${eventId}`)
    const eventSnap = await eventRef.get()
    // The event may have been deleted outright by its host, in which case there is no
    // counter to fix and no registration doc to remove.
    if (!eventSnap.data()) continue
    await db.doc(`events/${eventId}/registrations/${uid}`).delete()
    const current = Number(eventSnap.data()?.registeredCount ?? 0)
    // Math.max rather than increment(-1): a count that has already drifted must not be
    // made nonsensical, and this runs once per account rather than under contention.
    await eventRef.update({ registeredCount: Math.max(0, current - 1) })
    report.registrations += 1
  }

  // ── 4. Follows, BOTH directions ─────────────────────────────────────────
  // The inbound half is the reason this is a function at all: rules let only the follower
  // delete an edge, so a client-side delete would leave every follower dangling.
  step('follows')
  const outbound = await db.collection('follows').where('follower', '==', uid).get()
  const inbound = await db.collection('follows').where('target', '==', uid).get()
  const followRefs = [...outbound.docs, ...inbound.docs].map((d: Snapshot) => d.ref)
  report.follows = followRefs.length
  report.batches += await deleteInChunks(db, followRefs)

  // ── 5. Profile, its subcollections, then the profile itself ─────────────
  step('profile')
  const profileChildren = [
    ...(await refsIn(db, `profiles/${uid}/redemptions`)),
    ...(await refsIn(db, `profiles/${uid}/private`)),
  ]
  report.batches += await deleteInChunks(db, profileChildren)
  await db.doc(`profiles/${uid}`).delete()

  // ── 6. Venue and future events, if this account hosts ───────────────────
  // Past events SURVIVE: attendees' history and points would be corrupted by removing an
  // event they genuinely attended. Future ones are cancelled rather than deleted, so the
  // app's existing cancelled-event handling carries them and nobody turns up to a night
  // with no host.
  step('venue')
  const hosted = await db.collection('events').where('venueId', '==', uid).get()
  for (const eventDoc of hosted.docs as Snapshot[]) {
    const startsAt = eventDoc.data()?.startsAt
    if (millisOf(startsAt) <= now.getTime()) continue
    await db.doc(eventDoc.ref.path).update({ cancelled: true })
    report.eventsCancelled += 1
  }
  await db.doc(`venues/${uid}`).delete()

  // ── 7. The user document and its subcollections ─────────────────────────
  step('user')
  const userChildren = [
    ...(await refsIn(db, `users/${uid}/pushTokens`)),
    ...(await refsIn(db, `users/${uid}/chatReads`)),
    ...(await refsIn(db, `users/${uid}/blocks`)),
  ]
  report.batches += await deleteInChunks(db, userChildren)
  await db.doc(`users/${uid}`).delete()

  // ── 8. Storage ──────────────────────────────────────────────────────────
  step('storage')
  for (const prefix of STORAGE_PREFIXES) {
    await bucket.deleteFiles({ prefix: prefix(uid) })
  }

  // ── 9. The Auth user, LAST ──────────────────────────────────────────────
  step('auth')
  await auth.deleteUser(uid)

  return report
}

/** Firestore Timestamps, plain Dates and absent values, in one comparable number. */
function millisOf(value: unknown): number {
  if (value && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (value instanceof Date) return value.getTime()
  return 0
}

/**
 * Takes NO uid argument: it deletes the caller. Accepting one would turn this into a way to
 * delete somebody else's account, and no amount of checking inside makes that shape safe.
 */
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')
  const uid = request.auth.uid
  await cascadeDelete(
    { db: getFirestore(), bucket: getStorage().bucket(), auth: getAuth() },
    uid
  )
  return { ok: true }
})
