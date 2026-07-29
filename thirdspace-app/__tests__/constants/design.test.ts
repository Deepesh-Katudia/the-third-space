import { palette, type as typeScale, radius, space, tabBar } from '../../constants/design'

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const channel = (h: string) => {
    const c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(v.slice(0, 2)) + 0.7152 * channel(v.slice(2, 4)) + 0.0722 * channel(v.slice(4, 6))
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = [palette.cream, palette.orangeDeep, palette.orangeLight]

describe('design palette', () => {
  it('reads ink at AA on every surface', () => {
    for (const surface of SURFACES) {
      expect(contrast(palette.ink, surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reads every accent at AA on BOTH orange tones', () => {
    // One accent value has to work on the deep field and the light ticket alike,
    // so a component never has to pick a variant based on its background.
    for (const accent of [palette.inkSoft, palette.clay, palette.sage]) {
      expect(contrast(accent, palette.orangeDeep)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(accent, palette.orangeLight)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('never pairs white with an orange surface', () => {
    // #FFFFFF on orangeDeep is 1.83:1. The rule the comp follows: ink on orange, never white.
    expect(contrast('#FFFFFF', palette.orangeDeep)).toBeLessThan(3)
    expect(contrast('#FFFFFF', palette.orangeLight)).toBeLessThan(3)
  })

  it('does not ship the comp values that fail AA', () => {
    expect(Object.values(palette)).not.toContain('#C4501F')
    expect(Object.values(palette)).not.toContain('#6E7A5E')
    expect(Object.values(palette)).not.toContain('#5C4F3F')
  })
})

describe('type scale', () => {
  it('binds each role to exactly one of the three faces', () => {
    const display = ['screenTitle', 'cardTitle', 'stubDay', 'tabLabel'] as const
    const body = ['body', 'bodySm', 'bodyLg', 'button'] as const
    const meta = ['meta', 'eyebrow'] as const

    for (const role of display) expect(typeScale[role].fontFamily).toMatch(/^BebasNeue_/)
    for (const role of body) expect(typeScale[role].fontFamily).toMatch(/^Inter_/)
    for (const role of meta) expect(typeScale[role].fontFamily).toMatch(/^IBMPlexMono_/)
  })

  it('reserves uppercase for eyebrows, chips and the date stub', () => {
    expect(typeScale.eyebrow.textTransform).toBe('uppercase')
    expect(typeScale.stubDay.textTransform).toBe('uppercase')
    // screenTitle/cardTitle carry no textTransform token — Bebas Neue has no lowercase,
    // so the glyphs render as caps either way; the token is reserved for roles where
    // caps are a deliberate style choice rather than a font limitation.
    expect(typeScale.screenTitle.textTransform).toBeUndefined()
    expect(typeScale.cardTitle.textTransform).toBeUndefined()
  })

  it('gives every role a line height at least its font size', () => {
    for (const role of Object.values(typeScale)) {
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize)
    }
  })

  it('resolves every display role to one family — the face has a single weight', () => {
    // Bebas Neue has no weight axis. Two display families, or a second Bebas file
    // pretending to be a weight, would be a mistake; this is the guard that says so.
    const display = ['screenTitle', 'cardTitle', 'stubDay', 'tabLabel'] as const
    const families = new Set(display.map((role) => typeScale[role].fontFamily))
    expect(families.size).toBe(1)
  })

  it('sizes the display roles for a narrow caps face', () => {
    // A straight family swap at Antonio's sizes reads visibly smaller, because
    // Bebas 400 is lighter and narrower than Antonio 700.
    expect(typeScale.screenTitle.fontSize).toBe(34)
    expect(typeScale.cardTitle.fontSize).toBe(19)
    expect(typeScale.stubDay.fontSize).toBe(24)
    expect(typeScale.tabLabel.fontSize).toBe(12)
  })
})

describe('layout tokens', () => {
  it('exposes the ticket radius and a 4-point space scale', () => {
    expect(radius.ticket).toBe(14)
    expect(space.md % 4).toBe(0)
  })

  it('gives the tab bar the light orange fill with a clay active state', () => {
    expect(tabBar.backgroundColor).toBe(palette.orangeLight)
    expect(tabBar.activeTintColor).toBe(palette.clay)
  })
})
