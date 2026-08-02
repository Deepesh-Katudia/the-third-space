import { EVENT_CATEGORIES, categoryLabel, categoryMeta, BOROUGHS } from '../../constants/categories'

describe('event categories', () => {
  it('ships exactly ten categories', () => {
    expect(EVENT_CATEGORIES).toHaveLength(10)
  })

  it('gives every category a unique slug', () => {
    const ids = EVENT_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every category a label, a blurb and an emoji', () => {
    // The blurb is what stops a host guessing at "Touch Grass" or "Slow Down",
    // so an empty one is a real defect rather than a cosmetic omission.
    for (const c of EVENT_CATEGORIES) {
      expect([c.id, c.label.length > 0]).toEqual([c.id, true])
      expect([c.id, c.blurb.length > 0]).toEqual([c.id, true])
      expect([c.id, c.emoji.length > 0]).toEqual([c.id, true])
    }
  })

  it('uses slugs, not display strings, as the stored id', () => {
    // The whole point of the slug design: ids survive copy changes. A label
    // leaking into the id field would silently reintroduce the orphaning bug.
    for (const c of EVENT_CATEGORIES) {
      expect([c.id, c.id]).toEqual([c.id, c.id.toLowerCase()])
      expect(c.id).not.toContain(' ')
    }
  })

  it('drops the Social catch-all', () => {
    expect(EVENT_CATEGORIES.map((c) => c.id)).not.toContain('social')
    expect(EVENT_CATEGORIES.map((c) => c.label)).not.toContain('Social')
  })

  it('resolves a known slug to its label', () => {
    expect(categoryLabel('touch-grass')).toBe('Touch Grass')
    expect(categoryLabel('stage-time')).toBe('Stage Time: Comedy + Music')
  })

  it('falls back to the raw input for an unknown slug', () => {
    // A blank chip is a bug that hides; a visible "mystery-category" reports itself.
    expect(categoryLabel('mystery-category')).toBe('mystery-category')
    expect(categoryMeta('mystery-category')).toBeUndefined()
  })

  it('still exports the five boroughs', () => {
    expect(BOROUGHS).toHaveLength(5)
    expect(BOROUGHS).toContain('Brooklyn')
  })
})
