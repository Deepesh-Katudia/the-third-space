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

  /**
   * Liquid glass — the one surface treatment that lets the ambient field show THROUGH
   * it rather than covering it up. Built the way the rest of the app fakes depth, with
   * no `expo-blur`: a low-alpha wash of the light tone, a lit edge where the light would
   * catch, and a soft ink hairline where it falls away.
   *
   * A real gaussian would buy little here anyway — what sits behind a glass surface is
   * the ambient field, which is already a slow gradient with soft glows. There is
   * nothing sharp underneath to blur.
   *
   * Every alpha stays well under `creamVeil`'s 0.88 on purpose. Past roughly 0.5 the
   * wash stops reading as glass and starts reading as a washed-out solid, which is the
   * exact look these tokens exist to avoid.
   */
  glassFill: 'rgba(252,227,192,0.34)',
  glassSheen: 'rgba(255,248,238,0.32)',
  glassEdge: 'rgba(255,248,238,0.62)',
  glassEdgeSoft: 'rgba(43,32,21,0.12)',
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

/**
 * The cloud thought prompt. Source comp: docs/cloud-thought-prompt.html. Spec:
 * docs/superpowers/specs/2026-08-06-cloud-thought-prompt-design.md
 *
 * Buttery gold, and deliberately NOT in `palette` — same arrangement as `reward` above.
 * The cloud is the app speaking up rather than a surface the app is made of, so it gets
 * its own closed set of values that nothing else may reach for.
 *
 * Two of the comp's golds were darkened because they failed AA on the cloud's own body:
 * the eyebrow was #A87A0F (3.49:1) and the body text #8A6B17 (4.18:1), both at 9px,
 * which is the worst case in the design. Exactly what the palette already did to the
 * comp's #5C4F3F, #C4501F and #6E7A5E. The title and CTA keep their comp values.
 */
export const cloud = {
  /**
   * Washes the screen underneath toward the field's own tone. The comp fades its
   * backdrop to 0.4 opacity, which a Modal cannot do to the screen beneath it, so the
   * same result is reached from the other side with a translucent wash in orangeDeep.
   */
  scrim: 'rgba(243,178,122,0.62)',

  /** The body's 180deg gradient, top and bottom stop. */
  bodyTop: '#FFF3D2',
  bodyBottom: '#FFE9B0',
  /** Inset hairline and drop shadow that lift the body off the scrim. */
  bodyRim: 'rgba(255,255,255,0.5)',
  bodyShadow: 'rgba(138,58,23,0.22)',

  /**
   * Three puffs across the top. They are CLIPPED by the body's own rounded corners —
   * that is the comp's behaviour, not an oversight, and it is what turns them from
   * cartoon bumps into a faint bloom of texture inside the top edge.
   */
  puffLight: '#FFF3D2',
  puffMid: '#FFEEC0',

  /** Radial halo behind the whole cloud. Needs real SVG, like the reward glow. */
  glowCore: 'rgba(255,214,140,0.55)',
  glowEdge: 'rgba(255,214,140,0)',

  /**
   * Comet dot and the ring faking its glow — there is no box-shadow in React Native,
   * so falloff is a concentric ring, the same trick AmbientBackdrop uses.
   *
   * Very nearly white, which the palette forbids over orange for TEXT (1.83:1). These
   * carry no information, so contrast does not apply. Do not "fix" this by darkening it.
   */
  comet: '#FFF8E8',
  cometHalo: 'rgba(255,238,190,0.35)',
  /** The two ✦ above the cloud. Decorative, same exemption. */
  twinkle: '#FFF8E8',

  /** Shimmer band, swept across the body exactly once after it lands. */
  shimmerEdge: 'rgba(255,255,255,0)',
  shimmerCore: 'rgba(255,255,255,0.75)',

  /** Type inside the cloud. Eyebrow and body darkened from the comp for AA. */
  eyebrow: '#856010',
  title: '#5C4108',
  body: '#7A5A14',

  /** The CTA inverts: dark gold fill, pale gold label. */
  ctaFill: '#5C4108',
  ctaLabel: '#FFF3D2',

  /** Three shrinking dots below the cloud — the thought-bubble tail. */
  trail: '#FFE9B0',
} as const

/**
 * Cloud motion, in milliseconds, lifted from the comp's keyframes. Held in one block
 * so the ordering of the five beats is readable at a glance and assertable in tests.
 *
 * The beats: comets trace the path, the cloud lands with an overshoot, the puffs bloom
 * in one by one, a shimmer sweeps across once, and the text arrives last. Collapse any
 * of that ordering and it stops being a moment and becomes a slide-in.
 */
export const cloudMotion = {
  /** Six sparks along the path, each a single flash. */
  cometFlash: 700,
  cometStagger: 90,

  /** The landing, and the idle bob that takes over once it has settled. */
  enterIn: 1350,
  bobDelay: 1900,
  bobCycle: 5000,

  /**
   * The halo fades up during the landing, then breathes. `glowPulseDelay` is deliberately
   * NOT the same as `glowIn` — the comp's `glowSoft` loop starts at 1.7s, a beat after the
   * `glowIn` fade (0.3s delay + 1.35s duration = 1.65s) has already finished, so the two
   * never fight over the same frames.
   */
  glowInDelay: 300,
  glowIn: 1350,
  glowPulseDelay: 1700,
  glowCycle: 4000,

  /** Puffs, blooming individually so the cloud reads as still forming. */
  puffBloom: 600,
  puffFirstDelay: 620,
  puffStagger: 100,

  /** One sweep, once, after it has settled. */
  shimmerDelay: 1150,
  shimmerSweep: 1100,

  /** Text cascade, last. */
  textIn: 550,
  eyebrowDelay: 950,
  titleDelay: 1050,
  bodyDelay: 1150,
  ctaDelay: 1250,
  trailDelay: 1400,

  /**
   * The two ✦, long after everything else. `twinkleStagger` is the comp's own offset
   * between the pair (2.6s - 2.2s), not half of `twinkleCycle` — the two are unrelated
   * numbers that happened to be conflated in an earlier draft.
   */
  twinkleDelay: 2200,
  twinkleStagger: 400,
  twinkleCycle: 3000,

  /** Reduced motion: one fade for the whole thing, and no loops at all. */
  reducedIn: 200,
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
