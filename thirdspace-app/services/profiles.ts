import {
  doc, writeBatch, updateDoc, getDoc, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { CreateProfileInput, Profile } from '../types/models'

export async function createProfile(uid: string, input: CreateProfileInput, birthdate: Date): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'profiles', uid), {
    ...input,
    eventsCount: 0,
    points: 0,
    tier: 'Newcomer',
    verified: false,
    joinedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid), { birthdate: Timestamp.fromDate(birthdate) })
  await batch.commit()
}

export async function updateProfile(uid: string, partial: Partial<CreateProfileInput>): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), partial)
}

export function subscribeProfile(
  uid: string,
  onChange: (profile: Profile | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'profiles', uid),
    (snap) => onChange(snap.exists() ? (snap.data() as Profile) : null),
    onError
  )
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists() ? (snap.data() as Profile) : null
}
