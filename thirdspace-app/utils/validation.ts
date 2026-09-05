import { evaluatePassword, PasswordContext } from './password'

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// US-only, NANP-valid: exactly 10 digits, area code doesn't start with 0/1.
export function validatePhoneNumber(digits: string): boolean {
  return /^[2-9]\d{9}$/.test(digits)
}

export function toE164(digits: string): string {
  return `+1${digits}`
}

// Delegates to the Balanced password policy (see utils/password.ts).
export function validatePassword(password: string, context?: PasswordContext): boolean {
  return evaluatePassword(password, context).meetsMinimum
}

export interface SignUpFormErrors {
  name?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
  termsAccepted?: string
}

export function validateSignUpForm(fields: {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  /** Required: the acceptance is stamped onto the account, so it has to be given. */
  termsAccepted: boolean
}): SignUpFormErrors {
  const errors: SignUpFormErrors = {}
  if (!fields.name.trim()) errors.name = 'Full name is required.'
  if (!validateEmail(fields.email)) errors.email = 'Please enter a valid email address.'
  if (!validatePhoneNumber(fields.phone)) errors.phone = 'Enter a valid 10-digit US phone number.'
  if (!validatePassword(fields.password, { email: fields.email, name: fields.name })) {
    errors.password =
      'Use at least 8 characters with a mix of upper- and lower-case letters, numbers, or symbols — and avoid your name, email, or a common password.'
  }
  if (fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  if (!fields.termsAccepted) errors.termsAccepted = 'Please accept the Terms and Privacy Policy to continue.'
  return errors
}

export interface ChangePasswordFormErrors {
  currentPassword?: string
  newPassword?: string
  confirmNewPassword?: string
}

export function validateChangePasswordForm(fields: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
  email?: string
}): ChangePasswordFormErrors {
  const errors: ChangePasswordFormErrors = {}
  if (!fields.currentPassword) errors.currentPassword = 'Enter your current password.'
  if (!validatePassword(fields.newPassword, { email: fields.email })) {
    errors.newPassword =
      'Use at least 8 characters with a mix of upper- and lower-case letters, numbers, or symbols — and avoid your email or a common password.'
  } else if (fields.newPassword === fields.currentPassword) {
    errors.newPassword = 'Choose a password different from your current one.'
  }
  if (fields.newPassword !== fields.confirmNewPassword) errors.confirmNewPassword = 'Passwords do not match.'
  return errors
}
