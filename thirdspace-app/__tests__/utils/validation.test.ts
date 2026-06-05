import { validateEmail, validatePassword, validateSignUpForm } from '../../utils/validation'

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

describe('validatePassword', () => {
  it('returns true for passwords 8+ characters', () => {
    expect(validatePassword('password123')).toBe(true)
    expect(validatePassword('12345678')).toBe(true)
  })
  it('returns false for passwords under 8 characters', () => {
    expect(validatePassword('1234567')).toBe(false)
    expect(validatePassword('')).toBe(false)
  })
})

describe('validateSignUpForm', () => {
  const valid = {
    name: 'Samantha',
    email: 'sam@example.com',
    password: 'password123',
    confirmPassword: 'password123',
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
  it('returns error for short password', () => {
    expect(validateSignUpForm({ ...valid, password: '123', confirmPassword: '123' }).password).toBeDefined()
  })
})
