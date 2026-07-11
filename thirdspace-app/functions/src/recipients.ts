import { Firestore } from 'firebase-admin/firestore'

export interface PushTarget {
  uid: string
  token: string
}

// uids must already exclude the actor. Skips opted-out users; expands each remaining
// user's device tokens.
export async function activeTokensFor(db: Firestore, uids: string[]): Promise<PushTarget[]> {
  const targets: PushTarget[] = []
  for (const uid of uids) {
    const userSnap = await db.doc(`users/${uid}`).get()
    if (userSnap.get('pushEnabled') === false) continue
    const tokensSnap = await db.collection(`users/${uid}/pushTokens`).get()
    tokensSnap.docs.forEach((d) => targets.push({ uid, token: d.id }))
  }
  return targets
}

export async function isThreadMuted(db: Firestore, uid: string, convId: string): Promise<boolean> {
  const snap = await db.doc(`users/${uid}/chatReads/${convId}`).get()
  return snap.get('muted') === true
}

export async function isMutualFollow(db: Firestore, followerUid: string, targetUid: string): Promise<boolean> {
  const snap = await db.doc(`follows/${targetUid}_${followerUid}`).get()
  return snap.exists
}

export async function pruneDeadTokens(db: Firestore, targets: PushTarget[], deadTokens: string[]): Promise<void> {
  const dead = new Set(deadTokens)
  await Promise.all(
    targets.filter((t) => dead.has(t.token)).map((t) => db.doc(`users/${t.uid}/pushTokens/${t.token}`).delete())
  )
}
