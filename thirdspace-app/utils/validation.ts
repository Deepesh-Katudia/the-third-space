export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= 8
}

export interface SignUpFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export function validateSignUpForm(fields: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): SignUpFormErrors {
  const errors: SignUpFormErrors = {}
  if (!fields.name.trim()) errors.name = 'Full name is required.'
  if (!validateEmail(fields.email)) errors.email = 'Please enter a valid email address.'
  if (!validatePassword(fields.password)) errors.password = 'Password must be at least 8 characters.'
  if (fields.password !== fields.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  return errors
}
