# Bebas Neue Display Face Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Antonio with Bebas Neue as the app's display face everywhere, removing Antonio from the dependency tree.

**Architecture:** Bebas Neue has one weight (400) and no lowercase, so the two display token keys in `constants/design.ts` collapse into one and the four display roles are retuned to compensate for a lighter, narrower, all-caps face. Nothing outside `constants/design.ts`, `app/_layout.tsx`, `components/ui/Text.tsx` and two test files changes — verified: `font.displaySemi` and `font.displayBold` are referenced nowhere else in the repo.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, `expo-font`, `@expo-google-fonts/bebas-neue@0.4.1`, Jest via jest-expo, `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-07-29-bebas-neue-display-face-design.md`

## Global Constraints

- **Run every command from `thirdspace-app/`.**
- **Every task ends green:** `npx tsc --noEmit` and `npx jest` both pass before committing.
- **No literal hex under `app/` or `components/`.** `__tests__/constants/tokens.test.ts` has an empty allowlist. Colors come from `constants/design.ts`.
- **`constants/design.ts` is the only file in which a color may be written.** This plan does not add or change a single color.
- **No native rebuild is required.** `@expo-google-fonts/*` packages ship TTFs loaded at runtime by `expo-font`. Do not add anything to `app.json`.
- **Commit style:** conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). **No `Co-Authored-By` trailer** — attribution is disabled globally for this repo, and no existing commit carries one.
- **Uppercase is a token, never an inline `textTransform`** in a screen or component. That rule survives this change.
- **Do not touch the body face (Inter) or the meta face (IBM Plex Mono).**

---

## File Structure

**No new files.**

**Modified files**

| File | Change |
|------|--------|
| `package.json` | drop `@expo-google-fonts/antonio`, add `@expo-google-fonts/bebas-neue` |
| `app/_layout.tsx:5,40` | swap the import and the `useFonts` entries |
| `constants/design.ts:31-39` | `displaySemi` + `displayBold` → a single `display` key |
| `constants/design.ts:55-58` | retuned display roles |
| `components/ui/Text.tsx:37` | doc comment names the new face |
| `__tests__/constants/design.test.ts:55` | family regex |
| `__tests__/constants/design.test.ts:60-67` | stale rationale comment + new single-family guard |
| `__tests__/components/ui/Text.test.tsx:14-19` | test name + family assertion |
| `docs/CODEMAPS/thirdspace-codemap.md` | design-system section |

---

## Task 1: Replace Antonio with Bebas Neue

The app must never be in a state where `design.ts` names a family that `_layout.tsx` has not loaded — text would silently fall back to the system font. Package, loader and token therefore move together in one task.

**Files:**
- Modify: `thirdspace-app/package.json`
- Modify: `thirdspace-app/app/_layout.tsx:5,39-43`
- Modify: `thirdspace-app/constants/design.ts:31-39,55-58`
- Modify: `thirdspace-app/components/ui/Text.tsx:37`
- Modify: `thirdspace-app/__tests__/constants/design.test.ts:55`
- Modify: `thirdspace-app/__tests__/components/ui/Text.test.tsx:14-19`

**Interfaces:**
- Consumes: nothing.
- Produces: `font.display: 'BebasNeue_400Regular'` — the single display family key, consumed by Task 2's retuned scale. `font.displaySemi` and `font.displayBold` cease to exist.

- [ ] **Step 1: Write the failing test**

In `__tests__/constants/design.test.ts`, change line 55 from `/^Antonio_/` to:

```ts
    for (const role of display) expect(typeScale[role].fontFamily).toMatch(/^BebasNeue_/)
```

In `__tests__/components/ui/Text.test.tsx`, replace the whole first test (lines 14-19) with:

```tsx
  it('renders Display in Bebas Neue at the card-title role by default', () => {
    const { getByText } = render(<Display>Ceramics Night</Display>)
    const style = flat(getByText('Ceramics Night').props.style)
    expect(style.fontFamily).toBe(typeScale.cardTitle.fontFamily)
    expect(style.fontFamily).toMatch(/^BebasNeue_/)
    expect(style.color).toBe(palette.ink)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/constants/design.test.ts __tests__/components/ui/Text.test.tsx`
Expected: FAIL — both report `"Antonio_700Bold"` does not match `/^BebasNeue_/`.

- [ ] **Step 3: Swap the package**

