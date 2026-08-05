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
   * Ambient field — the app-wide background. Source comp:
   * docs/ambient-background-splash-and-home.html.
   *
   * The field itself is the ONE gradient in the system, and it runs between the two
   * tones already in the palette (orangeDeep -> orangeLight) rather than introducing a
   * third and fourth colour. Everything laid over it — tickets, sheets, the tab bar —
   * is still flat tone, so "depth comes from tone, not blending" still holds for every
   * surface above the background.
   *
   * Glow alphas are deliberately low: there is no radial-gradient primitive in React
   * Native, so a soft falloff is faked by stacking concentric rings of one colour. The
   * centre accumulates toward ~0.4 while the outer edge stays at the value written here.
   * Raise one of these above ~0.15 and the blob turns into a visible hard-edged disc.
   */
  ambientGlowGold: 'rgba(255,217,160,0.10)',
  ambientGlowPeach: 'rgba(255,178,122,0.10)',
  ambientGlowCream: 'rgba(255,241,220,0.11)',
  ambientGlowEmber: 'rgba(236,138,78,0.085)',
  ambientGlowSand: 'rgba(255,227,188,0.10)',

  /**
   * Decorative 3-5px sparks over the field. This is very nearly white, which the palette
   * otherwise forbids over orange — that rule is about TEXT legibility (white on
   * orangeDeep is 1.83:1) and these dots carry no information, so WCAG contrast does not
   * apply to them. Do not "fix" this by darkening it.
   */
  ambientSpark: 'rgba(255,243,222,0.85)',

  /**
   * Laid over the ambient field by `Screen tone="cream"` instead of an opaque fill, so
   * forms and chat threads keep their calm cream identity while the field still drifts
   * faintly underneath. Not fully opaque on purpose — at 1.0 the ambient would be dead
   * on half the app.
   */
  creamVeil: 'rgba(251,243,233,0.88)',
} as const

export type PaletteKey = keyof typeof palette

/**
 * The reward-unlock frame. Source comp: docs/reward_screen.html.
 *
 * This is the ONE dark surface in the app and the one place the warm palette above does
 * not apply. That is deliberate: the unlock is a moment out of time — the app dims to
 * near-black, a purple void opens, and the mascot arrives lit from above. Reaching for
 * `orangeDeep` here would make the biggest moment in the product look like a form.
 *
 * The frame never changes. Only the mascot, title, prompt and points do, so every unlock
 * feels like the same ceremony even though the characters are wildly different colours.
 * Do not add per-reward theming here.
 */
export const reward = {
  /** Dims whatever screen the unlock fired over. */
  veil: 'rgba(10,6,4,0.72)',

  /** Void gradient, top to bottom. Five stops — a two-stop version reads as flat plastic. */
  voidStops: ['#5C2FA8', '#3A1C80', '#221056', '#140B38', '#08051A'] as const,
  voidOffsets: [0, 0.24, 0.46, 0.66, 1] as const,

  /** Colour washes drifting across the void, so the purple is not uniform. */
  washPink: 'rgba(255,110,190,0.28)',
  washBlue: 'rgba(110,210,255,0.20)',
  washPurple: 'rgba(180,110,255,0.22)',

  /** The light source above the mascot. */
  glowCore: 'rgba(255,236,190,0.7)',
  glowMid: 'rgba(255,210,140,0.3)',
  glowOuter: 'rgba(160,110,255,0.18)',
  glowEdge: 'rgba(160,110,255,0)',

  /** Twelve rays fanning from the glow. Fades to nothing at the tip. */
  rayTop: 'rgba(255,232,180,0.85)',
  rayTip: 'rgba(255,232,180,0)',

  /** Two counter-rotating halos: one solid, one dashed. */
  ringSolid: 'rgba(255,220,160,0.55)',
  ringDashed: 'rgba(210,180,255,0.5)',

  /** Pinprick stars in the corners, and the motes rising up the frame. */
  star: '#E8D9FF',
  mote: '#FFEFD0',

  /** Type and chrome inside the frame. */
  eyebrow: '#FFD98A',
  flourish: '#FFD98A',
  title: '#FFF3E0',
  prompt: '#E8C9A0',
  pointsTop: '#FFE9B8',
  pointsBottom: '#F0B45C',
  pointsInk: '#1A0906',
  ctaBorder: 'rgba(255,214,140,0.5)',
  ctaFill: 'rgba(255,214,140,0.08)',
  ctaLabel: '#FFE9C2',

  /** Stage behind a mascot in the roster grid — the comp's `.char-stage`. */
  stage: '#161213',
} as const

