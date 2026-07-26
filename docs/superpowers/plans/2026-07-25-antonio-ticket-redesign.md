# Antonio Ticket Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the whole Third Space app onto the two-tone orange ticket system from `docs/events-redesign-mockup.html`, with Antonio/Inter/IBM Plex Mono replacing Poppins, and with colors living in exactly one file.

**Architecture:** A new `constants/design.ts` holds the token system and a new `components/ui/` holds six presentational primitives. Screens are converted wave by wave to consume them. The legacy `constants/theme.ts` stays in place, untouched and still imported by unconverted screens, until a final cleanup task deletes it — so every intermediate commit compiles and renders correctly. A `tokens.test.ts` guard with a shrinking allowlist enforces that a converted file never contains a literal color again.

**Tech Stack:** Expo SDK 54 / React Native 0.81 (New Architecture), TypeScript 5.7, expo-router v6, Jest via jest-expo, `@testing-library/react-native`, `@expo-google-fonts/{antonio,inter,ibm-plex-mono}`.

## Global Constraints

- **Palette — these exact values, nothing else** (from spec §Palette):
  `cream #FBF3E9`, `orangeDeep #F3B27A`, `orangeLight #FCE3C0`, `ink #2B2015`, `inkSoft #584C3C`, `clay #853615`, `sage #49513E`, `rule rgba(43,32,21,0.20)`.
- **`inkSoft`, `clay`, `sage` are the corrected values, not the comp's.** The comp's `#5C4F3F`/`#C4501F`/`#6E7A5E` fail WCAG AA on the orange field. Do not "fix" them back to the comp values.
- **White never appears on orange.** `#FFFFFF` on `orangeDeep` is 1.83:1. Ink-on-orange only.
- **Three faces, three roles:** Antonio 600/700 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
- **Uppercase is a token,** never an inline `textTransform` in a screen. Caps for eyebrows, chips, date stubs only; event names and screen titles are sentence case at Antonio 700.
- **Ticket tear-notches on event surfaces only:** `EventCard`, `CompactEventRow`, `my-events` rows, `event/[id]` header. Nowhere else.
- **Backgrounds:** deep orange on browse/list screens; cream on forms, chat threads, and all `(auth)` routes.
- **No literal hex in any file under `app/` or `components/`.** `constants/design.ts` is the only place a color may be written.
- **Every task ends green:** `npx tsc --noEmit` and `npx jest` both pass before committing.
- **Commit style:** conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`). No `Co-Authored-By` trailer — attribution is disabled globally for this repo.
- **Run all commands from `thirdspace-app/`.**
- **Version note:** `thirdspace-app/AGENTS.md` says to read `https://docs.expo.dev/versions/v56.0.0/`, but `package.json` pins `expo ~54.0.0`. The installed SDK is 54. Consult the **v54** docs and raise the discrepancy rather than upgrading.

## Two deliberate deviations from the spec

Both were found while planning; the spec's wording would break intermediate states.

1. **Spec says "rewrite `constants/theme.ts`". This plan adds `constants/design.ts` instead** and deletes `theme.ts` in the final task. Rewriting `theme.ts` in wave 1 would remove `colors.primary`, `font`, `paletteFor`, `shadow`, and `floatingNav` out from under ~50 files that still import them, so `tsc` would fail for five waves straight.
2. **Spec says wave 1 swaps the font packages. This plan adds the three new families alongside Poppins** and removes Poppins only in the final cleanup. Unloading Poppins while 35 screens still name `Poppins_800ExtraBold` would silently drop them to the system font — the app would look broken for the whole conversion.

## File Structure

**New files**

| File | Responsibility |
|------|----------------|
| `constants/design.ts` | The entire token system: palette, type scale, radius, space, tabBar |
| `components/ui/Text.tsx` | `Display`, `Body`, `Meta` — text bound to one face each |
| `components/ui/Screen.tsx` | Background tone, safe area, nav clearance |
| `components/ui/TicketCard.tsx` | Ticket geometry: photo, tear line, notches, date stub |
| `components/ui/Chip.tsx` | Meta chip + `/` divider row |
| `components/ui/CityChip.tsx` | Outlined location pill |
| `components/ui/IconButton.tsx` | Circular ink button with orange-light glyph |
| `__tests__/constants/design.test.ts` | Contrast + palette invariants |
| `__tests__/constants/tokens.test.ts` | No-literal-hex guard with shrinking allowlist |
| `__tests__/components/ui/*.test.tsx` | One per primitive |

**Deleted at the end:** `constants/theme.ts`, `components/PillTabButton.tsx`, `__tests__/components/contrast.test.ts` (replaced by `design.test.ts`).

---

## WAVE 1 — Token layer and primitives

### Task 1: Palette and contrast invariants

**Files:**
- Create: `thirdspace-app/constants/design.ts`
- Create: `thirdspace-app/__tests__/constants/design.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `palette` — a frozen object with keys `cream`, `orangeDeep`, `orangeLight`, `ink`, `inkSoft`, `clay`, `sage`, `rule`, all `string`.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/constants/design.test.ts`:

```ts
import { palette } from '../../constants/design'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: FAIL — `Cannot find module '../../constants/design'`.

- [ ] **Step 3: Write minimal implementation**

Create `thirdspace-app/constants/design.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add constants/design.ts __tests__/constants/design.test.ts
git commit -m "feat: add two-tone orange palette with AA-corrected accents"
```

---

### Task 2: Type scale and font loading

**Files:**
- Modify: `thirdspace-app/constants/design.ts` (append)
- Modify: `thirdspace-app/app/_layout.tsx:1-10` (imports), `:39-45` (useFonts)
- Modify: `thirdspace-app/package.json` (dependencies)
- Modify: `thirdspace-app/__tests__/constants/design.test.ts` (append)

**Interfaces:**
- Consumes: `palette` from Task 1.
- Produces: `type` — `Record<TypeRole, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number; textTransform?: 'uppercase' }>` where `TypeRole` is
  `'screenTitle' | 'cardTitle' | 'stubDay' | 'tabLabel' | 'body' | 'bodySm' | 'bodyLg' | 'meta' | 'eyebrow'`.
  Also `radius`, `space`, `tabBar`.

- [ ] **Step 1: Install the three font families**

Poppins stays installed until the final cleanup task — removing it now would drop 35 unconverted screens to the system font.

Run:
```bash
npx expo install @expo-google-fonts/antonio @expo-google-fonts/inter @expo-google-fonts/ibm-plex-mono
```

- [ ] **Step 2: Write the failing test**

In `thirdspace-app/__tests__/constants/design.test.ts`, widen the existing import to
`import { palette, type as typeScale, radius, space, tabBar } from '../../constants/design'`
(one import statement, not a second one), then append:

```ts
describe('type scale', () => {
  it('binds each role to exactly one of the three faces', () => {
    const display = ['screenTitle', 'cardTitle', 'stubDay', 'tabLabel'] as const
    const body = ['body', 'bodySm', 'bodyLg'] as const
    const meta = ['meta', 'eyebrow'] as const

    for (const role of display) expect(typeScale[role].fontFamily).toMatch(/^Antonio_/)
    for (const role of body) expect(typeScale[role].fontFamily).toMatch(/^Inter_/)
    for (const role of meta) expect(typeScale[role].fontFamily).toMatch(/^IBMPlexMono_/)
  })

  it('reserves uppercase for eyebrows, chips and the date stub', () => {
    expect(typeScale.eyebrow.textTransform).toBe('uppercase')
    expect(typeScale.stubDay.textTransform).toBe('uppercase')
    // Sentence case for names and titles — Antonio has real weights, so hierarchy
    // does not need shouting.
    expect(typeScale.screenTitle.textTransform).toBeUndefined()
    expect(typeScale.cardTitle.textTransform).toBeUndefined()
  })

  it('gives every role a line height at least its font size', () => {
    for (const role of Object.values(typeScale)) {
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize)
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: FAIL — `type` / `radius` / `space` / `tabBar` are not exported.

- [ ] **Step 4: Append tokens to `constants/design.ts`**

```ts
export const font = {
  displaySemi: 'Antonio_600SemiBold',
  displayBold: 'Antonio_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
  metaMedium: 'IBMPlexMono_500Medium',
  metaSemi: 'IBMPlexMono_600SemiBold',
} as const

export type TypeRole =
  | 'screenTitle' | 'cardTitle' | 'stubDay' | 'tabLabel'
  | 'body' | 'bodySm' | 'bodyLg'
  | 'meta' | 'eyebrow'

interface TypeStyle {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing?: number
  textTransform?: 'uppercase'
}

export const type: Record<TypeRole, TypeStyle> = {
  screenTitle: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -0.2 },
  cardTitle:   { fontFamily: font.displayBold, fontSize: 17, lineHeight: 21 },
  stubDay:     { fontFamily: font.displaySemi, fontSize: 22, lineHeight: 24, textTransform: 'uppercase' },
  tabLabel:    { fontFamily: font.displaySemi, fontSize: 11, lineHeight: 13, letterSpacing: 0.3 },

  bodyLg: { fontFamily: font.bodyRegular, fontSize: 15, lineHeight: 22 },
  body:   { fontFamily: font.bodyRegular, fontSize: 13, lineHeight: 19 },
  bodySm: { fontFamily: font.bodyMedium,  fontSize: 11.5, lineHeight: 16 },

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
```

- [ ] **Step 5: Load the three families in `app/_layout.tsx`**

Replace the Poppins-only import block (lines 4-7) with both, and extend `useFonts`:

```tsx
import {
  useFonts,
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins'
import { Antonio_600SemiBold, Antonio_700Bold } from '@expo-google-fonts/antonio'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono'
```

```tsx
  const [fontsLoaded] = useFonts({
    // Poppins is still loaded because unconverted screens name it directly.
    // The final cleanup task removes these five once every screen is converted.
    Poppins_800ExtraBold, Poppins_700Bold, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold,
    Antonio_600SemiBold, Antonio_700Bold,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  })
```

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean; all suites pass including the 7 new assertions.

- [ ] **Step 7: Commit**

```bash
git add constants/design.ts app/_layout.tsx package.json package-lock.json __tests__/constants/design.test.ts
git commit -m "feat: add Antonio/Inter/IBM Plex Mono type scale and layout tokens"
```

---

### Task 3: Text primitives

**Files:**
- Create: `thirdspace-app/components/ui/Text.tsx`
- Create: `thirdspace-app/__tests__/components/ui/Text.test.tsx`

**Interfaces:**
- Consumes: `type`, `palette` from Tasks 1-2.
- Produces: `Display`, `Body`, `Meta` — each `(props: { role?: TypeRole; tone?: 'ink' | 'inkSoft' | 'clay' | 'sage'; style?: StyleProp<TextStyle>; numberOfLines?: number; children: React.ReactNode }) => JSX.Element`. Defaults: `Display` → `cardTitle`, `Body` → `body`, `Meta` → `meta`; `tone` defaults to `ink` for Display, `inkSoft` for Body and Meta.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/ui/Text.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { palette, type as typeScale } from '../../../constants/design'

const flat = (style: unknown) => StyleSheetFlatten(style)
function StyleSheetFlatten(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(StyleSheetFlatten))
    : ((style ?? {}) as Record<string, unknown>)
}

describe('text primitives', () => {
  it('renders Display in Antonio at the card-title role by default', () => {
    const { getByText } = render(<Display>Ceramics Night</Display>)
    const style = flat(getByText('Ceramics Night').props.style)
    expect(style.fontFamily).toBe(typeScale.cardTitle.fontFamily)
    expect(style.color).toBe(palette.ink)
  })

  it('renders Body in Inter and Meta in IBM Plex Mono', () => {
    const { getByText: getBody } = render(<Body>Do exercise</Body>)
    const { getByText: getMeta } = render(<Meta>Sat, 7:00 PM</Meta>)
    expect(flat(getBody('Do exercise').props.style).fontFamily).toMatch(/^Inter_/)
    expect(flat(getMeta('Sat, 7:00 PM').props.style).fontFamily).toMatch(/^IBMPlexMono_/)
  })

  it('applies the requested role and tone', () => {
    const { getByText } = render(<Display role="screenTitle" tone="clay">Your events</Display>)
    const style = flat(getByText('Your events').props.style)
    expect(style.fontSize).toBe(typeScale.screenTitle.fontSize)
    expect(style.color).toBe(palette.clay)
  })

  it('uppercases the eyebrow role via the token, not the caller', () => {
    const { getByText } = render(<Meta role="eyebrow">Send announcement</Meta>)
    expect(flat(getByText('Send announcement').props.style).textTransform).toBe('uppercase')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/Text.test.tsx`
Expected: FAIL — `Cannot find module '../../../components/ui/Text'`.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/components/ui/Text.tsx`:

```tsx
import React from 'react'
import { Text, StyleProp, TextStyle } from 'react-native'
import { palette, type as typeScale, TypeRole } from '../../constants/design'

type Tone = 'ink' | 'inkSoft' | 'clay' | 'sage'

interface TextProps {
  role?: TypeRole
  tone?: Tone
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  children: React.ReactNode
}

function make(defaultRole: TypeRole, defaultTone: Tone) {
  return function Typed({ role = defaultRole, tone = defaultTone, style, numberOfLines, children }: TextProps) {
    return (
      <Text numberOfLines={numberOfLines} style={[typeScale[role], { color: palette[tone] }, style]}>
        {children}
      </Text>
    )
  }
}

/** Antonio. Screen titles, event names, date stubs, tab labels. */
export const Display = make('cardTitle', 'ink')
/** Inter. Descriptions, locations, form and chat copy. */
export const Body = make('body', 'inkSoft')
/** IBM Plex Mono. Timestamps, chips, eyebrows. */
export const Meta = make('meta', 'inkSoft')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ui/Text.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Text.tsx __tests__/components/ui/Text.test.tsx
git commit -m "feat: add Display/Body/Meta text primitives bound to the three faces"
```

---

### Task 4: Screen primitive

**Files:**
- Create: `thirdspace-app/components/ui/Screen.tsx`
- Create: `thirdspace-app/__tests__/components/ui/Screen.test.tsx`

**Interfaces:**
- Consumes: `palette`, `NAV_CLEARANCE`.
- Produces: `Screen` — `(props: { tone?: 'deep' | 'cream'; padBottom?: boolean; children: React.ReactNode }) => JSX.Element`. `tone` defaults to `'deep'`; `padBottom` defaults to `false` and adds `NAV_CLEARANCE` of bottom padding for tab screens.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/ui/Screen.test.tsx`:

```tsx
import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { Screen } from '../../../components/ui/Screen'
import { palette, NAV_CLEARANCE } from '../../../constants/design'

describe('Screen', () => {
  it('defaults to the deep orange browse background', () => {
    const { getByTestId } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style).toMatchObject({ backgroundColor: palette.orangeDeep })
  })

  it('uses cream when asked, for forms and chat threads', () => {
    const { getByTestId } = render(<Screen tone="cream"><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style).toMatchObject({ backgroundColor: palette.cream })
  })

  it('pads for the tab bar only when padBottom is set', () => {
    const { getByTestId, rerender } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(0)
    rerender(<Screen padBottom><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(NAV_CLEARANCE)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/Screen.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/components/ui/Screen.tsx`:

```tsx
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { palette, NAV_CLEARANCE } from '../../constants/design'

interface ScreenProps {
  /** 'deep' for browse/list screens, 'cream' for forms and chat threads. */
  tone?: 'deep' | 'cream'
  /** Set on tab screens so scrolling content clears the flat bottom bar. */
  padBottom?: boolean
  children: React.ReactNode
}

export function Screen({ tone = 'deep', padBottom = false, children }: ScreenProps) {
  return (
    <SafeAreaView
      testID="screen-root"
      style={{
        flex: 1,
        backgroundColor: tone === 'deep' ? palette.orangeDeep : palette.cream,
        paddingBottom: padBottom ? NAV_CLEARANCE : 0,
      }}
    >
      {children}
    </SafeAreaView>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ui/Screen.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Screen.tsx __tests__/components/ui/Screen.test.tsx
git commit -m "feat: add Screen primitive with deep/cream tones"
```

---

### Task 5: TicketCard primitive

The piece that makes the design read as a ticket. The notch circles are painted in the **screen's** background tone — a ticket on the wrong background shows wrong-colored dots, so `tone` is a required prop, not a default.

**No-photo case is the normal case.** `CommunityEvent` has no image field (verified against `types/models.ts`) and adding one is a data-layer change the spec puts out of scope. The comp shows a photo above the tear; without one the card would lose the two-part silhouette that makes it read as a ticket. So `TicketCard` draws a **44px header band in `orangeDeep`** when `photoUri` is null, and the tear + notches align to whichever header is present. `photoUri` stays in the API for when events gain photos.

**Files:**
- Create: `thirdspace-app/components/ui/TicketCard.tsx`
- Create: `thirdspace-app/__tests__/components/ui/TicketCard.test.tsx`

**Interfaces:**
- Consumes: `palette`, `radius`, `space`, `Display`, `Meta`.
- Produces: `TicketCard` — `(props: { tone: 'deep' | 'cream'; photoUri?: string | null; day: string; month: string; onPress: () => void; children: React.ReactNode }) => JSX.Element`.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/ui/TicketCard.test.tsx`:

```tsx
import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { TicketCard } from '../../../components/ui/TicketCard'
import { palette } from '../../../constants/design'

describe('TicketCard', () => {
  it('paints the notches in the screen tone so they read as cut-outs', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    const notches = getAllByTestId('ticket-notch')
    expect(notches).toHaveLength(2)
    for (const n of notches) {
      expect(n.props.style).toMatchObject({ backgroundColor: palette.orangeDeep })
    }
  })

  it('switches notch color with the tone', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="cream" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ backgroundColor: palette.cream })
    }
  })

  it('renders the date stub and the body slot', () => {
    const { getByText } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>Ceramics Night</Text></TicketCard>
    )
    expect(getByText('18')).toBeTruthy()
    expect(getByText('Jul')).toBeTruthy()
    expect(getByText('Ceramics Night')).toBeTruthy()
  })

  it('falls back to a color band when there is no photo, keeping the two-part silhouette', () => {
    // Events carry no image field today, so this is the normal path, not the edge case.
    const { getByTestId, getAllByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    expect(getByTestId('ticket-band')).toBeTruthy()
    // Notches must sit on the band's bottom edge (44 - 7), not the photo's (96 - 7).
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ top: 37 })
    }
  })

  it('aligns notches to the photo edge when a photo is supplied', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ top: 89 })
    }
  })

  it('fires onPress when the card is pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={onPress}><Text>x</Text></TicketCard>
    )
    fireEvent.press(getByTestId('ticket-card'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/TicketCard.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/components/ui/TicketCard.tsx`:

```tsx
import React from 'react'
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Display, Meta } from './Text'

const PHOTO_HEIGHT = 96
/** Events carry no image today, so the ticket keeps its silhouette with a color band. */
const BAND_HEIGHT = 44
const NOTCH = 14

interface TicketCardProps {
  /** MUST match the background of the screen this sits on — the notches are painted in it. */
  tone: 'deep' | 'cream'
  photoUri?: string | null
  day: string
  month: string
  onPress: () => void
  children: React.ReactNode
}

export function TicketCard({ tone, photoUri, day, month, onPress, children }: TicketCardProps) {
  const notchColor = tone === 'deep' ? palette.orangeDeep : palette.cream
  const headerHeight = photoUri ? PHOTO_HEIGHT : BAND_HEIGHT

  return (
    <TouchableOpacity testID="ticket-card" onPress={onPress} activeOpacity={0.9} style={styles.card}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.header, { height: PHOTO_HEIGHT }]} />
      ) : (
        <View testID="ticket-band" style={[styles.header, styles.band, { height: BAND_HEIGHT }]} />
      )}

      <View style={styles.tear} />
      <View testID="ticket-notch" style={[styles.notch, styles.notchLeft, { top: headerHeight - NOTCH / 2, backgroundColor: notchColor }]} />
      <View testID="ticket-notch" style={[styles.notch, styles.notchRight, { top: headerHeight - NOTCH / 2, backgroundColor: notchColor }]} />

      <View style={styles.infoWrap}>
        <View style={styles.stub}>
          <Display role="stubDay" tone="clay">{day}</Display>
          <Meta style={styles.month}>{month}</Meta>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: palette.rule,
    marginBottom: space.md,
    overflow: 'visible',
  },
  header: {
    width: '100%',
    borderTopLeftRadius: radius.ticket,
    borderTopRightRadius: radius.ticket,
  },
  band: { backgroundColor: palette.orangeDeep },
  tear: { borderTopWidth: 1, borderTopColor: palette.rule, borderStyle: 'dashed', marginHorizontal: space.lg },
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2 },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  infoWrap: { flexDirection: 'row', gap: space.md, padding: space.md },
  stub: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: palette.rule,
    borderStyle: 'dashed',
    paddingRight: space.md,
  },
  month: { marginTop: 3 },
  body: { flex: 1, minWidth: 0 },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ui/TicketCard.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/ui/TicketCard.tsx __tests__/components/ui/TicketCard.test.tsx
git commit -m "feat: add TicketCard primitive with tone-matched notches"
```

---

### Task 6: Chip, CityChip, IconButton

**Files:**
- Create: `thirdspace-app/components/ui/Chip.tsx`, `CityChip.tsx`, `IconButton.tsx`
- Create: `thirdspace-app/__tests__/components/ui/Chip.test.tsx`

**Interfaces:**
- Consumes: `palette`, `radius`, `space`, `Meta`.
- Produces:
  - `ChipRow` — `(props: { items: string[]; accentIndex?: number }) => JSX.Element`, joins items with `/` dividers, colors `items[accentIndex]` in sage.
  - `CityChip` — `(props: { label: string }) => JSX.Element`.
  - `IconButton` — `(props: { name: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void; accessibilityLabel: string; size?: number }) => JSX.Element`, ink fill with an orange-light glyph.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/ui/Chip.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { ChipRow } from '../../../components/ui/Chip'
import { CityChip } from '../../../components/ui/CityChip'
import { IconButton } from '../../../components/ui/IconButton'
import { palette } from '../../../constants/design'

describe('chips and buttons', () => {
  it('joins meta items with slash dividers', () => {
    const { getAllByText, getByText } = render(<ChipRow items={['Sat, 7:00 PM', 'Wellness', 'Free']} />)
    expect(getByText('Sat, 7:00 PM')).toBeTruthy()
    expect(getAllByText('/')).toHaveLength(2)
  })

  it('accents the requested item in sage', () => {
    const { getByText } = render(<ChipRow items={['Sat, 7:00 PM', 'Wellness']} accentIndex={1} />)
    const style = getByText('Wellness').props.style
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flat.color).toBe(palette.sage)
  })

  it('renders the city chip label', () => {
    const { getByText } = render(<CityChip label="NYC + Brooklyn" />)
    expect(getByText('NYC + Brooklyn')).toBeTruthy()
  })

  it('gives the icon button an accessible label and an ink fill', () => {
    const { getByLabelText } = render(
      <IconButton name="add" onPress={() => {}} accessibilityLabel="Create event" />
    )
    const style = getByLabelText('Create event').props.style
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flat.backgroundColor).toBe(palette.ink)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/Chip.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the three components**

`thirdspace-app/components/ui/Chip.tsx`:

```tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, space } from '../../constants/design'
import { Meta } from './Text'

interface ChipRowProps {
  items: string[]
  /** Index of the one item drawn in sage — the comp accents a single meta value. */
  accentIndex?: number
}

export function ChipRow({ items, accentIndex }: ChipRowProps) {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <React.Fragment key={item}>
          <Meta tone={i === accentIndex ? 'sage' : 'ink'}>{item}</Meta>
          {i < items.length - 1 ? <Meta style={styles.divider}>/</Meta> : null}
        </React.Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 3, flexWrap: 'wrap' },
  divider: { color: palette.rule },
})
```

`thirdspace-app/components/ui/CityChip.tsx`:

```tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Meta } from './Text'

export function CityChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Meta role="eyebrow" tone="ink">{label}</Meta>
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.sm + 1,
    paddingVertical: space.xs + 1,
  },
})
```

`thirdspace-app/components/ui/IconButton.tsx`:

```tsx
import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { palette } from '../../constants/design'

interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name']
  onPress: () => void
  accessibilityLabel: string
  size?: number
}

/** Ink circle with an orange-light glyph — the comp's "+" button. Never white on orange. */
export function IconButton({ name, onPress, accessibilityLabel, size = 30 }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Ionicons name={name} size={size * 0.55} color={palette.orangeLight} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: { backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/ui/Chip.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/ui/Chip.tsx components/ui/CityChip.tsx components/ui/IconButton.tsx __tests__/components/ui/Chip.test.tsx
git commit -m "feat: add ChipRow, CityChip and IconButton primitives"
```

---

### Task 7: The no-literal-hex guard

The guard that stops this restyle from decaying like the last one. It ships with an allowlist naming every file not yet converted; each later task deletes its own entries. When the allowlist is empty, the rule is absolute.

**Files:**
- Create: `thirdspace-app/__tests__/constants/tokens.test.ts`

**Interfaces:**
- Consumes: nothing at runtime — reads the source tree from disk.
- Produces: nothing importable.

- [ ] **Step 1: Write the test (it passes immediately — the allowlist starts full)**

Create `thirdspace-app/__tests__/constants/tokens.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Files still carrying literal colors from the Poppins design system. Each conversion
 * task deletes its own entries. When this list is empty the rule is absolute, and any
 * new literal hex in app/ or components/ fails the build.
 *
 * DO NOT add entries. The list only ever shrinks.
 */
const NOT_YET_CONVERTED = [
  'app/(app)/(attender)/_layout.tsx',
  'app/(app)/(attender)/chats.tsx',
  'app/(app)/(attender)/index.tsx',
  'app/(app)/(attender)/my-events.tsx',
  'app/(app)/(attender)/profile.tsx',
  'app/(app)/(hoster)/_layout.tsx',
  'app/(app)/(hoster)/announcement/[id].tsx',
  'app/(app)/(hoster)/events.tsx',
  'app/(app)/(hoster)/index.tsx',
  'app/(app)/(hoster)/venue.tsx',
  'app/(app)/_layout.tsx',
  'app/(app)/badges.tsx',
  'app/(app)/become-host.tsx',
  'app/(app)/change-password.tsx',
  'app/(app)/chat/[id].tsx',
  'app/(app)/connections.tsx',
  'app/(app)/create-event.tsx',
  'app/(app)/edit-profile.tsx',
  'app/(app)/event/[id].tsx',
  'app/(app)/filters.tsx',
  'app/(app)/guest-list/[id].tsx',
  'app/(app)/member/[uid].tsx',
  'app/(app)/message-privacy.tsx',
  'app/(app)/message-requests.tsx',
  'app/(app)/settings.tsx',
  'app/(app)/venue-setup.tsx',
  'app/(app)/verify-identity.tsx',
  'app/(auth)/_layout.tsx',
  'app/(auth)/create-profile.tsx',
  'app/(auth)/forgot-password.tsx',
  'app/(auth)/onboarding.tsx',
  'app/(auth)/role-select.tsx',
  'app/(auth)/sign-in.tsx',
  'app/(auth)/sign-up.tsx',
  'app/_layout.tsx',
  'components/AnnouncementBanner.tsx',
  'components/AttendeeAvatarStack.tsx',
  'components/AuthButton.tsx',
  'components/BadgeGrid.tsx',
  'components/Banner.tsx',
  'components/CategoryTabs.tsx',
  'components/ChatBubble.tsx',
  'components/ChatRow.tsx',
  'components/CompactEventRow.tsx',
  'components/EmptyState.tsx',
  'components/EventCard.tsx',
  'components/FilterSheet.tsx',
  'components/FormInput.tsx',
  'components/InterestChip.tsx',
  'components/LoadingView.tsx',
  'components/MemberProfileCard.tsx',
  'components/OnboardingSlide.tsx',
  'components/PasswordStrengthMeter.tsx',
  'components/PillTabButton.tsx',
  'components/RegistrationConfirmation.tsx',
  'components/Toast.tsx',
  'components/VenueForm.tsx',
]

const HEX = /#[0-9a-fA-F]{3,8}\b/
const ROOTS = ['app', 'components']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full.split('\\').join('/'))
  }
  return out
}

describe('token discipline', () => {
  it('keeps literal colors out of every converted file', () => {
    const offenders = ROOTS.flatMap((root) => walk(root))
      .filter((f) => !NOT_YET_CONVERTED.includes(f))
      .filter((f) => HEX.test(readFileSync(f, 'utf8')))

    expect(offenders).toEqual([])
  })

  it('does not list files that no longer exist', () => {
    const present = new Set(ROOTS.flatMap((root) => walk(root)))
    expect(NOT_YET_CONVERTED.filter((f) => !present.has(f))).toEqual([])
  })
})
```

- [ ] **Step 2: Run it — both assertions must pass now**

Run: `npx jest __tests__/constants/tokens.test.ts`
Expected: PASS, 2 tests. The `components/ui/` primitives from Tasks 3-6 are NOT on the allowlist and contain no hex, which is what proves the guard works.

- [ ] **Step 3: Verify the guard actually catches a violation**

Temporarily add `const x = '#FF0000'` to `components/ui/Screen.tsx`, run `npx jest __tests__/constants/tokens.test.ts`, and confirm it FAILS listing that file. Then remove the line and confirm it passes again. A guard that cannot fail is not a guard.

- [ ] **Step 4: Commit**

```bash
git add __tests__/constants/tokens.test.ts
git commit -m "test: guard against literal colors outside the token file"
```

---

## WAVE 2 — Hoster tabs and Events (fidelity gate)

### Task 8: EventCard as a ticket

**Files:**
- Rewrite: `thirdspace-app/components/EventCard.tsx`
- Create: `thirdspace-app/__tests__/components/EventCard.test.tsx`
- Modify: `thirdspace-app/__tests__/constants/tokens.test.ts` (remove `components/EventCard.tsx` from the allowlist)

**Interfaces:**
- Consumes: `TicketCard`, `Display`, `Body`, `ChipRow`, `palette`, `space`.
- Produces: `EventCard` — `(props: { event: CommunityEvent; onPress: () => void; tone?: 'deep' | 'cream' }) => JSX.Element`.
  **The `index` prop is removed** — it existed only to cycle `paletteFor`, which the spec deletes.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/EventCard.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { EventCard } from '../../components/EventCard'
import { CommunityEvent } from '../../types/models'

const event = {
  id: 'e1',
  title: 'Ceramics Night',
  description: 'Throw a pot, meet your neighbours.',
  venueName: 'Clay Studio',
  neighborhood: 'Williamsburg',
  category: 'Creative Arts',
  ageRequirement: '21+',
  capacity: 20,
  registeredCount: 4,
  startsAt: Timestamp.fromDate(new Date('2026-07-18T19:00:00Z')),
} as unknown as CommunityEvent

describe('EventCard', () => {
  it('shows the event name, venue and going count', () => {
    const { getByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(getByText('Ceramics Night')).toBeTruthy()
    expect(getByText(/Clay Studio/)).toBeTruthy()
    expect(getByText(/4 going/)).toBeTruthy()
  })

  it('renders the ticket date stub from startsAt', () => {
    const { getByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(getByText('18')).toBeTruthy()
    expect(getByText('Jul')).toBeTruthy()
  })

  it('says Sold out once capacity is reached', () => {
    const full = { ...event, registeredCount: 20 } as CommunityEvent
    const { getByText, queryByText } = render(<EventCard event={full} tone="deep" onPress={() => {}} />)
    expect(getByText('Sold out')).toBeTruthy()
    expect(queryByText(/going/)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/EventCard.test.tsx`
Expected: FAIL — the current card renders no `18`/`Jul` stub and requires `index`.

- [ ] **Step 3: Rewrite `components/EventCard.tsx`**

```tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { formatEventDate, isStartingSoon } from '../utils/eventHelpers'
import { space } from '../constants/design'
import { TicketCard } from './ui/TicketCard'
import { Display, Body } from './ui/Text'
import { ChipRow } from './ui/Chip'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface EventCardProps {
  event: CommunityEvent
  onPress: () => void
  /** Must match the screen background — TicketCard paints its notches in this tone. */
  tone?: 'deep' | 'cream'
}

export function EventCard({ event, onPress, tone = 'deep' }: EventCardProps) {
  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  const chips = [formatEventDate(startsAt), event.category]
  if (event.ageRequirement === '21+') chips.push('21+')
  if (isStartingSoon(startsAt, new Date())) chips.push('Starting soon')

  return (
    <TicketCard
      tone={tone}
      // CommunityEvent has no image field — TicketCard draws its color band instead.
      // Do not invent one; adding event photos is a separate data-layer change.
      photoUri={null}
      day={String(startsAt.getDate())}
      month={MONTHS[startsAt.getMonth()]}
      onPress={onPress}
    >
      <Display numberOfLines={2}>{event.title}</Display>
      <Body role="bodySm" style={styles.loc}>{event.venueName} · {event.neighborhood}</Body>
      {event.description ? (
        <Body numberOfLines={2} style={styles.desc}>{event.description}</Body>
      ) : null}
      <View style={styles.meta}>
        <ChipRow items={chips} accentIndex={1} />
      </View>
      <Body role="bodySm" style={styles.going}>
        {soldOut ? 'Sold out' : `${event.registeredCount} going`}
      </Body>
    </TicketCard>
  )
}

const styles = StyleSheet.create({
  loc: { marginTop: space.xs },
  desc: { marginTop: space.xs + 2 },
  meta: { marginTop: space.sm },
  going: { marginTop: space.xs + 3 },
})
```

`CommunityEvent` has no image field — verified during planning. `TicketCard` renders its color band instead, so nothing else is needed here.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/EventCard.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Remove `components/EventCard.tsx` from the tokens allowlist, then run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc will FAIL in `(attender)/index.tsx` and `(hoster)/events.tsx`, which still pass `index={i}`. Delete that prop at both call sites — a two-line change — then re-run until green.

- [ ] **Step 6: Commit**

```bash
git add components/EventCard.tsx __tests__/components/EventCard.test.tsx __tests__/constants/tokens.test.ts "app/(app)/(attender)/index.tsx" "app/(app)/(hoster)/events.tsx"
git commit -m "feat: rebuild EventCard on the ticket primitive"
```

---

### Task 9: Hoster Events screen

**Files:**
- Modify: `thirdspace-app/app/(app)/(hoster)/events.tsx` (whole file)
- Modify: `thirdspace-app/__tests__/constants/tokens.test.ts` (drop its allowlist entry)

**Interfaces:**
- Consumes: `Screen`, `Display`, `Meta`, `IconButton`, `CityChip`, `EventCard`.
- Produces: nothing importable.

- [ ] **Step 1: Rewrite the screen**

Keep every data hook and handler exactly as they are — this is presentation only. Replace `SafeAreaView` with `Screen`, the header with the comp's tagline + city chip + `IconButton`, and the announcement link with a `Meta role="eyebrow"`.

```tsx
import React, { useEffect, useState } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Meta } from '../../../components/ui/Text'
import { IconButton } from '../../../components/ui/IconButton'
import { CityChip } from '../../../components/ui/CityChip'
import { space, NAV_CLEARANCE } from '../../../constants/design'

export default function HosterEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeVenueEvents(user.uid, setEvents, () => setError("Couldn't load your events."))
  }, [user])

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const past = (events ?? []).filter((e) => e.startsAt.toMillis() < now).reverse()
  const ordered = [...upcoming, ...past]

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <Display role="screenTitle" style={styles.tagline}>Your events</Display>
        <View style={styles.rightCol}>
          <CityChip label="NYC + Brooklyn" />
          <IconButton name="add" accessibilityLabel="Create event" onPress={() => router.push('/(app)/create-event')} />
        </View>
      </View>

      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}

      <FlatList
        data={ordered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View>
            <EventCard
              event={item}
              tone="deep"
              onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: item.id } })}
            />
            <TouchableOpacity
              style={styles.announceBtn}
              onPress={() => router.push({ pathname: '/(app)/(hoster)/announcement/[id]', params: { id: item.id } })}
            >
              <Meta role="eyebrow" tone="clay">Send announcement</Meta>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="✨"
            title="No events yet"
            body="Create your first event and it appears in the community feed instantly."
            actionLabel="Create event"
            onAction={() => router.push('/(app)/create-event')}
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingTop: space.md, marginBottom: space.lg },
  tagline: { maxWidth: 180 },
  rightCol: { alignItems: 'flex-end', gap: space.sm },
  bannerWrap: { paddingHorizontal: space.lg },
  list: { paddingHorizontal: space.lg, paddingBottom: NAV_CLEARANCE },
  announceBtn: { alignSelf: 'flex-start', marginTop: -space.xs, paddingVertical: space.sm, paddingHorizontal: space.xs },
})
```

- [ ] **Step 2: Drop the allowlist entry**

Remove `'app/(app)/(hoster)/events.tsx'` from `NOT_YET_CONVERTED`.

- [ ] **Step 3: Run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: green. If `tokens.test.ts` fails naming this file, a literal hex survived — find and tokenize it.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(hoster)/events.tsx" __tests__/constants/tokens.test.ts
git commit -m "feat: restyle hoster events on the ticket system"
```

---

### Task 10: Flat tab bar, and delete PillTabButton

**Files:**
- Modify: `thirdspace-app/app/(app)/(hoster)/_layout.tsx:20-40`
- Delete: `thirdspace-app/components/PillTabButton.tsx`
- Modify: `thirdspace-app/app/(app)/(attender)/_layout.tsx` (drop the `PillTabButton` import and `tabBarButton` only — the rest of that screen converts in Wave 3)
- Modify: `thirdspace-app/__tests__/constants/tokens.test.ts`

**Interfaces:**
- Consumes: `tabBar`, `type` from `constants/design`.
- Produces: nothing importable. `PillTabButton` ceases to exist — no file may import it after this task.

- [ ] **Step 1: Replace the hoster tab options**

In `app/(app)/(hoster)/_layout.tsx`, swap the `screenOptions` block for the comp's flat bar. Leave the auth/venue guard logic above it untouched:

```tsx
import { tabBar, type as typeScale } from '../../../constants/design'
```

```tsx
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBar.activeTintColor,
        tabBarInactiveTintColor: tabBar.inactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBar.backgroundColor,
          borderTopColor: tabBar.borderTopColor,
          borderTopWidth: tabBar.borderTopWidth,
          height: tabBar.height,
          elevation: 0,
        },
        tabBarLabelStyle: typeScale.tabLabel,
      }}
```

Delete the `PillTabButton` import and the `tabBarButton` line.

- [ ] **Step 2: Do the same two-line removal in the attender layout**

`app/(app)/(attender)/_layout.tsx` still uses the old floating style — that converts in Wave 3. For now only remove the `PillTabButton` import and its `tabBarButton: (props) => <PillTabButton {...props} />` line, so nothing imports the deleted file. Leave its allowlist entry in place.

- [ ] **Step 3: Delete the component and confirm nothing references it**

```bash
git rm components/PillTabButton.tsx
grep -rn "PillTabButton" app components || echo "no references — good"
```

Expected: the grep prints the "no references" line.

- [ ] **Step 4: Drop `components/PillTabButton.tsx` and `app/(app)/(hoster)/_layout.tsx` from the allowlist, then run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: green. `tokens.test.ts`'s second assertion catches the deleted file if you forget to remove its allowlist entry.

- [ ] **Step 5: Commit**

```bash
git add -A "app/(app)/(hoster)/_layout.tsx" "app/(app)/(attender)/_layout.tsx" components/PillTabButton.tsx __tests__/constants/tokens.test.ts
git commit -m "feat: flatten the tab bar and drop PillTabButton"
```

---

### Task 11: Hoster overview screen

**Files:**
- Modify: `thirdspace-app/app/(app)/(hoster)/index.tsx`
- Modify: `thirdspace-app/__tests__/constants/tokens.test.ts`

**Interfaces:**
- Consumes: `Screen`, `Display`, `Body`, `Meta`, `space`, `NAV_CLEARANCE`.
- Produces: nothing importable.

- [ ] **Step 1: Read the file and list every literal it contains**

Run: `grep -n "#[0-9A-Fa-f]\{3,8\}\|Poppins_" "app/(app)/(hoster)/index.tsx"`

Every hit is a line you must convert. This is the standard conversion recipe used by all remaining screens:

| Old | New |
|-----|-----|
| `<SafeAreaView style={{backgroundColor:'#F3F3F5'}}>` | `<Screen tone="deep">` (browse) or `tone="cream"` (form/thread) |
| `<Text style={{fontFamily:'Poppins_800ExtraBold', fontSize:32}}>` | `<Display role="screenTitle">` |
| `<Text style={{fontFamily:'Poppins_700Bold', fontSize:17}}>` | `<Display>` |
| `<Text style={{fontFamily:'Poppins_400Regular'}}>` | `<Body>` |
| `<Text style={{fontFamily:'Poppins_500Medium', fontSize:12}}>` | `<Body role="bodySm">` |
| timestamps, counts, category/price labels | `<Meta>` |
| section labels, all-caps headers | `<Meta role="eyebrow">` |
| `color: '#15161A'` / `'#6B6F78'` / `'#FF9F3D'` | `tone="ink"` / `tone="inkSoft"` / `tone="clay"` |
| `paddingHorizontal: 24` | `space.xl` |
| `borderRadius: 30` | `radius.ticket` (event surfaces) or `radius.chip` |
| `NAV_CLEARANCE` from `theme` | `NAV_CLEARANCE` from `design` |

Keep all data hooks, handlers, and conditional logic byte-identical. This is a presentation change; if behavior changes, the task is wrong.

- [ ] **Step 2: Apply the recipe, then drop the allowlist entry**

- [ ] **Step 3: Run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: green, with `tokens.test.ts` now enforcing this file.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(hoster)/index.tsx" __tests__/constants/tokens.test.ts
git commit -m "feat: restyle hoster overview on the ticket system"
```

---

### Task 12: Fidelity gate — device check

**This is a STOP. Do not start Wave 3 until a human has looked at the screen.**

**Files:** none.

- [ ] **Step 1: Run the app**

```bash
npx expo start
```

Open the hoster account and go to the Events tab.

- [ ] **Step 2: Compare against the comp**

Open `docs/events-redesign-mockup.html` in a browser (the middle column is the closest reference; our display face is Antonio, not Anton). Check, in order:

1. Two-tone separation — does the light ticket read as clearly distinct from the deep field at phone brightness?
2. Notches — do they read as cut-outs, or as stray dots? (Wrong tone is the usual cause.)
3. Dashed tear line — RN's `borderStyle: 'dashed'` renders inconsistently on Android. If it looks solid or disappears, note it; the fallback is a repeated-glyph divider.
4. Antonio at 17px — is the condensed face still legible for event names on a real screen?
5. Tab bar — flat, flush, clay active state.

- [ ] **Step 3: Report findings and decide**

Write what you found into the task notes and get an explicit go/no-go before Wave 3. If the two-tone contrast or the dashed line fails on device, that is a spec-level change and belongs in a revised spec, not a workaround in Wave 3.

---

## WAVES 3-6 — Remaining screens

**These waves are deliberately not pre-written as code, and that is a scope decision you should know about.**

Every remaining task is the same mechanical conversion: apply the recipe table in Task 11, drop the file's allowlist entry, run `npx tsc --noEmit && npx jest`, commit. Writing 33 more screens' worth of JSX now would be guessing at markup I cannot see, against primitives whose API the Task 12 gate may still change. If the gate sends us back — say the dashed tear line has to become a glyph divider — pre-written code for 33 screens is 33 files of rework.

**Write the Wave 3-6 plan after Task 12 passes,** when the primitives are proven. Until then, the task list below is the committed scope, in order.

### Wave 3 — Attender browse
| Task | Files |
|------|-------|
| 13 | `components/CompactEventRow.tsx` (ticket notches — it is an event surface) |
| 14 | `app/(app)/(attender)/index.tsx` (discover feed, `tone="deep"`) |
| 15 | `app/(app)/(attender)/my-events.tsx` (`tone="deep"`) |
| 16 | `components/ChatRow.tsx` + `app/(app)/(attender)/chats.tsx` (`tone="deep"`, **no notches**) |
| 17 | `app/(app)/(attender)/_layout.tsx` (flat tab bar, same options block as Task 10) |
| 18 | `components/CategoryTabs.tsx`, `components/FilterSheet.tsx`, `app/(app)/filters.tsx` |

### Wave 4 — Detail surfaces
| Task | Files |
|------|-------|
| 19 | `app/(app)/event/[id].tsx` (`tone="deep"`, ticket header) |
| 20 | `components/ChatBubble.tsx` + `app/(app)/chat/[id].tsx` (`tone="cream"`) |
| 21 | `app/(app)/member/[uid].tsx`, `app/(app)/guest-list/[id].tsx`, `components/AttendeeAvatarStack.tsx` |
| 22 | `components/RegistrationConfirmation.tsx`, `components/AnnouncementBanner.tsx` |

### Wave 5 — Auth and onboarding (all `tone="cream"`)
| Task | Files |
|------|-------|
| 23 | `components/FormInput.tsx`, `components/AuthButton.tsx`, `components/Banner.tsx` |
| 24 | `app/(auth)/sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `components/PasswordStrengthMeter.tsx` |
| 25 | `app/(auth)/onboarding.tsx`, `role-select.tsx`, `create-profile.tsx`, `_layout.tsx`, `components/OnboardingSlide.tsx` |

### Wave 6 — Everything remaining
| Task | Files |
|------|-------|
| 26 | `app/(app)/settings.tsx`, `change-password.tsx`, `message-privacy.tsx`, `become-host.tsx` |
| 27 | `app/(app)/(attender)/profile.tsx`, `badges.tsx`, `connections.tsx`, `components/BadgeGrid.tsx`, `MemberProfileCard.tsx`, `InterestChip.tsx` |
| 28 | `app/(app)/create-event.tsx`, `edit-profile.tsx`, `venue-setup.tsx`, `verify-identity.tsx`, `components/VenueForm.tsx` |
| 29 | `app/(app)/message-requests.tsx`, `(hoster)/venue.tsx`, `(hoster)/announcement/[id].tsx`, `(app)/_layout.tsx` |
| 30 | `components/EmptyState.tsx`, `LoadingView.tsx`, `Toast.tsx` |

### Task 31: Final cleanup

- [ ] **Step 1: Confirm the allowlist is empty**

`NOT_YET_CONVERTED` in `tokens.test.ts` must be `[]`. If any entry remains, its wave is not finished.

- [ ] **Step 2: Delete the legacy design system**

```bash
git rm constants/theme.ts __tests__/components/contrast.test.ts
grep -rn "constants/theme" app components utils hooks services || echo "no importers — good"
```

Expected: the grep prints the "no importers" line. If it does not, that file was missed by its wave.

- [ ] **Step 3: Remove Poppins and the dead DM families**

Delete the five Poppins constants from `useFonts` in `app/_layout.tsx` and its import line, then:

```bash
npm uninstall @expo-google-fonts/poppins @expo-google-fonts/dm-sans @expo-google-fonts/dm-serif-display
```

- [ ] **Step 4: Confirm no font names survive outside the token file**

```bash
grep -rn "Poppins_\|DMSans_\|DMSerif" app components || echo "clean"
```

- [ ] **Step 5: Run everything, then update the codemap**

Run: `npx tsc --noEmit && npx jest`
Then update `docs/CODEMAPS/thirdspace-codemap.md`: replace the "Design System (orange / Poppins)" section with the ticket system, drop the "Colors are still hardcoded per file" gotcha (it is now false and enforced by a test), and note `components/ui/` in the source tree.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove the Poppins design system"
```

---

## Self-review notes

Checked against the spec:

- **Every spec section maps to a task.** Palette → 1; type → 2; primitives → 3-6; tokens test → 7; surface rules → the recipe in Task 11 plus per-task `tone` calls; ticket-notches-on-event-surfaces-only → Tasks 5, 8, 13, 19 carry notches, Task 16 explicitly does not; wave order → Tasks 8-30; deletions (`theme.ts`, `PillTabButton`, `cardPalette`) → Tasks 10 and 31.
- **Two spec deviations are documented above** with rationale rather than applied silently.
- **Type consistency:** `tone` is `'deep' | 'cream'` in `Screen`, `TicketCard`, and `EventCard` throughout. `role` values used in tasks (`screenTitle`, `cardTitle`, `stubDay`, `tabLabel`, `body`, `bodySm`, `bodyLg`, `meta`, `eyebrow`) all exist in the `TypeRole` union defined in Task 2. `NAV_CLEARANCE` is exported from `design.ts` in Task 2 and imported from there in Tasks 9 and 11.
- **One spec assumption did not survive planning.** The comp's ticket has a photo above the tear line; `CommunityEvent` has no image field, and adding one is a data-layer change the spec puts out of scope. `TicketCard` therefore draws a 44px `orangeDeep` band when `photoUri` is null, keeping the two-part silhouette, and the notches align to whichever header is present. `photoUri` stays in the API for when events gain photos. **This is a visible departure from the comp and should be confirmed at the Task 12 gate.**
