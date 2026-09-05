import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../firebase/config'

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
