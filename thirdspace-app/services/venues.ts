import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

export async function saveVenue(uid: string, venue: Venue): Promise<void> {
  await setDoc(
    doc(db, 'venues', uid),
    { ...venue, updatedAt: serverTimestamp() },
    { merge: true }
  )
}
