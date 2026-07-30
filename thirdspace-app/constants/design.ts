// Design tokens for the two-tone orange ticket system.
// Source comp: docs/events-redesign-mockup.html. Spec:
// docs/superpowers/specs/2026-07-25-antonio-ticket-redesign-design.md
//
// This file is the ONLY place a color may be written. __tests__/constants/tokens.test.ts
// fails the build if a converted screen or component reintroduces a literal hex.

export const palette = {
  /** Form + chat-thread background. */
  cream: '#FBF3E9',
  /** Browse/list screen background — the deeper of the two pastel tones. */
  orangeDeep: '#F3B27A',
  /** Ticket / card fill — the lighter of the two. */
  orangeLight: '#FCE3C0',

  /** Headings and primary text. 8.68:1 on deep, 12.79:1 on light. */
  ink: '#2B2015',
  /** Secondary text. Comp's #5C4F3F was 4.33:1 on deep — under AA — so darkened. */
  inkSoft: '#584C3C',
  /** Accent. Comp's #C4501F was 2.54:1 on deep and unreadable there. */
  clay: '#853615',
  /** Meta accent. Comp's #6E7A5E was 2.49:1 on deep. */
  sage: '#49513E',

  /** Dashed dividers and hairline rules. */
  rule: 'rgba(43,32,21,0.20)',

  /**
   * Welcome field (app/(auth)/onboarding.tsx) ONLY.
   *
   * The system rule is "no gradients — depth comes from tone, not blending". This is
   * the one granted exception and it is scoped to that single screen; no other surface
   * may use these. See docs/superpowers/specs/2026-07-30-welcome-screen-design.md.
   */
  welcomeSkyTop: '#EE9B62',
  welcomeSkyBottom: '#FBE6CB',

  /** Glow blobs over the field. Low alpha — six stacked rings accumulate the falloff. */
  welcomeGlowWarm: 'rgba(255,214,170,0.10)',
  welcomeGlowClay: 'rgba(230,124,74,0.10)',

  /**
   * Decorative 3-4px sparks. This is white, which the palette otherwise forbids over
   * orange — that rule is about TEXT legibility (white on orangeDeep is 1.83:1) and
   * these dots carry no information, so WCAG contrast does not apply to them.
   * Do not "fix" this by darkening it; the sparks are the only white in the app.
   */
  welcomeSpark: 'rgba(255,255,255,0.85)',
} as const

export type PaletteKey = keyof typeof palette

export const font = {
  /**
   * Bebas Neue ships ONE weight (400) and has no lowercase. There is deliberately a
   * single display key: two keys pointing at the same file would imply a weight axis
   * the face does not have. Hierarchy inside the display face comes from size alone.
   */
  display: 'BebasNeue_400Regular',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  metaMedium: 'IBMPlexMono_500Medium',
  metaSemi: 'IBMPlexMono_600SemiBold',
} as const

export type TypeRole =
  | 'screenTitle' | 'cardTitle' | 'stubDay' | 'tabLabel'
  | 'body' | 'bodySm' | 'bodyLg' | 'button'
  | 'meta' | 'eyebrow'

interface TypeStyle {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing?: number
  textTransform?: 'uppercase'
}

export const type: Record<TypeRole, TypeStyle> = {
  screenTitle: { fontFamily: font.display, fontSize: 34, lineHeight: 41, letterSpacing: 0.5 },
  cardTitle:   { fontFamily: font.display, fontSize: 19, lineHeight: 23, letterSpacing: 0.4 },
  stubDay:     { fontFamily: font.display, fontSize: 24, lineHeight: 29, letterSpacing: 0.5, textTransform: 'uppercase' },
  tabLabel:    { fontFamily: font.display, fontSize: 12, lineHeight: 15, letterSpacing: 0.8 },

  bodyLg: { fontFamily: font.bodyRegular, fontSize: 15, lineHeight: 22 },
  body:   { fontFamily: font.bodyRegular, fontSize: 13, lineHeight: 19 },
  bodySm: { fontFamily: font.bodyMedium,  fontSize: 11.5, lineHeight: 16 },
  /** Button and CTA labels — the one place the body face carries semibold weight. */
  button: { fontFamily: font.bodySemi,    fontSize: 16, lineHeight: 20 },

  meta:    { fontFamily: font.metaMedium, fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  eyebrow: { fontFamily: font.metaSemi,   fontSize: 10, lineHeight: 14, letterSpacing: 1.4, textTransform: 'uppercase' },
}

export const radius = {
  ticket: 14,
  chip: 20,
  sheet: 34,
  pill: 999,
} as const

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const

/**
 * The comp's bottom bar is flat and flush to the screen edge with a hairline top rule —
 * not the detached floating pill of the previous design system.
 */
export const tabBar = {
  backgroundColor: palette.orangeLight,
  borderTopColor: palette.rule,
  borderTopWidth: 1,
  height: 76,
  activeTintColor: palette.clay,
  inactiveTintColor: palette.inkSoft,
} as const

/** Bottom padding a scrollable tab screen needs to clear the tab bar. */
export const NAV_CLEARANCE = 92

/**
 * Welcome-screen reveal timeline, in milliseconds. Held here rather than inline so the
 * whole sequence is readable in one place and its ordering is assertable in tests.
 *
 * Text settles at taglineDelay + taglineIn = 970ms; the sheet lands at 1500ms, so the
 * field holds alone for ~530ms. That pause is the feature — shorten it and the screen
 * reads as a stutter rather than an arrival.
 */
export const motion = {
  markDelay: 150,
  markIn: 480,
  wordmarkDelay: 330,
  wordmarkIn: 460,
  taglineDelay: 510,
  taglineIn: 460,
  sheetDelay: 1500,
  sheetIn: 620,
  /** Ambient loops. One half-cycle each; blobs are offset per index. */
  driftCycle: 9000,
  sparkCycle: 5000,
} as const
