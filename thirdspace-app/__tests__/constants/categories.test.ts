import { EVENT_CATEGORIES, categoryLabel, categoryMeta, BOROUGHS } from '../../constants/categories'

describe('event categories', () => {
  it('ships exactly eight categories', () => {
    expect(EVENT_CATEGORIES).toHaveLength(8)
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
    expect(categoryLabel('stage-time')).toBe('Stage')
  })

  it('kept the slugs when the labels were rewritten', () => {
    // This is the entire point of the indirection. Every one of these was renamed —
    // 'creative-outlet' is Make, 'level-up' is Networking — and not one event moved.
    // A slug renamed to match its new label would orphan everything filed under it.
    expect(categoryLabel('creative-outlet')).toBe('Make')
    expect(categoryLabel('curious-minds')).toBe('Learn')
    expect(categoryLabel('lets-eat')).toBe('Eat')
    expect(categoryLabel('game-time')).toBe('Game Night')
    expect(categoryLabel('level-up')).toBe('Networking')
  })

  it('retires the two dropped categories without orphaning their events', () => {
    // Out of the picker, still readable. An event filed under one of these before the
    // cut renders a name, not a raw slug.
    const live = EVENT_CATEGORIES.map((c) => c.id)
    expect(live).not.toContain('day-drinks-nightlife')
    expect(live).not.toContain('lets-get-active')

    expect(categoryLabel('day-drinks-nightlife')).toBe('Day Drinks & Nightlife')
    expect(categoryLabel('lets-get-active')).toBe("Let's Get Active")
  })

  it('gives retired categories no meta, so they cannot be rendered as pickable', () => {
    // categoryMeta backs the picker rows and the per-category empty state. Returning a
    // row here would put a retired category back in front of a host.
    expect(categoryMeta('day-drinks-nightlife')).toBeUndefined()
    expect(categoryMeta('lets-get-active')).toBeUndefined()
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
