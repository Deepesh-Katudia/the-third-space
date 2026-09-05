import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, functions } from '../firebase/config'
import { TERMS_VERSION } from '../constants/legal'

/**
 * Account deletion, client side.
 *
 * The cascade itself is a Cloud Function (`deleteAccount`) — see functions/src for why a
 * client cannot do it. This module owns the two things that must happen around it:
 * re-authentication before, and signing out after.
 *
 * Re-auth is required for password accounts because Firebase treats deletion as a
 * sensitive operation and rejects it outside a recent-login window with
 * auth/requires-recent-login. It is also the correct posture regardless: a phone left
 * unlocked on a table should not be one tap from erasing somebody's account.
 */

/** True when the account signs in with a password, and so has one to re-enter. */
export function isPasswordAccount(): boolean {
  return auth.currentUser?.providerData?.some((p) => p.providerId === 'password') ?? false
}

export async function deleteMyAccount(currentPassword?: string): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('no-authenticated-user')

  if (isPasswordAccount()) {
    if (!user.email) throw new Error('no-authenticated-user')
    if (!currentPassword) throw new Error('password-required')
    // Throws auth/wrong-password or auth/invalid-credential for the screen to map.
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword))
  }
  // Apple and Google accounts have no password to re-enter. Firebase's own recent-login
  // window governs them, and a failure surfaces as auth/requires-recent-login, which the
  // screen explains rather than swallowing.

  // No uid is sent: the callable deletes its caller by design.
  await httpsCallable(functions, 'deleteAccount')({})

  // Only after the cascade succeeds. Signing out first would leave somebody looking at the
  // welcome screen with their data still in Firestore and no way to retry.
  await signOut(auth)
}

/**
 * Records that this account accepted the published terms.
 *
 * On `users/{uid}` rather than `profiles/{uid}`, which is where the spec put it. Two
 * reasons: acceptance happens at SIGN-UP, before a profile exists at all, and hosters never
 * get a profile document — a profile-only stamp would silently lose every hoster's
 * acceptance. `users/{uid}` is the one document every account has.
 *
 * Merged, and never touching `role`, so the write-once role rule in firestore.rules allows
 * it. Best-effort by design: a member who has ticked the box and created an account must
 * not be bounced back to the form because one metadata write failed. The box is the
 * consent; this is the record of it, and a missing record is recoverable by re-prompting.
 */
export async function stampTermsAcceptance(uid: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid),
      { termsAcceptedAt: serverTimestamp(), termsVersion: TERMS_VERSION },
      { merge: true }
    )
  } catch {
    // Swallowed for the reason above. If this proves worth retrying, the place to do it is
    // a re-acceptance prompt keyed on termsVersion, not a blocked sign-up.
  }
}
