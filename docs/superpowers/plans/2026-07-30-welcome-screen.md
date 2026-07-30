# Welcome Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `app/(auth)/onboarding.tsx` into a two-phase welcome screen — a gradient/glow field holding the mark, wordmark and tagline, with the existing Get Started sheet floating in after a beat.

**Architecture:** Three units. `components/WelcomeBackdrop.tsx` owns the ambient field and its looping drift. `hooks/useWelcomeReveal.ts` owns the one-shot reveal timeline and the reduced-motion decision. `app/(auth)/onboarding.tsx` composes them and keeps its existing permissions logic untouched. No new route; `resolveAuthRoute` is not modified.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, `expo-linear-gradient` (already a dependency), React Native's built-in `Animated`, Jest (jest-expo) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-07-30-welcome-screen-design.md`

## Global Constraints

- **All commands run from `thirdspace-app/`.** Tests: `npx jest`. Typecheck: `npx tsc --noEmit`.
- **No literal hex in `app/` or `components/`.** `__tests__/constants/tokens.test.ts` scans both trees with an empty allowlist and fails the build on any quoted hex. Colors come from `constants/design.ts` only.
- **No new dependencies.** `react-native-svg` and `expo-blur` are not installed and adding either forces a native rebuild. `expo-linear-gradient@~15.0.8` is already present.
- **Do not add a display font or a display role.** `__tests__/constants/design.test.ts:76-82` asserts all four display roles resolve to exactly one font family. The wordmark stays Bebas Neue and renders `THIRDSPACE` in caps.
- **Animate opacity and transform only**, with `useNativeDriver: true` throughout.
- **Tagline copy is exactly `YOUR THIRD SPACE AWAITS YOU...`** — trailing ellipsis included.
- **Tagline tone is `ink`, never `inkSoft`** — `inkSoft` measures 3.78:1 on `welcomeSkyTop`, below AA.
- Every new timing value is a token in `constants/design.ts`, not a literal in a component.
- Commit after each task. Conventional commits (`feat:`, `test:`, `fix:`). No attribution trailers — this repo has none.

---

### Task 1: Welcome tokens

Adds the five palette entries and the motion timeline to the token file, with tests that pin the properties the rest of the plan depends on.

