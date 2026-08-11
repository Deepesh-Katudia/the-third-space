import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { AgeRequirement, CommunityEvent, EventCategory, MediaAsset, Registration, Venue } from '../types/models'
import { POINTS_PER_EVENT, tierForPoints } from '../utils/points'
import { deleteMedia } from './media'

const DELETE_BATCH_SIZE = 400

// Accepts both QueryDocumentSnapshot and already-exists-checked DocumentSnapshot.
function toEvent(snap: DocumentSnapshot<DocumentData>): CommunityEvent {
  return { id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) }
}

export interface CreateEventInput {
  title: string
  description: string
  category: EventCategory
  startsAt: Date
  capacity: number
  ageRequirement: AgeRequirement
}

/**
 * Mint the id BEFORE the write. The cover's storage path contains the event id
 * (`eventCovers/{hosterUid}/{eventId}/cover`), so the upload has to happen against a
 * ref we already hold — which `addDoc` cannot give us.
 */
export function newEventRef(): DocumentReference {
  return doc(collection(db, 'events'))
}

/** Extracted so the shape can be asserted without a Firestore round-trip. */
export function buildEventDoc(venueId: string, venue: Venue, input: CreateEventInput, cover?: MediaAsset) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    startsAt: Timestamp.fromDate(input.startsAt),
    capacity: input.capacity,
    ageRequirement: input.ageRequirement,
    venueId,
    venueName: venue.name,
    neighborhood: venue.neighborhood,
    ...(venue.borough ? { borough: venue.borough } : {}),
    // Spread rather than `cover: cover` — Firestore rejects an explicit undefined,
    // and CommunityEvent.cover is optional precisely so old events have no key.
    ...(cover ? { cover } : {}),
    registeredCount: 0,
    createdAt: serverTimestamp(),
  }
}

export async function createEvent(
  eventRef: DocumentReference,
  venueId: string,
  venue: Venue,
  input: CreateEventInput,
  cover?: MediaAsset
): Promise<void> {
  await setDoc(eventRef, buildEventDoc(venueId, venue, input, cover))
  await updateDoc(doc(db, 'venues', venueId), { eventsCount: increment(1) })
}

export function subscribeUpcomingEvents(
  onChange: (events: CommunityEvent[]) => void,
  onError: () => void
): () => void {
  // Timestamp.now() is captured at subscribe time: events that start while the
  // feed stays open remain visible until resubscribe. Accepted trade-off for v1.
  const upcoming = query(
    collection(db, 'events'),
    where('startsAt', '>=', Timestamp.now()),
    orderBy('startsAt', 'asc')
  )
  return onSnapshot(upcoming, (snap) => onChange(snap.docs.map(toEvent)), onError)
}

export function subscribeVenueEvents(
  venueId: string,
  onChange: (events: CommunityEvent[]) => void,
  onError: () => void
): () => void {
  // No orderBy: avoids a composite index. Sorted client-side (venues have few events).
  const own = query(collection(db, 'events'), where('venueId', '==', venueId))
  return onSnapshot(
    own,
    (snap) => {
      const events = snap.docs.map(toEvent)
      events.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
      onChange(events)
    },
    onError
  )
}

export function subscribeEvent(
  eventId: string,
  onChange: (event: CommunityEvent | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'events', eventId),
    (snap) => onChange(snap.exists() ? toEvent(snap) : null),
    onError
  )
}

export function subscribeIsRegistered(
  eventId: string,
  uid: string,
  onChange: (isRegistered: boolean) => void
): () => void {
  // Report `true` only once the registration is committed server-side (not a
  // pending local write). This gates the attendee-list subscription, whose
  // security rule checks the committed registrations collection: subscribing on
  // the optimistic local write races the commit and gets permission-denied.
  return onSnapshot(
    doc(db, 'events', eventId, 'registrations', uid),
    { includeMetadataChanges: true },
    (snap) => onChange(snap.exists() && !snap.metadata.hasPendingWrites)
  )
}

