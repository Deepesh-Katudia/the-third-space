import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { Firestore, getFirestore } from 'firebase-admin/firestore'

export async function lookupEmailForPhone(db: Firestore, phone: string): Promise<string> {
  const snap = await db.doc(`phoneIndex/${phone}`).get()
  const email = snap.get('email') as string | undefined
  if (!snap.exists || !email) throw new HttpsError('not-found', 'No account found for this phone number.')
  return email
}

export const resolveEmailForPhone = onCall<{ phone: string }>(async (request) => {
  const phone = request.data?.phone
  if (typeof phone !== 'string') throw new HttpsError('invalid-argument', 'phone is required.')

  const email = await lookupEmailForPhone(getFirestore(), phone)
  return { email }
})
