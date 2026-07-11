import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function upsertPushToken(uid: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'pushTokens', token), { token, platform, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deletePushToken(uid: string, token: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'pushTokens', token))
}

export async function setPushEnabled(uid: string, enabled: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid), { pushEnabled: enabled }, { merge: true })
}

export async function getPushEnabled(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.data()?.pushEnabled !== false
}
