import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'

const PHONE_RE = /^\+1\d{10}$/

export async function claimPhoneNumber(db: Firestore, uid: string, email: string, phone: string): Promise<void> {
  if (!PHONE_RE.test(phone)) throw new HttpsError('invalid-argument', 'Phone number must be a 10-digit US number.')

  const phoneRef = db.doc(`phoneIndex/${phone}`)
  const userRef = db.doc(`users/${uid}`)

  await db.runTransaction(async (tx) => {
    const phoneSnap = await tx.get(phoneRef)
    if (phoneSnap.exists) {
      throw new HttpsError('already-exists', 'This phone number is already registered.')
    }
    tx.set(phoneRef, { uid, email })
    tx.set(userRef, { uid, email, phoneNumber: phone }, { merge: true })
  })
}

export const completeSignUp = onCall<{ phone: string }>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')

  const phone = request.data?.phone
  if (typeof phone !== 'string') throw new HttpsError('invalid-argument', 'phone is required.')

  const uid = request.auth.uid
  const email = request.auth.token.email ?? ''
  await claimPhoneNumber(getFirestore(), uid, email, phone)

  return { ok: true }
})
