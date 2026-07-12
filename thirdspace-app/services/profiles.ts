import {
  doc, collection, writeBatch, updateDoc, getDoc, onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { CreateProfileInput, Profile, Reward } from '../types/models'
import { tierForPoints } from '../utils/points'

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

// Simulated ID verification: sets the verified badge. No real KYC — see the
// verify-identity screen. Firestore rules permit the owner to write `verified`.
export async function submitVerification(uid: string): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), {
    verified: true,
    verifiedAt: serverTimestamp(),
  })
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

export async function redeemReward(uid: string, reward: Reward, currentPoints: number): Promise<void> {
  const newPoints = currentPoints - reward.cost

  const batch = writeBatch(db)
  batch.set(
    doc(db, 'profiles', uid),
    { points: increment(-reward.cost), tier: tierForPoints(newPoints) },
    { merge: true }
  )
  batch.set(doc(collection(db, 'profiles', uid, 'redemptions')), {
    rewardId: reward.id,
    label: reward.label,
    cost: reward.cost,
    redeemedAt: serverTimestamp(),
  })
  await batch.commit()
}