/** Reward-frame motion, in milliseconds. Slow: this is a pause, not a notification. */
export const rewardMotion = {
  /** Glow breathing in and out. */
  glowCycle: 3200,
  /** The whole ray burst scaling. */
  burstCycle: 4600,
  /** One revolution of the solid halo; the dashed one runs the other way, slower. */
  ringSpin: 16000,
  ringSpinSlow: 24000,
  /** A mote's full travel up the frame. */
  moteRise: 4000,
  moteStagger: 400,
  /** Entrance: the card scaling up as the veil fades in. */
  enterIn: 420,
} as const

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

/**
 * Every role is uppercase. That is app-wide and deliberate — see
 * docs/superpowers/specs/2026-08-02-uppercase-typography-design.md. The display
 * roles would render caps anyway (Bebas Neue ships no lowercase) but carry the
 * token so the intent is stated rather than inherited from the font.
 *
 * The transform is display-only: React Native does not alter the string in state,
 * in Firestore, or in the accessibility tree. Screen readers still receive the
 * casing the user typed.
 */
export const type: Record<TypeRole, TypeStyle> = {
  screenTitle: { fontFamily: font.display, fontSize: 34, lineHeight: 41, letterSpacing: 0.5, textTransform: 'uppercase' },
  cardTitle:   { fontFamily: font.display, fontSize: 19, lineHeight: 23, letterSpacing: 0.4, textTransform: 'uppercase' },
  stubDay:     { fontFamily: font.display, fontSize: 24, lineHeight: 29, letterSpacing: 0.5, textTransform: 'uppercase' },
  tabLabel:    { fontFamily: font.display, fontSize: 12, lineHeight: 15, letterSpacing: 0.8, textTransform: 'uppercase' },

  // Uppercase Inter sets tighter than mixed case at these sizes, so the body
  // roles gain tracking they did not need before.
  bodyLg: { fontFamily: font.bodyRegular, fontSize: 15, lineHeight: 22, letterSpacing: 0.3, textTransform: 'uppercase' },
  body:   { fontFamily: font.bodyRegular, fontSize: 13, lineHeight: 19, letterSpacing: 0.3, textTransform: 'uppercase' },
  bodySm: { fontFamily: font.bodyMedium,  fontSize: 11.5, lineHeight: 16, letterSpacing: 0.4, textTransform: 'uppercase' },
  /** Button and CTA labels — the one place the body face carries semibold weight. */
  button: { fontFamily: font.bodySemi,    fontSize: 16, lineHeight: 20, letterSpacing: 0.4, textTransform: 'uppercase' },

  meta:    { fontFamily: font.metaMedium, fontSize: 10, lineHeight: 14, letterSpacing: 0.4, textTransform: 'uppercase' },
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
 * Fill for the navigators' own containers — the sliver visible mid-transition, before
 * the incoming screen has painted its ambient field. React Navigation defaults it to
 * white, which flashes hard against the field; its top stop is the quietest stand-in.
 *
 * Deliberately NOT transparent: modal routes would then show the screen underneath
 * through the gap instead of just the background.
 */
export const navigatorBackground = { backgroundColor: palette.orangeDeep } as const

/**
 * Motion timings, in milliseconds. Held here rather than inline so each sequence is
 * readable in one place and its ordering is assertable in tests.
 *
 * The first group is the one-shot welcome reveal. Text settles at
 * taglineDelay + taglineIn = 970ms; the sheet lands at 1500ms, so the field holds alone
 * for ~530ms. That pause is the feature — shorten it and the screen reads as a stutter
 * rather than an arrival.
 *
 * The drift/spark pair at the bottom is app-wide: it drives the ambient field on every
 * screen, not just this one.
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
  driftStagger: 900,
  sparkCycle: 5000,
  sparkStagger: 400,
} as const
