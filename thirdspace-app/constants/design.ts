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
} as const

export type PaletteKey = keyof typeof palette
