# Welcome Screen — Design Spec

_Date: 2026-07-30. Reference comp: `docs/Welcome_screen.jpeg`._

## Problem

`app/(auth)/onboarding.tsx` currently renders everything at once: the three-dot mark,
the ThirdSpace wordmark, the tagline, and the cream "Get Started" sheet with the
Location/Notifications toggles. There is no arrival moment — the screen is fully
populated on first paint.

The comp shows the screen *before* the sheet exists: a warm vertical gradient with soft
radial glow blobs and scattered light sparks, holding just the mark, wordmark and
tagline. The sheet should arrive after a beat.

## Scope

One screen. The permissions flow, `resolveAuthRoute`, and every other surface are
untouched. No new route: onboarding stays a single screen with two visual phases.

## Design-system exception

The codemap records two invariants this comp pushes against:

> **No gradients.** Depth comes from tone (ink vs orangeLight vs cream), not blending.

> **The display face has ONE weight and no lowercase.**

**Resolution:** the gradient exception is granted, scoped to this one screen, with the
new colors added as real tokens in `constants/design.ts`. The type exception is
**declined** — the wordmark stays Bebas Neue. It therefore renders as `THIRDSPACE` in
caps rather than the comp's mixed-case serif. This is a deliberate, accepted departure
from the reference; no fourth font family is introduced.

Every other screen keeps the flat-tone rule.

## Visual foundation

### New palette tokens

Added to `constants/design.ts`, grouped and commented as welcome-only:

| Token | Value | Use |
|---|---|---|
| `welcomeSkyTop` | `#EE9B62` | Gradient stop 1 — deeper than `orangeDeep` |
| `welcomeSkyBottom` | `#FBE6CB` | Gradient stop 2 — settles toward cream |
| `welcomeGlowWarm` | `rgba(255,214,170,0.10)` | Upper glow blobs |
| `welcomeGlowClay` | `rgba(230,124,74,0.10)` | Lower glow blob, warmer |
| `welcomeSpark` | `rgba(255,255,255,0.85)` | Drifting light dots |

`palette.rule` is already an `rgba()` string, so rgba values in the palette are
established precedent.

### The white-spark carve-out

`welcomeSpark` is white, and the system says *"white never appears on orange (1.83:1)."*
That rule governs **text legibility**. These are 3px decorative dots carrying no
information, so WCAG contrast does not apply. The token carries a comment stating this,
so it does not read as an oversight to be "fixed".

`design.test.ts` asserts white-vs-orange *contrast math* and bans three specific hexes;
neither assertion is affected.

### Glow rendering

No `react-native-svg` (would force a native rebuild), no `expo-blur`, and
`expo-linear-gradient` is linear-only. Each blob is therefore **six concentric `View`s**
of increasing radius and constant low opacity, faking radial falloff. This keeps the
colors tokenized and lets each blob drift independently. Accepted cost: slight banding
versus a true blur.

## Components

Three units, each independently understandable:

| Unit | Responsibility | Depends on |
|---|---|---|
| `components/WelcomeBackdrop.tsx` | Gradient, three blob stacks, five sparks. Owns its looping ambient drift. Knows nothing about onboarding. | tokens, `expo-linear-gradient` |
| `hooks/useWelcomeReveal.ts` | The one-shot reveal timeline. Returns four `Animated.Value`s plus `skip()`. | `AccessibilityInfo` |
| `app/(auth)/onboarding.tsx` | Composes both; keeps its existing permissions logic unchanged. | both |

`WelcomeBackdrop` takes a single `reduceMotion` prop.

## Animation timeline

| t (ms) | Element | Motion | Duration |
|---|---|---|---|
| 0 | Backdrop | visible immediately; ambient drift starts | loops |
| 150 | Logo mark | fade + scale 0.94→1 | 480 |
| 330 | `THIRDSPACE` | fade + rise 14px | 460 |
| 510 | Tagline | fade + rise 10px | 460 |
| 1500 | Get Started sheet | fade + float up 48px, ease-out | 620 |

Text settles at ~970ms; the welcome holds ~530ms before the sheet arrives, so the pause
reads as intentional rather than as a stall. Fully interactive at ~2.1s.

Ambient loop: blobs drift ±10px over ~9s on offset phases; sparks pulse opacity
0.35→0.85 over 4–6s.

All animated properties are opacity and transform only, so `useNativeDriver: true`
throughout and the work stays on the compositor.

