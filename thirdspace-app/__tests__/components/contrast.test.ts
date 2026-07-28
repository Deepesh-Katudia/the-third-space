import { palette } from '../../constants/design'
import { AVATAR_PALETTE_FOR_TEST } from '../../utils/avatar'

/**
 * Avatar tints are the one thing that deliberately sits OUTSIDE the two-tone palette —
 * they encode identity, and flattening them to ink would make every member look alike.
 * Because they are exempt from the token rule, they need their own contrast guard.
 *
 * The rest of the palette is covered by __tests__/constants/design.test.ts.
 */

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

describe('avatar contrast', () => {
  it('carries cream initials at AA on every avatar color', () => {
    // Avatars render initials in palette.cream, not white — the palette has no white.
    for (const c of AVATAR_PALETTE_FOR_TEST) {
      expect(contrast(palette.cream, c)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps every avatar tint dark enough to sit on the light ticket fill', () => {
    // Avatars appear as circles on orangeLight cards; a too-light tint would vanish.
    for (const c of AVATAR_PALETTE_FOR_TEST) {
      expect(contrast(c, palette.orangeLight)).toBeGreaterThanOrEqual(3)
    }
  })
})