export function subscribeRegistrations(
  eventId: string,
  onChange: (registrations: Registration[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, 'events', eventId, 'registrations'),
    (snap) =>
      onChange(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            uid: d.id,
            displayName: (data.displayName as string) ?? 'Member',
            photoURL: (data.photoURL as string | null | undefined) ?? null,
            age: (data.age as number | undefined) ?? undefined,
            neighborhood: (data.neighborhood as string | undefined) ?? undefined,
            interestsPreview: (data.interestsPreview as string[] | undefined) ?? [],
          }
        })
      ),
    onError
  )
}

export async function registerForEvent(eventId: string, uid: string, displayName: string): Promise<void> {
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  const p = profileSnap.exists() ? profileSnap.data() : undefined
  const currentPoints = (p?.points as number | undefined) ?? 0
  const newPoints = currentPoints + POINTS_PER_EVENT

  const batch = writeBatch(db)
  batch.set(doc(db, 'events', eventId, 'registrations', uid), {
    displayName,
    photoURL: (p?.photoURL as string | null) ?? null,
    age: (p?.age as number | undefined) ?? null,
    neighborhood: (p?.neighborhood as string | undefined) ?? null,
    interestsPreview: ((p?.interests as string[] | undefined) ?? []).slice(0, 3),
    registeredAt: serverTimestamp(),
  })
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayUnion(eventId) })
  batch.set(
    doc(db, 'profiles', uid),
    { eventsCount: increment(1), points: increment(POINTS_PER_EVENT), tier: tierForPoints(newPoints) },
    { merge: true }
  )
  await batch.commit()
}

export async function cancelRegistration(eventId: string, uid: string): Promise<void> {
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  const currentPoints = profileSnap.exists() ? ((profileSnap.data().points as number | undefined) ?? 0) : 0
  const canRevokePoints = currentPoints >= POINTS_PER_EVENT

  const batch = writeBatch(db)
  batch.delete(doc(db, 'events', eventId, 'registrations', uid))
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(-1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayRemove(eventId) })
  batch.set(
    doc(db, 'profiles', uid),
    canRevokePoints
      ? { eventsCount: increment(-1), points: increment(-POINTS_PER_EVENT), tier: tierForPoints(currentPoints - POINTS_PER_EVENT) }
      : { eventsCount: increment(-1) },
    { merge: true }
  )
  await batch.commit()
}

export async function deleteEventWithRegistrations(eventId: string): Promise<void> {
  const eventSnap = await getDoc(doc(db, 'events', eventId))
  const venueId = eventSnap.exists() ? (eventSnap.data().venueId as string) : undefined

  // Best-effort, and deliberately before the doc is gone — this is the last moment the
  // cover URL is readable. deleteMedia never throws. Reuses the snapshot already read
  // for venueId rather than paying for a second get.
  const cover = eventSnap.exists() ? (eventSnap.data().cover as MediaAsset | undefined) : undefined
  if (cover) await deleteMedia(cover)

  const registrations = await getDocs(collection(db, 'events', eventId, 'registrations'))
  const docs = registrations.docs
  for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db)
    docs.slice(i, i + DELETE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'events', eventId))
  if (venueId) await updateDoc(doc(db, 'venues', venueId), { eventsCount: increment(-1) })
}

export async function getMyRegisteredEvents(uid: string): Promise<CommunityEvent[]> {
  const userSnap = await getDoc(doc(db, 'users', uid))
  const ids = ((userSnap.exists() ? userSnap.data().registeredEventIds : undefined) as string[] | undefined) ?? []
  if (ids.length === 0) return []

  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'events', id))))
  const events: CommunityEvent[] = []
  const missingIds: string[] = []
  snaps.forEach((snap, i) => {
    if (snap.exists()) {
      events.push(toEvent(snap))
    } else {
      missingIds.push(ids[i])
    }
  })

  // Prune ids for events the venue cancelled (spec: silently skip and clean up).
  if (missingIds.length > 0) {
    // Best-effort cleanup — a prune failure must not discard the events we already fetched.
    await updateDoc(doc(db, 'users', uid), { registeredEventIds: arrayRemove(...missingIds) }).catch(() => {})
  }

  events.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
  return events
}
