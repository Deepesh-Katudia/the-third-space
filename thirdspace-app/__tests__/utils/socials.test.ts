import { normalizeHandle, isValidHandle, socialUrl, hasAnyHandle, SOCIAL_PLATFORMS } from '../../utils/socials'

describe('normalizeHandle', () => {
  it('strips a leading @', () => {
    expect(normalizeHandle('@maya')).toBe('maya')
  })

  it('strips repeated @ and surrounding whitespace', () => {
    expect(normalizeHandle('  @@maya  ')).toBe('maya')
  })

  it('lowercases, because handles are case-insensitive on all three platforms', () => {
    expect(normalizeHandle('MayaCodes')).toBe('mayacodes')
  })

  it('accepts a pasted profile URL, which is what people actually do', () => {
    expect(normalizeHandle('https://instagram.com/maya')).toBe('maya')
    expect(normalizeHandle('https://www.instagram.com/maya/')).toBe('maya')
    expect(normalizeHandle('instagram.com/maya')).toBe('maya')
  })

  it('accepts a pasted TikTok URL, where the @ is part of the path', () => {
    expect(normalizeHandle('https://tiktok.com/@maya')).toBe('maya')
  })

  it('accepts a twitter.com URL as well as x.com', () => {
    expect(normalizeHandle('https://twitter.com/maya')).toBe('maya')
    expect(normalizeHandle('https://x.com/maya')).toBe('maya')
  })

  it('returns empty for empty input', () => {
    expect(normalizeHandle('   ')).toBe('')
  })
})

describe('isValidHandle', () => {
  it('accepts ordinary handles on every platform', () => {
    expect(isValidHandle('instagram', 'maya.codes')).toBe(true)
    expect(isValidHandle('tiktok', 'maya_codes')).toBe(true)
    expect(isValidHandle('x', 'maya_codes')).toBe(true)
  })

  it('rejects characters the platform does not allow', () => {
    expect(isValidHandle('instagram', 'maya codes')).toBe(false)
    expect(isValidHandle('x', 'maya.codes')).toBe(false) // X allows no dots
    expect(isValidHandle('instagram', 'maya@codes')).toBe(false)
  })

  it('enforces each platform length limit at the boundary', () => {
    expect(isValidHandle('x', 'a'.repeat(15))).toBe(true)
    expect(isValidHandle('x', 'a'.repeat(16))).toBe(false)
    expect(isValidHandle('instagram', 'a'.repeat(30))).toBe(true)
    expect(isValidHandle('instagram', 'a'.repeat(31))).toBe(false)
    expect(isValidHandle('tiktok', 'a')).toBe(false) // TikTok minimum is 2
    expect(isValidHandle('tiktok', 'ab')).toBe(true)
    expect(isValidHandle('tiktok', 'a'.repeat(25))).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidHandle('instagram', '')).toBe(false)
  })
})

describe('socialUrl', () => {
  it('builds the public https URL for each platform', () => {
    expect(socialUrl('instagram', 'maya')).toBe('https://instagram.com/maya')
    expect(socialUrl('tiktok', 'maya')).toBe('https://tiktok.com/@maya')
    expect(socialUrl('x', 'maya')).toBe('https://x.com/maya')
  })
})

describe('hasAnyHandle', () => {
  it('is false for an empty object and for blank values', () => {
    expect(hasAnyHandle({})).toBe(false)
    expect(hasAnyHandle({ instagram: '' })).toBe(false)
  })

  it('is true when at least one handle is set', () => {
    expect(hasAnyHandle({ tiktok: 'maya' })).toBe(true)
  })
})

describe('SOCIAL_PLATFORMS', () => {
  it('is the single ordered source both the form and the chips read', () => {
    expect(SOCIAL_PLATFORMS.map((p) => p.id)).toEqual(['instagram', 'tiktok', 'x'])
  })
})
