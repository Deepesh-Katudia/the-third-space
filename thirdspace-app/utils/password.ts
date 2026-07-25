// Password policy: "Balanced" — at least 8 characters, at least 3 of the 4
// character classes, and not an obvious common or personal password. The
// strength meter still rewards going beyond the minimum (length + all 4 classes).

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MIN_CLASSES = 3

export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordChecks {
  minLength: boolean
  lowercase: boolean
  uppercase: boolean
  number: boolean
  symbol: boolean
  notCommon: boolean
  notPersonal: boolean
}

export interface PasswordEvaluation {
  checks: PasswordChecks
  classesMet: number
  meetsMinimum: boolean
  strength: PasswordStrength
}

export interface PasswordContext {
  email?: string
  name?: string
}

// Small, high-frequency blocklist. Not exhaustive — just enough to stop the
// passwords attackers try first. Compared case-insensitively.
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'passw0rd', '12345678', '123456789', '1234567890',
  'qwerty', 'qwerty123', 'qwertyuiop', '111111', '000000', 'iloveyou',
  'letmein', 'welcome', 'welcome1', 'admin', 'admin123', 'monkey', 'dragon',
  'abc123', 'football', 'sunshine', 'princess', 'baseball', 'trustno1',
])

const MIN_TOKEN_LENGTH = 3

function personalTokens(context?: PasswordContext): string[] {
  const tokens: string[] = []
  if (context?.email) {
    const local = context.email.split('@')[0].toLowerCase()
    if (local.length >= MIN_TOKEN_LENGTH) tokens.push(local)
  }
  if (context?.name) {
    context.name
      .toLowerCase()
      .split(/\s+/)
      .forEach((token) => {
        if (token.length >= MIN_TOKEN_LENGTH) tokens.push(token)
      })
  }
  return tokens
}

export function evaluatePassword(password: string, context?: PasswordContext): PasswordEvaluation {
  const lower = password.toLowerCase()

  const checks: PasswordChecks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    notCommon: password.length > 0 && !COMMON_PASSWORDS.has(lower),
    notPersonal: personalTokens(context).every((token) => !lower.includes(token)),
  }

  const classesMet =
    (checks.lowercase ? 1 : 0) +
    (checks.uppercase ? 1 : 0) +
    (checks.number ? 1 : 0) +
    (checks.symbol ? 1 : 0)

  const meetsMinimum =
    checks.minLength &&
    classesMet >= PASSWORD_MIN_CLASSES &&
    checks.notCommon &&
    checks.notPersonal

  return { checks, classesMet, meetsMinimum, strength: scoreStrength(password, classesMet, meetsMinimum) }
}

function scoreStrength(password: string, classesMet: number, meetsMinimum: boolean): PasswordStrength {
  if (!meetsMinimum) return 'weak'
  let score = 0
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  if (classesMet === 4) score += 1
  if (score >= 2) return 'strong'
  if (score === 1) return 'good'
  return 'fair'
}
