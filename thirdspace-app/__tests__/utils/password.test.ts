import { evaluatePassword } from '../../utils/password'

describe('evaluatePassword — character-class checks', () => {
  it('flags each character class independently', () => {
    const { checks } = evaluatePassword('abcABC123!')
    expect(checks.lowercase).toBe(true)
    expect(checks.uppercase).toBe(true)
    expect(checks.number).toBe(true)
    expect(checks.symbol).toBe(true)
  })

  it('counts only the classes that are present', () => {
    expect(evaluatePassword('abcdefgh').classesMet).toBe(1)
    expect(evaluatePassword('abcd1234').classesMet).toBe(2)
    expect(evaluatePassword('Abcd1234').classesMet).toBe(3)
    expect(evaluatePassword('Abcd123!').classesMet).toBe(4)
  })

  it('marks the length requirement at 8 characters', () => {
    expect(evaluatePassword('Abc123!').checks.minLength).toBe(false) // 7
    expect(evaluatePassword('Abc1234!').checks.minLength).toBe(true) // 8
  })
})

describe('evaluatePassword — Balanced minimum (8+, 3 of 4 classes, not common/personal)', () => {
  it('rejects an empty password', () => {
    const result = evaluatePassword('')
    expect(result.meetsMinimum).toBe(false)
    expect(result.strength).toBe('weak')
  })

  it('rejects a long password with only one class', () => {
    expect(evaluatePassword('abcdefghijkl').meetsMinimum).toBe(false)
  })

  it('rejects an 8-char password with only two classes', () => {
    expect(evaluatePassword('abcd1234').meetsMinimum).toBe(false)
  })

  it('accepts an 8-char password with three classes', () => {
    const result = evaluatePassword('Abcd1234')
    expect(result.meetsMinimum).toBe(true)
    expect(result.strength).toBe('fair')
  })

  it('rejects a password below the length minimum even with all four classes', () => {
    expect(evaluatePassword('Ab1!').meetsMinimum).toBe(false)
  })
})

describe('evaluatePassword — common-password blocklist', () => {
  it('rejects a well-known common password (case-insensitive)', () => {
    expect(evaluatePassword('password').checks.notCommon).toBe(false)
    expect(evaluatePassword('PASSWORD').checks.notCommon).toBe(false)
    expect(evaluatePassword('password').meetsMinimum).toBe(false)
  })

  it('does not flag an ordinary strong password as common', () => {
    expect(evaluatePassword('Abcd1234').checks.notCommon).toBe(true)
  })
})

describe('evaluatePassword — personal-information blocklist', () => {
  it('rejects a password containing the email local-part', () => {
    const result = evaluatePassword('Maya12345!', { email: 'maya@example.com' })
    expect(result.checks.notPersonal).toBe(false)
    expect(result.meetsMinimum).toBe(false)
  })

  it('rejects a password containing a name token', () => {
    const result = evaluatePassword('Samantha1!', { name: 'Samantha Aleman' })
    expect(result.checks.notPersonal).toBe(false)
  })

  it('accepts a strong password unrelated to the email or name', () => {
    const result = evaluatePassword('Kx9!vqTm2wpz', { email: 'maya@example.com', name: 'Maya Chen' })
    expect(result.checks.notPersonal).toBe(true)
    expect(result.meetsMinimum).toBe(true)
  })
})

describe('evaluatePassword — strength meter', () => {
  it('scores a bare-minimum password as fair', () => {
    expect(evaluatePassword('Abcd1234').strength).toBe('fair') // 8 chars, 3 classes
  })

  it('scores a longer or fuller password as good', () => {
    expect(evaluatePassword('Abcd123!').strength).toBe('good') // 8 chars, 4 classes
    expect(evaluatePassword('Abcd1234wxyz').strength).toBe('good') // 12 chars, 3 classes
  })

  it('scores a long password with all four classes as strong', () => {
    expect(evaluatePassword('Abcd1234wxyz!').strength).toBe('strong') // 13 chars, 4 classes
  })

  it('never scores a password that fails the minimum above weak', () => {
    expect(evaluatePassword('abcdefghijkl').strength).toBe('weak') // long but one class
  })
})
