import { LEGAL_SITE, PRIVACY_POLICY_URL, SUPPORT_URL, TERMS_URL, TERMS_VERSION } from '../../constants/legal'

describe('legal constants', () => {
  it('serves every legal page over https', () => {
    // Apple opens these during review, and a plain-http link is both a rejection and a
    // privacy policy somebody can tamper with in transit.
    for (const url of [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL]) {
      expect(url.startsWith('https://')).toBe(true)
    }
  })

  it('derives every URL from the one site constant', () => {
    // The whole point of this file: changing domain is a one-line edit. A second hardcoded
    // origin is how a privacy policy ends up pointing at a domain nobody renewed.
    for (const url of [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL]) {
      expect(url.startsWith(LEGAL_SITE)).toBe(true)
    }
  })

  it('gives each page its own path rather than pointing them all at the homepage', () => {
    // Guideline 1.2 wants published contact information and 5.1.1 a real policy. A single
    // homepage link satisfying three requirements is what gets a first-round rejection.
    const paths = [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL].map((u) => u.slice(LEGAL_SITE.length))
    expect(new Set(paths).size).toBe(3)
    for (const path of paths) expect(path.length).toBeGreaterThan(1)
  })

  it('versions the terms with a date, so re-acceptance is answerable', () => {
    // A boolean cannot answer "did they accept THESE terms" when the terms change.
    expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
