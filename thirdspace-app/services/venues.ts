import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

// Venue plus the denormalized eventsCount counter (kept off the Venue form type).
export interface VenueWithStats extends Venue {
  eventsCount: number
}

export async function saveVenue(uid: string, venue: Venue): Promise<void> {
  await setDoc(
    doc(db, 'venues', uid),
    { ...venue, updatedAt: serverTimestamp() },
    { merge: true }
  )
}

export async function getVenue(uid: string): Promise<VenueWithStats | null> {
  const snap = await getDoc(doc(db, 'venues', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return {
    name: (data.name as string) ?? '',
    borough: data.borough as Venue['borough'],
    neighborhood: (data.neighborhood as string) ?? '',
    description: (data.description as string) ?? '',
    eventsCount: (data.eventsCount as number | undefined) ?? 0,
  }
}
