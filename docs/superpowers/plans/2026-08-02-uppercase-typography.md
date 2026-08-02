# All-Caps Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every string the app renders — chrome and user-written content alike, including text being typed into a field — displays uppercase.

**Architecture:** One token-table edit. `constants/design.ts` exports `type`, a `Record<TypeRole, TypeStyle>` consumed by the `Display`/`Body`/`Meta` primitives AND spread directly into every `TextInput` style in the app. Adding `textTransform: 'uppercase'` to all ten roles therefore covers rendered copy and typing in one change. One correctness exception is added at `FormInput` so revealed passwords are not misrepresented.

**Tech Stack:** React Native 0.81 / Expo SDK 54, TypeScript 5.7, Jest (jest-expo) + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-08-02-uppercase-typography-design.md`

## Global Constraints

- Run all commands from `thirdspace-app/`.
- `constants/design.ts` is the only file in which a color may be written. This plan adds no colors.
- No literal hex under `app/` or `components/` — guarded by `__tests__/constants/tokens.test.ts`.
- `textTransform` is display-only. No task in this plan may change a stored value, a Firestore write, or an `autoCapitalize` prop.
- Body-role letterSpacing values are exactly: `bodyLg` 0.3, `body` 0.3, `bodySm` 0.4, `button` 0.4.
- Existing role sizes, line heights, font families, and colors are unchanged.
- Full suite baseline before this plan: 51 suites / 338 tests passing.

---

### Task 1: Uppercase every type role

**Files:**
- Modify: `thirdspace-app/constants/design.ts:80-94` (the `type` record)
- Test: `thirdspace-app/__tests__/constants/design.test.ts:60-68` (replace the existing `reserves uppercase for eyebrows, chips and the date stub` test)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `type` (exported as `type` from `constants/design.ts`, aliased `typeScale` at call sites) where every value satisfies `textTransform === 'uppercase'`. Task 2 relies on `typeScale.bodyLg.textTransform === 'uppercase'` being the inherited default that its carve-out overrides.

- [ ] **Step 1: Replace the contradicting test with the new invariant**

In `__tests__/constants/design.test.ts`, replace the whole `it('reserves uppercase for eyebrows, chips and the date stub', ...)` block (lines 60-68) with:

```ts
  it('uppercases every role — caps are app-wide by intent', () => {
    // Supersedes the earlier rule that reserved the token for eyebrow/stubDay.
    // Display roles are caps regardless (Bebas Neue has no lowercase) but still
    // carry the token, because under this design caps are a deliberate choice
    // everywhere rather than a font limitation in some places.
    // See docs/superpowers/specs/2026-08-02-uppercase-typography-design.md
    for (const [role, style] of Object.entries(typeScale)) {
      expect([role, style.textTransform]).toEqual([role, 'uppercase'])
    }
  })

  it('tracks the body roles out, since uppercase Inter sets tight', () => {
    for (const role of ['bodyLg', 'body', 'bodySm', 'button'] as const) {
      expect(typeScale[role].letterSpacing).toBeGreaterThan(0)
    }
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/constants/design.test.ts -t "uppercases every role"`

Expected: FAIL. The first mismatching role reports `["screenTitle", undefined]` against `["screenTitle", "uppercase"]`. (The `[role, value]` array form is what puts the failing role name in the diff — a bare `expect(style.textTransform).toBe(...)` would only say `undefined !== "uppercase"` without naming which role broke.)

- [ ] **Step 3: Add the token to all ten roles**

In `constants/design.ts`, replace the `type` record (lines 80-94) with:

```ts
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
```

- [ ] **Step 4: Run the design tests to verify they pass**

Run: `npx jest __tests__/constants/design.test.ts`

Expected: PASS, all tests in the file. The pre-existing `binds each role to exactly one of the three faces`, `gives every role a line height at least its font size`, `resolves every display role to one family`, and `gives every display role a line box the caps face can actually fit in` tests must still pass — none of the families, sizes, or line heights changed.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/constants/design.ts thirdspace-app/__tests__/constants/design.test.ts
git commit -m "feat: uppercase every type role

Caps become app-wide rather than reserved for eyebrow/stubDay. Body roles
gain tracking because uppercase Inter sets tighter than mixed case. The
design.test.ts assertion that pinned the old rule is inverted, not deleted."
```

---

### Task 2: Keep revealed passwords in their real casing

**Files:**
- Modify: `thirdspace-app/components/FormInput.tsx:20-30` (the `TextInput`) and `:50-58` (the `input` style block)
- Test: `thirdspace-app/__tests__/components/FormInput.test.tsx` (create if absent; if it exists, append the two tests to it)

**Interfaces:**
- Consumes: `typeScale.bodyLg.textTransform === 'uppercase'` from Task 1 — that inherited value is what the plain-field assertion below reads, and what the password branch overrides.
- Produces: nothing later tasks depend on.

**Why:** `FormInput` renders a Show/Hide toggle when `secureTextEntry` is set (`FormInput.tsx:31-39`). Its `TextInput` spreads `typeScale.bodyLg`, so after Task 1 a user whose password is `hunter2` taps "Show" and reads `HUNTER2` — the field misrepresenting the credential it holds. This is a correctness carve-out, and the only one in the app.

- [ ] **Step 1: Write the failing tests**

Check whether `thirdspace-app/__tests__/components/FormInput.test.tsx` already exists (`ls thirdspace-app/__tests__/components/`). If it does, append only the `describe` block below to it and reuse its existing imports and `flat` helper. If it does not, create the file with this full content:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { FormInput } from '../../components/FormInput'
import { type as typeScale } from '../../constants/design'

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : ((style ?? {}) as Record<string, unknown>)
}

describe('FormInput casing', () => {
  it('uppercases a plain field like the rest of the app', () => {
    const { getByDisplayValue } = render(
      <FormInput label="Display name" value="ada lovelace" onChangeText={() => {}} />
    )
    expect(flat(getByDisplayValue('ada lovelace').props.style).textTransform).toBe('uppercase')
  })

  it('leaves a password field in its real casing', () => {
    // The Show toggle reveals this field. Uppercasing it would display HUNTER2
    // for a password that is actually hunter2 — the field lying about the
    // credential it holds. Do not "simplify" this override away.
    const { getByDisplayValue } = render(
      <FormInput label="Password" secureTextEntry value="hunter2" onChangeText={() => {}} />
    )
    expect(flat(getByDisplayValue('hunter2').props.style).textTransform).toBe('none')
    // And the exception is genuinely an override, not the global default.
    expect(typeScale.bodyLg.textTransform).toBe('uppercase')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest __tests__/components/FormInput.test.tsx`

Expected: the plain-field test PASSES (it inherits Task 1's token), the password test FAILS with `expected "none", received "uppercase"`. One pass and one fail here is the correct result — it proves the password field is currently inheriting caps, which is the bug this task fixes.

- [ ] **Step 3: Add the password override**

In `components/FormInput.tsx`, add `styles.inputSecure` to the `TextInput` style array when the field is a password. Replace the `style={[...]}` prop (lines 21-25) with:

```tsx
          style={[
            styles.input,
            error ? styles.inputError : styles.inputNormal,
            prefix ? styles.inputWithPrefix : null,
            secureTextEntry ? styles.inputSecure : null,
          ]}
```

Then add the style, immediately after `inputNormal` / `inputError` in the `StyleSheet.create` block:

```ts
  /**
   * The one place in the app that is not uppercase. This field can be revealed
   * by the Show toggle, and a password shown as HUNTER2 when it is really
   * hunter2 misrepresents the credential. Correctness, not style.
   */
  inputSecure: { textTransform: 'none' },
```

Note: the override keys off the `secureTextEntry` **prop**, not the `hidden` state. The field must stay in real casing whether or not it is currently revealed — `hidden` flips when the user taps Show, and keying off it would make the text jump between cases on tap.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest __tests__/components/FormInput.test.tsx`

Expected: PASS, both tests.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/components/FormInput.tsx thirdspace-app/__tests__/components/FormInput.test.tsx
git commit -m "fix: keep revealed passwords in their real casing

FormInput's TextInput spreads typeScale.bodyLg, so app-wide caps would make
the Show toggle display HUNTER2 for a password that is actually hunter2.
Keyed off the secureTextEntry prop rather than the hidden state so the text
does not change case when the user taps Show."
```

---

### Task 3: Broaden the text-primitive coverage to one role per face

**Files:**
- Modify: `thirdspace-app/__tests__/components/ui/Text.test.tsx:36-39` (replace the single eyebrow assertion)

**Interfaces:**
- Consumes: `Display`, `Body`, `Meta` from `components/ui/Text.tsx` (unchanged by this plan) and the Task 1 token values.
- Produces: nothing later tasks depend on.

**Why:** the existing test asserts only that `eyebrow` uppercases. That was the correct scope when `eyebrow` was one of two exceptions; now that caps are universal, a per-face assertion is what actually catches a primitive that stops forwarding the token.

- [ ] **Step 1: Replace the eyebrow-only test**

In `__tests__/components/ui/Text.test.tsx`, replace the `it('uppercases the eyebrow role via the token, not the caller', ...)` block (lines 36-39) with:

```tsx
  it('uppercases through every face via the token, not the caller', () => {
    // Callers pass sentence case; the token does the transforming. If a primitive
    // stopped forwarding typeScale, these would go quiet rather than fail loudly,
    // so there is one assertion per face.
    const display = render(<Display role="cardTitle">Ceramics night</Display>)
    const body = render(<Body role="bodyLg">Do exercise</Body>)
    const meta = render(<Meta role="eyebrow">Send announcement</Meta>)

    expect(flat(display.getByText('Ceramics night').props.style).textTransform).toBe('uppercase')
    expect(flat(body.getByText('Do exercise').props.style).textTransform).toBe('uppercase')
    expect(flat(meta.getByText('Send announcement').props.style).textTransform).toBe('uppercase')
  })

  it('does not alter the string it renders — caps are display-only', () => {
    // getByText matches the ORIGINAL casing. This is what keeps Firestore values
    // and the accessibility tree in the casing the user actually typed.
    const { getByText } = render(<Body>Loves pottery and bad coffee</Body>)
    expect(getByText('Loves pottery and bad coffee')).toBeTruthy()
  })
```

- [ ] **Step 2: Run the file to verify it passes**

Run: `npx jest __tests__/components/ui/Text.test.tsx`

Expected: PASS, all tests. These assert behavior Task 1 already delivered, so there is no red phase here — the value is regression coverage, and if either fails it means Task 1 was applied incompletely.

- [ ] **Step 3: Commit**

```bash
git add thirdspace-app/__tests__/components/ui/Text.test.tsx
git commit -m "test: assert caps through every text face, and that casing is display-only"
```

---

### Task 4: Correct the codemap and verify the whole suite

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md` (the Design System section — the line reading "Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`.")

**Interfaces:**
- Consumes: the completed Tasks 1-3.
- Produces: nothing.

- [ ] **Step 1: Fix the stale codemap claim**

In `docs/CODEMAPS/thirdspace-codemap.md`, find the Design System bullet:

```
- **Fonts** — Bebas Neue 400 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
  Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`.
```

Replace those two lines with:

```
- **Fonts** — Bebas Neue 400 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
- **Every type role is uppercase, app-wide** — chrome and user-written content alike,
  including text being typed into a field. It is a token on all ten roles in
  `constants/design.ts`, never an inline `textTransform`. The transform is
  display-only: stored values and the accessibility tree keep the casing the user
  typed, so backing caps off long-form copy later is a one-line change per role.
  The single exception is `FormInput`'s password field, which sets
  `textTransform: 'none'` so the Show toggle cannot misrepresent a credential.
  See `docs/superpowers/specs/2026-08-02-uppercase-typography-design.md`.
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: clean, no output. `TypeStyle.textTransform` is already typed `'uppercase'` optional, and `inputSecure`'s `'none'` is a valid `TextStyle` value, so no type changes are needed.

- [ ] **Step 3: Run the full suite**

Run: `npx jest`

Expected: all suites pass. Baseline was 51 suites / 338 tests; this plan replaces 1 test, adds 3, and adds 1 suite if `FormInput.test.tsx` did not already exist. If any *other* suite fails, do not adjust it to match — a failure elsewhere means a component asserts casing in a way this design did not anticipate, and that is a finding to report, not a test to edit.

- [ ] **Step 4: Commit**

```bash
git add docs/CODEMAPS/thirdspace-codemap.md
git commit -m "docs: record app-wide uppercase in the codemap

Replaces the stale claim that uppercase is reserved for eyebrow/stubDay."
```

---

## Verification

After Task 4, the following must all hold:

- `npx tsc --noEmit` clean.
- `npx jest` green, with no suite edited to accommodate the change other than the two named in Tasks 1 and 3.
- Every role in `constants/design.ts` carries `textTransform: 'uppercase'`.
- `FormInput` with `secureTextEntry` resolves to `textTransform: 'none'`.
- No Firestore write, stored value, or `autoCapitalize` prop changed anywhere in the diff. Confirm with `git diff main...HEAD -- thirdspace-app/services/ thirdspace-app/hooks/` returning empty.

### Manual device check (not automatable)

`textTransform` on `TextInput` renders reliably on iOS; on Android it has historically
interacted with the input-method composition buffer on some keyboards. Before merging,
type a lowercase message into the chat composer on an Android device and confirm the
text displays caps, the caret tracks correctly, and backspace deletes one character at
a time. If it misbehaves on Android, the fallback is to drop `textTransform` from the
`TextInput` styles only and keep it on rendered copy — record that as a follow-up
rather than reverting the token change.
