import {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  toE164,
  validateSignUpForm,
  validateChangePasswordForm,
} from '../../utils/validation'

describe('validateEmail', () => {
  it('returns true for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('user+tag@domain.co')).toBe(true)
  })
  it('returns false for invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('missing@')).toBe(false)
  })
})

describe('validatePhoneNumber', () => {
  it('returns true for a valid 10-digit US number', () => {
    expect(validatePhoneNumber('2125551234')).toBe(true)
    expect(validatePhoneNumber('9175551234')).toBe(true)
  })
  it('returns false for fewer or more than 10 digits', () => {
    expect(validatePhoneNumber('212555123')).toBe(false)
    expect(validatePhoneNumber('21255512345')).toBe(false)
  })
  it('returns false for non-numeric input', () => {
    expect(validatePhoneNumber('212-555-1234')).toBe(false)
    expect(validatePhoneNumber('')).toBe(false)
  })
  it('returns false when the area code starts with 0 or 1', () => {
    expect(validatePhoneNumber('0125551234')).toBe(false)
    expect(validatePhoneNumber('1125551234')).toBe(false)
  })
})

describe('toE164', () => {
  it('prefixes 10 digits with +1', () => {
    expect(toE164('2125551234')).toBe('+12125551234')
  })
})

describe('validatePassword (Balanced policy)', () => {
  it('accepts a password with 8+ chars and 3+ character classes', () => {
    expect(validatePassword('Abcd1234')).toBe(true)
    expect(validatePassword('Abcd1234!')).toBe(true)
  })
  it('rejects a password with too few character classes', () => {
    expect(validatePassword('password123')).toBe(false) // lowercase + number only
    expect(validatePassword('abcdefghij')).toBe(false) // lowercase only
  })
  it('rejects a password under 8 characters', () => {
    expect(validatePassword('Ab1!')).toBe(false)
    expect(validatePassword('')).toBe(false)
  })
  it('rejects a common password', () => {
    expect(validatePassword('password')).toBe(false)
  })
})

describe('validateSignUpForm', () => {
  const valid = {
    name: 'Samantha',
    email: 'sam@example.com',
    phone: '2125551234',
    password: 'Abcd1234!',
    confirmPassword: 'Abcd1234!',
  }
  it('returns no errors for valid form', () => {
    expect(validateSignUpForm(valid)).toEqual({})
  })
  it('returns error when name is empty', () => {
    expect(validateSignUpForm({ ...valid, name: '' }).name).toBeDefined()
  })
  it('returns error when passwords do not match', () => {
    expect(validateSignUpForm({ ...valid, confirmPassword: 'different' }).confirmPassword).toBeDefined()
  })
  it('returns error for invalid email', () => {
    expect(validateSignUpForm({ ...valid, email: 'bademail' }).email).toBeDefined()
  })
  it('returns error for an invalid phone number', () => {
    expect(validateSignUpForm({ ...valid, phone: '12345' }).phone).toBeDefined()
  })
  it('returns error for a password that fails the policy', () => {
    expect(validateSignUpForm({ ...valid, password: 'password123', confirmPassword: 'password123' }).password).toBeDefined()
  })
  it('returns error for a password built from the user name or email', () => {
    expect(validateSignUpForm({ ...valid, password: 'Samantha1!', confirmPassword: 'Samantha1!' }).password).toBeDefined()
  })
})

describe('validateChangePasswordForm', () => {
  const valid = {
    currentPassword: 'OldPass1!',
    newPassword: 'Abcd1234!',
    confirmNewPassword: 'Abcd1234!',
    email: 'sam@example.com',
  }
  it('returns no errors for a valid change', () => {
    expect(validateChangePasswordForm(valid)).toEqual({})
  })
  it('requires the current password', () => {
    expect(validateChangePasswordForm({ ...valid, currentPassword: '' }).currentPassword).toBeDefined()
  })
  it('rejects a new password that fails the policy', () => {
    expect(validateChangePasswordForm({ ...valid, newPassword: 'weak', confirmNewPassword: 'weak' }).newPassword).toBeDefined()
  })
  it('rejects a new password identical to the current one', () => {
    expect(validateChangePasswordForm({ ...valid, newPassword: 'OldPass1!', confirmNewPassword: 'OldPass1!' }).newPassword).toBeDefined()
  })
  it('rejects when the confirmation does not match', () => {
    expect(validateChangePasswordForm({ ...valid, confirmNewPassword: 'Different1!' }).confirmNewPassword).toBeDefined()
  })
})
