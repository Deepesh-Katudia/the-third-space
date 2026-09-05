/**
 * Write-time content filtering, App Store Guideline 1.2's first requirement: "a method for
 * filtering objectionable material from being posted to the app".
 *
 * Deliberately a wordlist. The guideline asks for *a* method, not a good one, and a
 * wordlist plus report-and-block is the combination Apple accepts in practice. Anything
 * cleverer — a classifier, a moderation API — is speculative before there are users whose
 * actual behaviour could inform it, and it would put a network round trip in front of every
 * message send.
 *
 * WHAT IS ON THE LIST IS A PRODUCT DECISION, not an oversight: slurs and explicit sexual
 * terms, and NOT ordinary swearing. Blocking "damn" or "shit" in a social app annoys
 * everybody and protects nobody, and every false positive teaches members that the app is
 * broken. The list is a floor; the report queue is the real mechanism.
 *
 * It rejects at the boundary with a message rather than silently stripping text. Quietly
 * editing what somebody wrote is its own kind of failure — they would not know it happened,
 * and the sent message would not be theirs.
 */

/**
 * Lowercase, trimmed, no duplicates — `contentFilter.test.ts` enforces all three, because a
 * capitalised or padded entry would silently never match anything.
 *
 * Multi-word entries match across any run of whitespace.
 */
export const BLOCKED_TERMS: readonly string[] = [
  // Racial and ethnic slurs
  'nigger',
  'nigga',
  'chink',
  'spic',
  'kike',
  'wetback',
  'gook',
  // Homophobic and transphobic slurs
  'faggot',
  'tranny',
  'dyke',
  // Ableist slurs
  'retard',
  'retarded',
  // Explicit sexual solicitation and content
  'child porn',
  'cp offer',
  'rape you',
  'send nudes',
]

/**
 * Lower-cases and strips diacritics, so accenting a letter is not a way around the list.
 * NFD splits a letter from its accent; the range strips the accents that fall out.
 */
function normalise(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Escapes a term for use inside a RegExp, since a list entry is data, not a pattern. */
function escape(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Word-boundary matched, which is the whole difficulty. Without it "Scunthorpe" is an
 * unusable venue name and a three-letter entry matches half the dictionary — and
 * over-matching is the failure a member sees immediately, where under-matching is what the
 * report queue exists to catch.
 */
export function containsBlockedTerm(text: string, terms: readonly string[] = BLOCKED_TERMS): boolean {
  const haystack = normalise(text)
  if (!haystack.trim()) return false

  return terms.some((term) => {
    // Any run of whitespace between the words of a multi-word entry.
    const pattern = normalise(term).split(/\s+/).map(escape).join('\\s+')
    return new RegExp(`(^|[^\\p{L}\\p{N}])${pattern}($|[^\\p{L}\\p{N}])`, 'u').test(haystack)
  })
}

/**
 * Carries the field name, because a form with four inputs has to know which one to point
 * at. The message stays machine-readable (`content-rejected:<field>`) so a screen maps it
 * to copy rather than showing an exception string.
 */
export class ContentRejectedError extends Error {
  readonly field: string

  constructor(field: string) {
    super(`content-rejected:${field}`)
    this.name = 'ContentRejectedError'
    this.field = field
  }
}

/**
 * Throws if the text is not postable. Empty text passes: whether a field is REQUIRED is a
 * different question, answered by the form's own validation.
 */
export function assertClean(
  text: string,
  field: string,
  terms: readonly string[] = BLOCKED_TERMS
): void {
  if (containsBlockedTerm(text, terms)) throw new ContentRejectedError(field)
}
