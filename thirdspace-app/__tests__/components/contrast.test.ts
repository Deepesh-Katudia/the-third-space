import { colors } from '../../constants/theme'
import { CATEGORY_COLORS } from '../../constants/categories'
import { AVATAR_PALETTE_FOR_TEST } from '../../utils/avatar'

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const v = hex.replace('#', '')
  const channel = (h: string) => {
    const c = parseInt(h, 16) / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  const r = channel(v.slice(0, 2))
  const g = channel(v.slice(2, 4))
  const b = channel(v.slice(4, 6))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('palette contrast', () => {
  it('pairs ink with the orange primary, not white (the comp rule)', () => {
    // Ink on orange is the readable pairing; white on orange is ~2:1 and fails.
    expect(contrast(colors.ink, colors.primary)).toBeGreaterThanOrEqual(4.5)
    expect(contrast('#FFFFFF', colors.primary)).toBeLessThan(3)
  })

  it('keeps body and ink text readable on the surface background', () => {
    expect(contrast(colors.ink, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.body, colors.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps muted text readable on surface and white', () => {
    expect(contrast(colors.muted, colors.surface)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(colors.muted, colors.white)).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps white readable on the dark primary CTA', () => {
    expect(contrast('#FFFFFF', colors.inkSoft)).toBeGreaterThanOrEqual(4.5)
  })

  it('carries white initials on every avatar color', () => {
    for (const c of AVATAR_PALETTE_FOR_TEST) {
      expect(contrast('#FFFFFF', c)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('carries white labels on every category tint', () => {
    for (const c of Object.values(CATEGORY_COLORS)) {
      expect(contrast('#FFFFFF', c)).toBeGreaterThanOrEqual(4.5)
    }
  })
})
