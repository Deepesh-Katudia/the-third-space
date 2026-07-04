import {
  collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { followDocId } from '../utils/follows'

export async function followUser(followerUid: string, targetUid: string): Promise<void> {
  if (followerUid === targetUid) throw new Error('Cannot follow yourself')
  await setDoc(doc(db, 'follows', followDocId(followerUid, targetUid)), {
    follower: followerUid,
    target: targetUid,
    createdAt: serverTimestamp(),
  })
}

export async function unfollowUser(followerUid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'follows', followDocId(followerUid, targetUid)))
}

export function subscribeFollowStatus(
  followerUid: string,
  targetUid: string,
  onChange: (isFollowing: boolean) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'follows', followDocId(followerUid, targetUid)),
    (snap) => onChange(snap.exists()),
    onError
  )
}

export function subscribeFollowing(
  uid: string,
  onChange: (targetUids: string[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'follows'), where('follower', '==', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => (d.data().target as string) ?? '')), onError)
}

export function subscribeFollowers(
  uid: string,
  onChange: (followerUids: string[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'follows'), where('target', '==', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => (d.data().follower as string) ?? '')), onError)
}
