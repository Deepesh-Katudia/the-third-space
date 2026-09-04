import { palette, type as typeScale, radius, space, tabBar, motion, cloud, cloudMotion } from '../../constants/design'

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

  it('uppercases every role — caps are app-wide by intent', () => {
    // Supersedes the earlier rule that reserved the token for eyebrow/stubDay.
    // Display roles are caps regardless (Bebas Neue has no lowercase) but still
    // carry the token, because under this design caps are a deliberate choice
    // everywhere rather than a font limitation in some places.
    // See docs/superpowers/specs/2026-08-02-uppercase-typography-design.md
    for (const [role, style] of Object.entries(typeScale)) {
      expect([role, style.textTransform]).toEqual([role, 'uppercase'])
    }
  })

  it('tracks the body roles out, since uppercase Inter sets tight', () => {
    for (const role of ['bodyLg', 'body', 'bodySm', 'button'] as const) {
      expect(typeScale[role].letterSpacing).toBeGreaterThan(0)
    }
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

  it('gives every display role a line box the caps face can actually fit in', () => {
    // Bebas Neue's own line box is 1.20em (hhea ascent 900 / descent -300 over
    // 1000 upem); Android reserves 1.30em with includeFontPadding. Going tighter
    // crowds and clips multi-line titles — and several screens wrap display text.
    const display = ['screenTitle', 'cardTitle', 'stubDay', 'tabLabel'] as const
    for (const role of display) {
      expect(typeScale[role].lineHeight / typeScale[role].fontSize).toBeGreaterThanOrEqual(1.2)
    }
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

describe('ambient field tokens', () => {
  const GLOWS = [
    palette.ambientGlowGold,
    palette.ambientGlowPeach,
    palette.ambientGlowCream,
    palette.ambientGlowEmber,
    palette.ambientGlowSand,
  ]

  it('builds the field out of the two tones already in the palette', () => {
    // The app-wide background is the one gradient in the system, and it runs between
    // colours the rest of the app already uses — not a third and fourth orange.
    expect(luminance(palette.orangeDeep)).toBeLessThan(luminance(palette.orangeLight))
  })

  it('reads ink at AA across the whole field', () => {
    // Text sits over a range, not a single fill, so ink has to clear AA at BOTH ends
    // or it fails somewhere in the middle.
    expect(contrast(palette.ink, palette.orangeDeep)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(palette.ink, palette.orangeLight)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps every glow low-alpha, because the rings stack', () => {
    // Five concentric rings of one colour fake the radial falloff. Past ~0.15 the
    // outermost ring stops being invisible and the blob reads as a hard-edged disc.
    for (const glow of GLOWS) {
      const alpha = Number(glow.slice(glow.lastIndexOf(',') + 1, -1))
      expect(alpha).toBeGreaterThan(0)
      expect(alpha).toBeLessThanOrEqual(0.15)
    }
  })

  it('gives the glows distinct colours, so the field is not one flat wash', () => {
    expect(new Set(GLOWS).size).toBe(GLOWS.length)
  })

  it('keeps every glass token translucent enough to still be glass', () => {
    // Glass exists to let the ambient field through. Past roughly 0.5 the wash stops
    // reading as a pane over the field and starts reading as a washed-out solid, at
    // which point an honest flat tone would be the better choice. The one exception is
    // the lit edge, which is a 1px hairline rather than a fill.
    const FILLS = [palette.glassFill, palette.glassSheen, palette.glassEdgeSoft]
    for (const token of FILLS) {
      const alpha = Number(token.slice(token.lastIndexOf(',') + 1, -1))
      expect(alpha).toBeGreaterThan(0)
      expect(alpha).toBeLessThan(0.5)
    }
    const edge = Number(palette.glassEdge.slice(palette.glassEdge.lastIndexOf(',') + 1, -1))
    expect(edge).toBeLessThan(1)
  })

  it('leaves the cream veil short of opaque, so the field still moves under forms', () => {
    const alpha = Number(palette.creamVeil.slice(palette.creamVeil.lastIndexOf(',') + 1, -1))
    expect(alpha).toBeGreaterThan(0.7)
    expect(alpha).toBeLessThan(1)
  })
})

describe('welcome motion tokens', () => {
  it('reveals the sheet only after the tagline has settled', () => {
    // The whole point of the screen is the held beat. Guarding the ordering here
    // keeps it true regardless of which driver runs the animation.
    expect(motion.sheetDelay).toBeGreaterThan(motion.taglineDelay + motion.taglineIn)
  })

  it('staggers the three intro elements', () => {
    expect(motion.markDelay).toBeLessThan(motion.wordmarkDelay)
    expect(motion.wordmarkDelay).toBeLessThan(motion.taglineDelay)
  })

  it('keeps every duration positive', () => {
    for (const value of Object.values(motion)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})

describe('cloud prompt tokens', () => {
  const BODY_STOPS = [cloud.bodyTop, cloud.bodyBottom]

  it('reads every type colour at AA on BOTH gradient stops of the cloud body', () => {
    // The body is a 180deg gradient, so one value has to work at the top and the
    // bottom alike — a component must never pick a variant based on its position.
    // The comp's own #A87A0F (3.49:1) and #8A6B17 (4.18:1) both failed this and
    // were darkened. See the spec's contrast table.
    for (const stop of BODY_STOPS) {
      expect(contrast(cloud.eyebrow, stop)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(cloud.title, stop)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(cloud.body, stop)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reads the CTA label at AA on the CTA fill', () => {
    expect(contrast(cloud.ctaLabel, cloud.ctaFill)).toBeGreaterThanOrEqual(4.5)
  })

  it('orders the entrance so text lands only after the body has', () => {
    // The whole point of the comp is layering. If text beat the puffs in, it would
    // read as a slide-in with a caption rather than something forming.
    expect(cloudMotion.puffFirstDelay).toBeLessThan(cloudMotion.eyebrowDelay)
    expect(cloudMotion.eyebrowDelay).toBeLessThan(cloudMotion.titleDelay)
    expect(cloudMotion.titleDelay).toBeLessThan(cloudMotion.bodyDelay)
    expect(cloudMotion.bodyDelay).toBeLessThan(cloudMotion.ctaDelay)
    expect(cloudMotion.ctaDelay).toBeLessThan(cloudMotion.trailDelay)
  })

  it('starts the bob only after the entrance has finished', () => {
    // Overlapping them would fight the landing's overshoot.
    expect(cloudMotion.bobDelay).toBeGreaterThanOrEqual(cloudMotion.enterIn)
  })
})