Timing constants live in a `motion` token group in `design.ts`, not as magic numbers in
the component.

## Tagline copy and treatment

`YOUR THIRD SPACE AWAITS YOU...` — **with the trailing ellipsis**, per the comp.

Rendered through `Meta role="eyebrow"` (IBM Plex Mono, uppercase, `letterSpacing: 1.4`),
which is exactly the comp's treatment: mono, caps, wide tracking. The `eyebrow` token is
10px, too small for a hero line, so the welcome screen overrides size locally to 13px /
18px line height while keeping the face, caps and tracking from the token. Local size
override on a shared role is already the pattern in this file — `styles.wordmark`
overrides `screenTitle`'s 34px to 37px.

**Tone is `ink`, not `inkSoft`.** The comp's tagline looks muted, but `inkSoft` measures
**3.78:1** against `welcomeSkyTop` — below AA. `ink` is 7.19:1 on the top stop and
13.09:1 on the bottom, so it is the only palette entry that survives the whole gradient.
The mono face at 13px with 1.4 tracking already reads as secondary without dropping the
tone. The measured number is recorded at the token so this is not "softened" later.

**This supersedes the tagline added earlier in this session**, which used
`Display role="cardTitle"` in sentence case with no ellipsis. That was written before the
comp was available. The Display/Bebas version is replaced by the Meta/mono version above;
the mockup is the authority.

The Discover dashboard tagline (`app/(app)/(attender)/index.tsx`) is a separate surface
and keeps its `Display role="screenTitle"` treatment — it is a screen title, not a
wordmark subtitle. Out of scope here.

## Interaction

- **Tap anywhere during the intro skips to the revealed state.** The animation is a
  first-impression flourish, never a gate. Onboarding is the documented home base for
  any account that is not fully set up, so users return here repeatedly; a mandatory
  2.1s wait on every visit would be a recurring tax.
- **Reduced motion** (`AccessibilityInfo.isReduceMotionEnabled()`): every value starts at
  its final state and no loop is started. Not a faster animation — no animation.

## Edge cases

- **Unmount mid-timeline** — timers cleared *and* `Animated.loop` handles stopped. A
  running loop holds a reference and keeps ticking otherwise (cf. `977b150`, "stop
  leaking timers").
- **Reduced-motion probe race** — `isReduceMotionEnabled()` is async; resolution is
  guarded by a `mounted` flag so a fast unmount cannot set state on a dead component.
  Same discipline as `f9a92d6` and `39af2cd`.
- **Repeat visits** — the intro replays on every mount. Tap-to-skip is the mitigation,
  rather than persisting a "seen" flag, which would put an AsyncStorage read in front of
  first paint.
- **Fonts** — `app/_layout.tsx` already gates render on font load, so there is no flash
  of unstyled wordmark.
- **`skip()` is idempotent** — safe to fire mid-timeline or after completion.

## Testing

Follows the existing convention: hooks and components are tested, routes are not.

`__tests__/hooks/useWelcomeReveal.test.tsx`:

- all four values start at 0 under normal motion
- reduced motion starts every value at 1 with **no timers scheduled**
- `skip()` drives all four to 1 and is idempotent
- unmount leaves no pending timers

**What is deliberately not asserted in jest, and why.** With `useNativeDriver: true` the
JS-side `Animated.Value` is not updated while the animation runs — the driver owns it
natively. A test that advanced fake timers and read `__getValue()` mid-flight would be
asserting the behaviour of the jest mock, not the app. Interpolated motion is verified on
device instead.

The *ordering* of the timeline is still guarded deterministically, in the token test:
`motion.sheetDelay > motion.taglineDelay + motion.taglineIn` proves the sheet cannot
arrive before the tagline has settled, regardless of driver.

`__tests__/components/WelcomeBackdrop.test.tsx` — renders without crashing;
`reduceMotion` starts no loop.

Existing `tokens.test.ts` and `design.test.ts` pass unchanged: the new tokens are
additive and the type scale is untouched. New files must stay hex-free —
`tokens.test.ts` scans `app/` and `components/` with an empty allowlist.

## Explicitly out of scope

- Changing the permissions flow, `resolveAuthRoute`, or any other screen
- A `seen` flag persisted to AsyncStorage
- Adding a fourth font family
- Applying the gradient anywhere beyond this screen
