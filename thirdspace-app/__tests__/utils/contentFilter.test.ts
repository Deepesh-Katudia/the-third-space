import {
  assertClean,
  BLOCKED_TERMS,
  containsBlockedTerm,
  ContentRejectedError,
} from '../../utils/contentFilter'

// Behaviour is tested against an injected list, the way pickPrompt takes its catalogue:
// the matcher is what can be got wrong, and the real list does not belong splattered
// across a test file. Two tests below cover the shipped list's shape.
const TERMS = ['badword', 'twowords', 'naïve']

describe('containsBlockedTerm', () => {
  it('matches regardless of case', () => {
    expect(containsBlockedTerm('BadWord', TERMS)).toBe(true)
    expect(containsBlockedTerm('BADWORD', TERMS)).toBe(true)
  })

  it('matches through surrounding punctuation and newlines', () => {
    expect(containsBlockedTerm('you are a (badword).', TERMS)).toBe(true)
    expect(containsBlockedTerm('line one\nbadword\nline three', TERMS)).toBe(true)
  })

  it('does NOT match a term embedded in a longer innocent word', () => {
    // Word boundaries, or "Scunthorpe" is unusable as a venue name and "classic" trips a
    // filter on a three-letter substring. Over-matching is the failure users see first.
    expect(containsBlockedTerm('badwording', TERMS)).toBe(false)
    expect(containsBlockedTerm('notbadword', TERMS)).toBe(false)
  })

  it('matches a multi-word term with any run of whitespace between the words', () => {
    expect(containsBlockedTerm('two words', ['two words'])).toBe(true)
    expect(containsBlockedTerm('two   words', ['two words'])).toBe(true)
    expect(containsBlockedTerm('two\nwords', ['two words'])).toBe(true)
  })

  it('strips diacritics, so accenting a letter is not a way around it', () => {
    expect(containsBlockedTerm('bádwörd', TERMS)).toBe(true)
    expect(containsBlockedTerm('naive', TERMS)).toBe(true)
  })

  it('passes ordinary text, including ordinary swearing', () => {
    // A deliberate product call: this filter is for hate speech and explicit sexual
    // content, which is what Guideline 1.2 is about. Blocking "damn" in a chat app would
    // annoy everybody and protect nobody.
    expect(containsBlockedTerm('this venue is a bit shit honestly', TERMS)).toBe(false)
    expect(containsBlockedTerm('', TERMS)).toBe(false)
    expect(containsBlockedTerm('   ', TERMS)).toBe(false)
  })
})

describe('assertClean', () => {
  it('passes clean text through silently', () => {
    expect(() => assertClean('Sketching at Cellar 9', 'title', TERMS)).not.toThrow()
  })

  it('throws a field-tagged error so the screen can say which input', () => {
    // A form with four inputs needs to know WHICH one to point at.
    expect(() => assertClean('badword', 'bio', TERMS)).toThrow(ContentRejectedError)
    try {
      assertClean('badword', 'bio', TERMS)
    } catch (e) {
      expect((e as ContentRejectedError).field).toBe('bio')
      expect((e as Error).message).toBe('content-rejected:bio')
    }
  })

  it('accepts empty text — required-ness is somebody elses job', () => {
    expect(() => assertClean('', 'bio', TERMS)).not.toThrow()
  })
})

describe('the shipped list', () => {
  it('is not empty, or the filter is decoration', () => {
    expect(BLOCKED_TERMS.length).toBeGreaterThan(0)
  })

  it('is stored lowercase and unpadded, because matching normalises the input', () => {
    // A capitalised or space-padded entry would silently never match anything.
    for (const term of BLOCKED_TERMS) {
      expect(term).toBe(term.toLowerCase().trim())
      expect(term.length).toBeGreaterThan(2)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(BLOCKED_TERMS).size).toBe(BLOCKED_TERMS.length)
  })
})