```bash
npm uninstall @expo-google-fonts/antonio
npx expo install @expo-google-fonts/bebas-neue
```

- [ ] **Step 4: Collapse the display token**

In `constants/design.ts`, replace the `font` object (lines 31-39) with:

```ts
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
```

- [ ] **Step 5: Point the four display roles at the new key**

In `constants/design.ts`, replace lines 55-58 with (sizes unchanged for now — Task 2 retunes them):

```ts
  screenTitle: { fontFamily: font.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.2 },
  cardTitle:   { fontFamily: font.display, fontSize: 17, lineHeight: 21 },
  stubDay:     { fontFamily: font.display, fontSize: 22, lineHeight: 24, textTransform: 'uppercase' },
  tabLabel:    { fontFamily: font.display, fontSize: 11, lineHeight: 13, letterSpacing: 0.3 },
```

- [ ] **Step 6: Load the new font**

In `app/_layout.tsx`, replace line 5:

```tsx
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
```

and replace line 40 inside `useFonts`:

```tsx
    BebasNeue_400Regular,
```

- [ ] **Step 7: Update the primitive's doc comment**

In `components/ui/Text.tsx`, replace line 37:

```tsx
/** Bebas Neue. Screen titles, event names, date stubs, tab labels. Renders all-caps — the face has no lowercase. */
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest __tests__/constants/design.test.ts __tests__/components/ui/Text.test.tsx`
Expected: PASS

- [ ] **Step 9: Confirm Antonio is gone**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean, all suites pass (48 suites / 302 tests before this change).

Run: `grep -ri "antonio" --include=*.ts --include=*.tsx --include=*.json app components constants hooks services utils __tests__ package.json`
Expected: **no output.** Any hit is a leftover reference and must be fixed before committing.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json app/_layout.tsx constants/design.ts components/ui/Text.tsx __tests__/constants/design.test.ts __tests__/components/ui/Text.test.tsx
git commit -F - <<'MSG'
feat: replace the Antonio display face with Bebas Neue