**Files:**
- Modify: `thirdspace-app/constants/design.ts`
- Test: `thirdspace-app/__tests__/constants/design.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `palette.welcomeSkyTop`, `palette.welcomeSkyBottom`, `palette.welcomeGlowWarm`, `palette.welcomeGlowClay`, `palette.welcomeSpark` (all `string`); and `motion`, a frozen object of `number` with keys `markDelay`, `markIn`, `wordmarkDelay`, `wordmarkIn`, `taglineDelay`, `taglineIn`, `sheetDelay`, `sheetIn`, `driftCycle`, `sparkCycle`.

- [ ] **Step 1: Write the failing tests**

Append to `thirdspace-app/__tests__/constants/design.test.ts`. The file already defines `luminance()` and `contrast()` at the top — reuse them, do not redefine.

Also add `motion` to the existing import on line 1:

```ts
import { palette, type as typeScale, radius, space, tabBar, motion } from '../../constants/design'
```

Then append:

```ts
describe('welcome field tokens', () => {
  it('gives the welcome field two distinct stops, dark to light', () => {
    expect(palette.welcomeSkyTop).not.toBe(palette.welcomeSkyBottom)
    expect(luminance(palette.welcomeSkyTop)).toBeLessThan(luminance(palette.welcomeSkyBottom))
  })

  it('reads ink at AA across the whole gradient', () => {
    // The wordmark and tagline sit over a range, not a single fill, so ink has to
    // clear AA at BOTH ends or it fails somewhere in the middle.
    expect(contrast(palette.ink, palette.welcomeSkyTop)).toBeGreaterThanOrEqual(4.5)
    expect(contrast(palette.ink, palette.welcomeSkyBottom)).toBeGreaterThanOrEqual(4.5)
  })

  it('pins why the tagline cannot use inkSoft', () => {
    // 3.78:1 — under AA. This test exists so that "soften the tagline" is a
    // deliberate decision with a failing test attached, not a quiet regression.
    expect(contrast(palette.inkSoft, palette.welcomeSkyTop)).toBeLessThan(4.5)
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: FAIL — TypeScript/runtime error that `motion` is not exported and `palette.welcomeSkyTop` is `undefined`.

- [ ] **Step 3: Add the tokens**

In `thirdspace-app/constants/design.ts`, add these entries inside the `palette` object, after the `rule` entry (keep the closing `} as const`):

```ts
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
```

Then add this new export at the end of the file:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: PASS — including the pre-existing palette and type-scale suites, which must be untouched.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx tsc --noEmit && npx jest`
Expected: TypeScript clean; 51 suites pass with the new assertions added to the existing count.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/constants/design.ts thirdspace-app/__tests__/constants/design.test.ts
git commit -m "feat: add welcome field and motion tokens"
```

---

### Task 2: WelcomeBackdrop component

The ambient field: gradient, three glow blobs, five sparks, and its own looping drift. It knows nothing about onboarding.

**Files:**
- Create: `thirdspace-app/components/WelcomeBackdrop.tsx`
- Test: `thirdspace-app/__tests__/components/WelcomeBackdrop.test.tsx`

**Interfaces:**
- Consumes: `palette.welcomeSkyTop`, `palette.welcomeSkyBottom`, `palette.welcomeGlowWarm`, `palette.welcomeGlowClay`, `palette.welcomeSpark`, `motion.driftCycle`, `motion.sparkCycle` from Task 1.
- Produces: `export function WelcomeBackdrop(props: WelcomeBackdropProps)` where `interface WelcomeBackdropProps { reduceMotion: boolean }`. Renders an absolutely-positioned fill layer with `testID="welcome-backdrop"`. It renders no children and accepts none — the screen's content sits over it as a sibling.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/components/WelcomeBackdrop.test.tsx`:

```tsx
import React from 'react'
import { Animated } from 'react-native'
import { render } from '@testing-library/react-native'
import { WelcomeBackdrop } from '../../components/WelcomeBackdrop'

describe('WelcomeBackdrop', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the field', () => {
    const { getByTestId } = render(<WelcomeBackdrop reduceMotion={false} />)
    expect(getByTestId('welcome-backdrop')).toBeTruthy()
  })

  it('starts ambient loops when motion is allowed', () => {
    const loop = jest.spyOn(Animated, 'loop')
    render(<WelcomeBackdrop reduceMotion={false} />)
    expect(loop).toHaveBeenCalled()
  })

  it('starts no loop at all when reduced motion is on', () => {
    // Not "a slower animation" — reduced motion means no animation is created.
    const loop = jest.spyOn(Animated, 'loop')
    render(<WelcomeBackdrop reduceMotion />)
    expect(loop).not.toHaveBeenCalled()
  })

  it('stops its loops on unmount', () => {
    // A running Animated.loop holds a reference and keeps ticking after the screen
    // is gone. This is the same class of leak fixed in 977b150.
    const stop = jest.fn()
    jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation)
    const { unmount } = render(<WelcomeBackdrop reduceMotion={false} />)
    unmount()
    expect(stop).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/WelcomeBackdrop.test.tsx`
Expected: FAIL — "Cannot find module '../../components/WelcomeBackdrop'".

- [ ] **Step 3: Write the component**

Create `thirdspace-app/components/WelcomeBackdrop.tsx`:

```tsx
import React, { useEffect, useMemo, useRef } from 'react'
import { View, Animated, StyleSheet, Easing, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { palette, motion } from '../constants/design'

/**
 * Six rings per blob. There is no react-native-svg in this project (adding it forces a
 * native rebuild) and no expo-blur, and expo-linear-gradient is linear-only — so a soft
 * radial falloff is faked by stacking concentric circles of the same low alpha. The
 * centre accumulates toward ~0.5, the outer edge stays at the token's alpha.
 */
const RINGS = 6

const DRIFT_PX = 10

/** Positions are fractions of the window so the field composes at any screen size. */
const BLOBS = [
  { key: 'warm-upper', xPct: 0.30, yPct: 0.20, radius: 150, color: palette.welcomeGlowWarm },
  { key: 'warm-right', xPct: 0.78, yPct: 0.36, radius: 110, color: palette.welcomeGlowWarm },
  { key: 'clay-lower', xPct: 0.33, yPct: 0.72, radius: 140, color: palette.welcomeGlowClay },
] as const

const SPARKS = [
  { key: 'a', xPct: 0.33, yPct: 0.22, size: 4 },
  { key: 'b', xPct: 0.66, yPct: 0.37, size: 4 },
  { key: 'c', xPct: 0.26, yPct: 0.64, size: 4 },
  { key: 'd', xPct: 0.55, yPct: 0.73, size: 3 },
  { key: 'e', xPct: 0.72, yPct: 0.58, size: 3 },
] as const

export interface WelcomeBackdropProps {
  /** When true no animation is created at all — not a slower one. */
  reduceMotion: boolean
}

export function WelcomeBackdrop({ reduceMotion }: WelcomeBackdropProps) {
  const { width, height } = useWindowDimensions()

  // One driver per blob and per spark, created once and reused across renders.
  const blobDrivers = useRef(BLOBS.map(() => new Animated.Value(0))).current
  const sparkDrivers = useRef(SPARKS.map(() => new Animated.Value(0))).current

  useEffect(() => {
    if (reduceMotion) return

    const cycle = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      )

    // Offsetting each loop keeps the field from pulsing in lockstep, which reads as
    // a glitch rather than as drift.
    const loops = [
      ...blobDrivers.map((value, i) => cycle(value, motion.driftCycle + i * 900)),
      ...sparkDrivers.map((value, i) => cycle(value, motion.sparkCycle + i * 400)),
    ]

    loops.forEach((loop) => loop.start())
    return () => loops.forEach((loop) => loop.stop())
  }, [reduceMotion, blobDrivers, sparkDrivers])

  const blobs = useMemo(
    () =>
      BLOBS.map((blob, i) => ({
        ...blob,
        x: blob.xPct * width,
        y: blob.yPct * height,
        translateY: blobDrivers[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-DRIFT_PX, DRIFT_PX],
        }),
      })),
    [width, height, blobDrivers],
  )

  const sparks = useMemo(
    () =>
      SPARKS.map((spark, i) => ({
        ...spark,
        x: spark.xPct * width,
        y: spark.yPct * height,
        opacity: sparkDrivers[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 0.85],
        }),
      })),
    [width, height, sparkDrivers],
  )

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="welcome-backdrop">
      <LinearGradient
        colors={[palette.welcomeSkyTop, palette.welcomeSkyBottom]}
        style={StyleSheet.absoluteFill}
      />

      {blobs.map((blob) => (
        <Animated.View
          key={blob.key}
          style={[styles.anchor, { left: blob.x, top: blob.y, transform: [{ translateY: blob.translateY }] }]}
        >
          {Array.from({ length: RINGS }, (_, ring) => {
            const r = blob.radius * ((RINGS - ring) / RINGS)
            return (
              <View
                key={ring}
                style={[
                  styles.ring,
                  { width: r * 2, height: r * 2, borderRadius: r, marginLeft: -r, marginTop: -r, backgroundColor: blob.color },
                ]}
              />
            )
          })}
        </Animated.View>
      ))}

      {sparks.map((spark) => (
        <Animated.View
          key={spark.key}
          style={[
            styles.spark,
            {
              left: spark.x,
              top: spark.y,
              width: spark.size,
              height: spark.size,
              borderRadius: spark.size / 2,
              opacity: spark.opacity,
            },
          ]}
        />
      ))}
    </View>
  )
}

WelcomeBackdrop.displayName = 'WelcomeBackdrop'

const styles = StyleSheet.create({
  /** Zero-size origin; rings centre themselves on it via negative margins. */
  anchor: { position: 'absolute', width: 0, height: 0 },
  ring: { position: 'absolute', left: 0, top: 0 },
  spark: { position: 'absolute', backgroundColor: palette.welcomeSpark },
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/WelcomeBackdrop.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Verify the token guard still passes**

Run: `npx jest __tests__/constants/tokens.test.ts`
Expected: PASS — the new component must contain no quoted hex. If this fails, a color was inlined instead of imported.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/components/WelcomeBackdrop.tsx thirdspace-app/__tests__/components/WelcomeBackdrop.test.tsx
git commit -m "feat: add WelcomeBackdrop gradient field with drifting glow"
```

---

### Task 3: useWelcomeReveal hook

The one-shot reveal timeline plus the reduced-motion decision.

**Files:**
- Create: `thirdspace-app/hooks/useWelcomeReveal.ts`
- Test: `thirdspace-app/__tests__/hooks/useWelcomeReveal.test.tsx`

**Interfaces:**
- Consumes: `motion` from Task 1.
- Produces:

```ts
export interface WelcomeReveal {
  mark: Animated.Value
  wordmark: Animated.Value
  tagline: Animated.Value
  sheet: Animated.Value
  /** null while the accessibility probe is still in flight. */
  reduceMotion: boolean | null
  skip: () => void
}
export function useWelcomeReveal(): WelcomeReveal
```

Each value runs 0 → 1. Task 4 maps them to opacity directly and to translate via `interpolate`.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/hooks/useWelcomeReveal.test.tsx`:

```tsx
import { AccessibilityInfo } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useWelcomeReveal } from '../../hooks/useWelcomeReveal'

/**
 * What is NOT tested here, deliberately: the interpolated value part-way through the
 * animation. With useNativeDriver the JS-side Animated.Value is not updated while the
 * animation runs, so advancing fake timers and reading __getValue() would assert the
 * behaviour of the jest mock rather than the app. The timeline's ORDERING is guarded
 * in __tests__/constants/design.test.ts; the motion itself is verified on device.
 */
describe('useWelcomeReveal', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const values = (r: ReturnType<typeof useWelcomeReveal>) =>
    [r.mark, r.wordmark, r.tagline, r.sheet].map((v) => (v as unknown as { __getValue: () => number }).__getValue())

  it('starts every element hidden under normal motion', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    expect(values(result.current)).toEqual([0, 0, 0, 0])
  })

  it('starts every element fully revealed when reduced motion is on', async () => {
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true)
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(true))
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('drives everything to the final state on skip', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    act(() => { result.current.skip() })
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('is idempotent — skipping twice is harmless', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    act(() => { result.current.skip(); result.current.skip() })
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('treats a failed accessibility probe as motion allowed', async () => {
    // The probe is a native call and can reject. Falling back to "no reduced motion"
    // keeps the screen animating rather than silently freezing it.
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(new Error('unavailable'))
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
  })

  it('survives the probe resolving after unmount', async () => {
    // The probe is async and the screen can be dismissed before it lands. Resolve it
    // manually AFTER unmounting to prove the mounted guard holds.
    //
    // Note this asserts "does not throw", not "React did not warn" — React 19 no
    // longer warns about setState on an unmounted component, so a console.error spy
    // would pass whether or not the guard existed, and prove nothing.
    let release!: (value: boolean) => void
    const pending = new Promise<boolean>((resolve) => { release = resolve })
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockReturnValue(pending)

    const { unmount } = renderHook(() => useWelcomeReveal())
    unmount()

    await act(async () => { release(true); await pending })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/hooks/useWelcomeReveal.test.tsx`
Expected: FAIL — "Cannot find module '../../hooks/useWelcomeReveal'".

- [ ] **Step 3: Write the hook**

Create `thirdspace-app/hooks/useWelcomeReveal.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'
import { motion } from '../constants/design'

export interface WelcomeReveal {
  mark: Animated.Value
  wordmark: Animated.Value
  tagline: Animated.Value
  sheet: Animated.Value
  /** null while the accessibility probe is still in flight. */
  reduceMotion: boolean | null
  skip: () => void
}

/**
 * Drives the one-shot welcome reveal. Values run 0 -> 1; the screen maps them to
 * opacity and translate.
 *
 * The reveal does not start until the reduced-motion probe resolves. That probe is a
 * fast native call and nothing is visible before markDelay anyway, so the wait costs
 * nothing — whereas starting first and discovering reduced motion afterwards would mean
 * animating at a user who asked not to be.
 */
export function useWelcomeReveal(): WelcomeReveal {
  const mark = useRef(new Animated.Value(0)).current
  const wordmark = useRef(new Animated.Value(0)).current
  const tagline = useRef(new Animated.Value(0)).current
  const sheet = useRef(new Animated.Value(0)).current

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)
  const running = useRef<Animated.CompositeAnimation | null>(null)

  const settle = useCallback(() => {
    mark.setValue(1)
    wordmark.setValue(1)
    tagline.setValue(1)
    sheet.setValue(1)
  }, [mark, wordmark, tagline, sheet])

  const skip = useCallback(() => {
    running.current?.stop()
    running.current = null
    settle()
  }, [settle])

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduceMotion(enabled) })
      // A rejected probe must not freeze the screen — default to animating.
      .catch(() => { if (mounted) setReduceMotion(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (reduceMotion === null) return

    if (reduceMotion) {
      settle()
      return
    }

    const track = (value: Animated.Value, delay: number, duration: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])

    const animation = Animated.parallel([
      track(mark, motion.markDelay, motion.markIn),
      track(wordmark, motion.wordmarkDelay, motion.wordmarkIn),
      track(tagline, motion.taglineDelay, motion.taglineIn),
      track(sheet, motion.sheetDelay, motion.sheetIn),
    ])

    running.current = animation
    animation.start(() => { running.current = null })

    return () => {
      animation.stop()
      running.current = null
    }
  }, [reduceMotion, mark, wordmark, tagline, sheet, settle])

  return { mark, wordmark, tagline, sheet, reduceMotion, skip }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/hooks/useWelcomeReveal.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/hooks/useWelcomeReveal.ts thirdspace-app/__tests__/hooks/useWelcomeReveal.test.tsx
git commit -m "feat: add useWelcomeReveal timeline with reduced-motion bypass"
```

---

### Task 4: Wire the welcome screen together

Replaces the flat orange field with the backdrop, animates the three intro elements and the sheet, and adds tap-to-skip. The permissions logic is not touched.

**Files:**
- Modify: `thirdspace-app/app/(auth)/onboarding.tsx`

**Interfaces:**
- Consumes: `WelcomeBackdrop` (Task 2), `useWelcomeReveal` (Task 3), `motion` and the welcome palette entries (Task 1).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Replace the imports**

In `thirdspace-app/app/(auth)/onboarding.tsx`, replace lines 1-9 with:

```tsx
import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingPrefs } from '../../services/preferences'
import { Display, Body, Meta } from '../../components/ui/Text'
import { WelcomeBackdrop } from '../../components/WelcomeBackdrop'
import { useWelcomeReveal } from '../../hooks/useWelcomeReveal'
import { palette, radius, space } from '../../constants/design'
```

`PermissionRow` (lines 11-46) is unchanged.

- [ ] **Step 2: Add the hook and the rise helper to the component body**

In `export default function Onboarding()`, add below the two `useState` lines:

```tsx
  const reveal = useWelcomeReveal()

  /** Maps a 0->1 driver to a upward slide, so each element rises as it fades in. */
  const rise = (value: Animated.Value, distance: number) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  })
```

`next()` is unchanged.

- [ ] **Step 3: Replace the returned JSX**

Replace the whole `return (...)` block (currently lines 60-105) with:

```tsx
  return (
    {/* accessible={false} so screen readers do not announce the whole screen as a
        button. The skip is a convenience for sighted users waiting out the intro;
        VoiceOver users get the reduced-motion path or can act on the real controls. */}
    <Pressable style={styles.field} onPress={reveal.skip} accessible={false}>
      <StatusBar style="dark" />
      <WelcomeBackdrop reduceMotion={reveal.reduceMotion === true} />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.markRow, { opacity: reveal.mark, transform: [{ scale: reveal.mark.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
            {/* Three-dot mark, laid out with Views — react-native-svg would mean a native rebuild. */}
            <View style={styles.logo} accessibilityRole="image" accessibilityLabel="ThirdSpace">
              <View style={[styles.dot, { left: 8, top: 10 }]} />
              <View style={[styles.dot, { left: 30, top: 10 }]} />
              <View style={[styles.dot, { left: 19, top: 29 }]} />
            </View>
          </Animated.View>

          <Animated.View style={rise(reveal.wordmark, 14)}>
            <Display role="screenTitle" style={styles.wordmark}>ThirdSpace</Display>
          </Animated.View>

          <Animated.View style={rise(reveal.tagline, 10)}>
            {/* ink, not inkSoft: inkSoft is 3.78:1 on welcomeSkyTop, under AA. */}
            <Meta role="eyebrow" tone="ink" style={styles.tagline}>Your Third Space awaits you...</Meta>
          </Animated.View>
        </View>

        {/* Cream sheet lifted off the field — the two-tone pairing that
            replaces the old sunset gradient. */}
        <Animated.View style={rise(reveal.sheet, 48)}>
          <View style={styles.sheet}>
            <Display role="screenTitle" style={styles.heading}>Get Started</Display>

            <PermissionRow
              icon="location"
              title="Location"
              body="To see people & groups near you"
              enabled={location}
              onToggle={() => setLocation((v) => !v)}
            />
            <PermissionRow
              icon="notifications"
              title="Notifications"
              body="So you never miss a thing"
              enabled={notifications}
              onToggle={() => setNotifications((v) => !v)}
            />

            <TouchableOpacity style={styles.next} onPress={next} activeOpacity={0.9}>
              <Body role="button" style={styles.onInk}>Next</Body>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signIn} onPress={() => router.push('/(auth)/sign-in')}>
              <Meta role="eyebrow" tone="clay">Already have an account?</Meta>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  )
```

Note: the mark keeps its own `Animated.View` rather than using `rise()` because it scales rather than slides.

- [ ] **Step 4: Update the styles**

In the `StyleSheet.create` block, replace the `field` and `tagline` entries and drop the now-unused wordmark row gap. `field` no longer paints a background — `WelcomeBackdrop` does:

```tsx
  field: { flex: 1 },
```

and replace the existing `tagline` entry with:

```tsx
  /** eyebrow is 10px — too small for a hero line. Face, caps and tracking stay from the token. */
  tagline: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.lg },
```

`logoWrap`, `markRow`, `logo`, `dot`, `wordmark`, `sheet`, `heading`, `row`, `rowIcon`, `rowText`, `rowTitle`, `checkOn`, `checkOff`, `next`, `onInk`, `signIn` are all unchanged.

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: TypeScript clean; all suites pass. `tokens.test.ts` must still pass — `onboarding.tsx` must contain no quoted hex.

- [ ] **Step 6: Verify on device**

Run: `npx expo start`

Confirm by eye, because none of this is assertable in jest:
- the gradient runs deep orange at top to cream at bottom, with three soft glow blobs
- the mark, then `THIRDSPACE`, then the tagline fade and rise in sequence
- the Get Started sheet floats up after a clear pause, around 1.5s
- tapping anywhere during the intro jumps straight to the finished state
- the blobs and sparks keep drifting after everything has settled
- with **Settings → Accessibility → Reduce Motion** on, the screen appears fully formed with no movement at all

- [ ] **Step 7: Commit**

```bash
git add thirdspace-app/app/\(auth\)/onboarding.tsx
git commit -m "feat: stage the onboarding welcome before the Get Started sheet"
```

---

## Manual verification checklist

Not covered by jest, per the spec's testing note:

- [ ] Gradient renders top-to-bottom without banding on a real device
- [ ] Glow blobs read as soft, not as visible concentric rings — if they band badly, raise `RINGS` in `WelcomeBackdrop.tsx`
- [ ] Timeline feels like an arrival, not a stall
- [ ] Tap-to-skip works at any point during the intro
- [ ] **The full-screen `Pressable` does not swallow the real controls** — the Location
      and Notifications toggles, `Next`, and `Already have an account?` must all still
      work. RN's responder system should give the child touchable the gesture, but this
      is the one interaction the wrapper could plausibly break, so verify it explicitly.
- [ ] Reduce Motion produces a completely static screen
- [ ] Android: the Bebas wordmark line box is not clipped (the codemap flags Android `includeFontPadding` as a known risk for this face)
- [ ] Small screens (SE-class): the sheet does not overlap the tagline
