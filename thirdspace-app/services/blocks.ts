import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { BlockedUser } from '../types/models'

/**
 * The only module that touches `users/{uid}/blocks`.
 *
 * The doc id IS the blocked uid, which is what lets `firestore.rules` prove or disprove a
 * block with a single `exists()` on a constructible path — no index, no denormalisation,
 * and no mirror document that would let the blocked party enumerate who blocked them.
 */
function blocksCol(uid: string) {
  return collection(db, 'users', uid, 'blocks')
}

export async function blockUser(uid: string, targetUid: string): Promise<void> {
  // Blocking yourself would write a doc that makes every write gate deny your own
  // conversations, which reads as the app being broken rather than as a bad request.
  if (uid === targetUid) throw new Error('cannot-block-self')
  await setDoc(doc(blocksCol(uid), targetUid), { createdAt: serverTimestamp() })
}

export async function unblockUser(uid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(blocksCol(uid), targetUid))
}

/**
 * Live, because a block taken on one screen has to take effect on every other one
 * immediately — the member has just told the app they do not want to see somebody.
 *
 * Ids only: this feeds the app-wide filter set, and the blocked profile's name is
 * looked up per row by the one screen that lists them.
 */
export function subscribeBlocks(
  uid: string,
  onData: (uids: string[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    blocksCol(uid),
    (snap) => onData(snap.docs.map((d) => d.id)),
    onError
  )
}

/** The same subscription with timestamps, for the blocked-users screen. */
export function subscribeBlockedUsers(
  uid: string,
  onData: (blocked: BlockedUser[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    blocksCol(uid),
    (snap) => onData(snap.docs.map((d) => ({ uid: d.id, createdAt: d.data().createdAt ?? null }))),
    onError
  )
}