Bebas Neue ships a single 400 weight, so the displaySemi/displayBold pair
collapses to one `display` key — keeping two keys pointing at the same file
would imply a weight axis the face does not have. Sizes are unchanged here;
they are retuned separately. No native rebuild: expo-font loads these TTFs
at runtime.
MSG
```

---

## Task 2: Retune the display scale for a single-weight caps face

Bebas 400 is lighter and considerably narrower than Antonio 700. Swapping the family at identical sizes visibly shrinks every heading, and all-caps settings need positive tracking to stop looking cramped.

**Files:**
- Modify: `thirdspace-app/constants/design.ts:55-58`
- Modify: `thirdspace-app/__tests__/constants/design.test.ts:60-67`

**Interfaces:**
- Consumes: `font.display` from Task 1.
- Produces: no new exports. `typeScale.screenTitle.fontSize` becomes `34`, `cardTitle` `19`, `stubDay` `24`, `tabLabel` `12`.

- [ ] **Step 1: Write the failing test**

In `__tests__/constants/design.test.ts`, append this test inside the existing `describe('type scale', ...)` block:

```ts
  it('resolves every display role to one family — the face has a single weight', () => {
    // Bebas Neue has no weight axis. Two display families, or a second Bebas file
    // pretending to be a weight, would be a mistake; this is the guard that says so.
    const display = ['screenTitle', 'cardTitle', 'stubDay', 'tabLabel'] as const
    const families = new Set(display.map((role) => typeScale[role].fontFamily))
    expect(families.size).toBe(1)
  })

  it('sizes the display roles for a narrow caps face', () => {
    // A straight family swap at Antonio's sizes reads visibly smaller, because
    // Bebas 400 is lighter and narrower than Antonio 700.
    expect(typeScale.screenTitle.fontSize).toBe(34)
    expect(typeScale.cardTitle.fontSize).toBe(19)
    expect(typeScale.stubDay.fontSize).toBe(24)
    expect(typeScale.tabLabel.fontSize).toBe(12)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/constants/design.test.ts -t "sizes the display roles"`
Expected: FAIL — `Expected: 34, Received: 30`.

(The single-family test passes already; it is a regression guard, not a driver.)

- [ ] **Step 3: Retune the scale**

In `constants/design.ts`, replace lines 55-58 with:

```ts
  screenTitle: { fontFamily: font.display, fontSize: 34, lineHeight: 36, letterSpacing: 0.5 },
  cardTitle:   { fontFamily: font.display, fontSize: 19, lineHeight: 22, letterSpacing: 0.4 },
  stubDay:     { fontFamily: font.display, fontSize: 24, lineHeight: 26, letterSpacing: 0.5, textTransform: 'uppercase' },
  tabLabel:    { fontFamily: font.display, fontSize: 12, lineHeight: 14, letterSpacing: 0.8 },
```

`stubDay` keeps its explicit `textTransform: 'uppercase'`. It is now redundant — the face has no lowercase — but it records intent and survives a future face change, and it keeps the codemap's "uppercase is a token" rule intact.

Line heights are deliberately tight relative to size: all-caps text has no descenders, so Antonio's ratios would leave the display roles looking loose.

- [ ] **Step 4: Rewrite the stale rationale comment**

In `__tests__/constants/design.test.ts`, the test at lines 60-67 justifies its assertion with reasoning that is no longer true. Replace lines 63-64:

```ts
    // The display face is caps-only, so screen titles and card titles must NOT declare
    // textTransform — the caps come from the face. Declaring it would imply a transform
    // that is doing no work, and would silently mislead anyone changing the face later.
```

The two assertions below it (`screenTitle.textTransform` and `cardTitle.textTransform` are `undefined`) are unchanged and still correct.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: PASS, including the pre-existing "gives every role a line height at least its font size" test — verify it did not break, since the new line heights are tighter.

- [ ] **Step 6: Full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean, all suites pass.

- [ ] **Step 7: Commit**

```bash
git add constants/design.ts __tests__/constants/design.test.ts
git commit -F - <<'MSG'
feat: retune the display scale for a single-weight caps face

Bebas 400 is lighter and narrower than Antonio 700, so the same numbers read
visibly smaller; all-caps also needs positive tracking to stop looking
cramped. Adds a guard that all four display roles resolve to one family,
since the face has no weight axis to spend. Rewrites the test comment that
justified sentence-case titles by Antonio having real weights - the
assertion still holds, but that reasoning is dead.
MSG
```

---

## Task 3: Update the codemap

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`

**Interfaces:**
- Consumes: the finished token from Tasks 1-2.
- Produces: nothing consumed by code.

- [ ] **Step 1: Update the Design System section**

In `docs/CODEMAPS/thirdspace-codemap.md`, find the bullet in the Design System section that reads:

```markdown
- **Fonts** — Antonio 600/700 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
  Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`.
```

Replace it with:

```markdown
- **Fonts** — Bebas Neue 400 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
  Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`.
- **The display face has ONE weight and no lowercase.** `font.display` is deliberately a
  single key — a second key pointing at the same file would imply a weight axis Bebas does
  not have. Hierarchy inside the display face comes from size alone, and every display
  string (screen titles, event names, member names, tab labels) renders uppercase. That is
  the intent, not a bug. `__tests__/constants/design.test.ts` guards both properties.
```

Note the section heading and the spec paths above it still say "antonio-ticket-redesign" — those name the historical redesign spec and its file on disk. **Leave them alone**; renaming them would break the links.

- [ ] **Step 2: Commit**

```bash
git add ../docs/CODEMAPS/thirdspace-codemap.md
git commit -F - <<'MSG'
docs: record Bebas Neue as the display face in the codemap

Notes the two properties that constrain future edits: one weight, no
lowercase. Leaves the antonio-ticket-redesign spec paths untouched - they
name real files and are not stale.
MSG
```

---

## Manual verification (not automatable)

Run `npx expo start` and check on a device or simulator, in this order — most-likely-to-fail first:

1. **Tab bar labels.** 12px condensed caps is the smallest display setting in the app and the highest legibility risk. If DISCOVER / MY EVENTS / CHATS / PROFILE are cramped or clipped, `tabLabel` needs another point of size or tracking.
2. **Discover screen title.** "LET'S FIND YOUR THIRD SPACE" wraps in a `maxWidth: 200` container (`app/(app)/(attender)/index.tsx:161`). Confirm it still wraps to a sensible number of lines at 34px.
3. **A long event card title.** Confirm `numberOfLines` truncation still looks deliberate.
4. **A member profile.** Names now render as `SARAH, 27`. Confirm that reads as intended rather than as a bug.
5. **Date stub** on an event card.
