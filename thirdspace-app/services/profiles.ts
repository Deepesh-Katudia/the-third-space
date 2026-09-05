import {
  doc, collection, writeBatch, updateDoc, setDoc, getDoc, onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { CreateProfileInput, Profile, Reward, SocialHandles } from '../types/models'
import { tierForPoints } from '../utils/points'
import { assertClean } from '../utils/contentFilter'

export async function createProfile(uid: string, input: CreateProfileInput, birthdate: Date): Promise<void> {
  assertClean(input.displayName, 'name')
  assertClean(input.bio, 'bio')
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
  // Partial, so only what is actually being written is checked. Passing undefined through
  // assertClean would reject an edit that never touched the field.
  if (partial.displayName !== undefined) assertClean(partial.displayName, 'name')
  if (partial.bio !== undefined) assertClean(partial.bio, 'bio')
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

// ── Social handles ────────────────────────────────────────────────────────
// A subcollection doc, not a profile field: profiles/{uid} is readable by every
// signed-in member, so "connections only" is only enforceable off that document.
const socialsDoc = (uid: string) => doc(db, 'profiles', uid, 'private', 'socials')

/**
 * Full overwrite, NOT a merge. The edit form always submits the complete set, so
 * an absent key is exactly how a member clears a handle they removed. A merge
 * would make removal impossible.
 */
export async function setSocials(uid: string, handles: SocialHandles): Promise<void> {
  await setDoc(socialsDoc(uid), handles)
}

/**
 * onError receives the Firestore error code. 'permission-denied' means the viewer
 * is neither the owner nor a mutual follow — the rules working as designed, not a
 * failure. The caller is responsible for telling the two apart.
 */
export function subscribeSocials(
  uid: string,
  onChange: (handles: SocialHandles) => void,
  onError: (code: string) => void
): () => void {
  return onSnapshot(
    socialsDoc(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as SocialHandles) : {}),
    (err) => onError(err.code)
  )
}
