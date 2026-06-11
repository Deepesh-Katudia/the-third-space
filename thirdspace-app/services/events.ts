import {
  addDoc,
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
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { AgeRequirement, CommunityEvent, EventCategory, Registration, Venue } from '../types/models'

const DELETE_BATCH_SIZE = 400

function toEvent(snap: QueryDocumentSnapshot<DocumentData>): CommunityEvent {
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

export async function createEvent(venueId: string, venue: Venue, input: CreateEventInput): Promise<void> {
  await addDoc(collection(db, 'events'), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    startsAt: Timestamp.fromDate(input.startsAt),
    capacity: input.capacity,
    ageRequirement: input.ageRequirement,
    venueId,
    venueName: venue.name,
    neighborhood: venue.neighborhood,
    registeredCount: 0,
    createdAt: serverTimestamp(),
  })
}

export function subscribeUpcomingEvents(
  onChange: (events: CommunityEvent[]) => void,
  onError: () => void
): () => void {
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
    (snap) => onChange(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) } : null),
    onError
  )
}

export function subscribeIsRegistered(
  eventId: string,
  uid: string,
  onChange: (isRegistered: boolean) => void
): () => void {
  return onSnapshot(doc(db, 'events', eventId, 'registrations', uid), (snap) => onChange(snap.exists()))
}

export function subscribeRegistrations(
  eventId: string,
  onChange: (registrations: Registration[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, 'events', eventId, 'registrations'),
    (snap) =>
      onChange(snap.docs.map((d) => ({ uid: d.id, displayName: (d.data().displayName as string) ?? 'Member' }))),
    onError
  )
}

export async function registerForEvent(eventId: string, uid: string, displayName: string): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'events', eventId, 'registrations', uid), {
    displayName,
    registeredAt: serverTimestamp(),
  })
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayUnion(eventId) })
  await batch.commit()
}

export async function cancelRegistration(eventId: string, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'events', eventId, 'registrations', uid))
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(-1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayRemove(eventId) })
  await batch.commit()
}

export async function deleteEventWithRegistrations(eventId: string): Promise<void> {
  const registrations = await getDocs(collection(db, 'events', eventId, 'registrations'))
  const docs = registrations.docs
  for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db)
    docs.slice(i, i + DELETE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'events', eventId))
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
      events.push({ id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) })
    } else {
      missingIds.push(ids[i])
    }
  })

  // Prune ids for events the venue cancelled (spec: silently skip and clean up).
  if (missingIds.length > 0) {
    await updateDoc(doc(db, 'users', uid), { registeredEventIds: arrayRemove(...missingIds) })
  }

  events.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
  return events
}
