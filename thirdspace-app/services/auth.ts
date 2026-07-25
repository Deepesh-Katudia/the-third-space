import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '../firebase/config'

// Firebase requires a recent login to change a password, so we re-authenticate
// with the current password first, then update. Throws Firebase auth errors
// (e.g. auth/wrong-password) for the caller to map to user-facing messages.
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('no-authenticated-user')
  const credential = EmailAuthProvider.credential(user.email, currentPassword)
  await reauthenticateWithCredential(user, credential)
  await updatePassword(user, newPassword)
}
