# Bebas Neue Display Face — Design Spec

**Date:** 2026-07-29
**Status:** Approved, ready for planning

## Goal

Replace Antonio with Bebas Neue as the app's display face, everywhere. Antonio is removed from the dependency tree entirely.

## Why this is not a one-line swap

Antonio ships two weights (600 SemiBold, 700 Bold) and has real lowercase. Bebas Neue ships **one weight (400 Regular)** and is **caps-only**. Two consequences follow, and both were decided deliberately:

1. **Hierarchy can no longer come from weight.** With a single weight, size is the only lever left inside the display face.
2. **Every display string renders uppercase**, including member names (`SARAH, 27`) and event titles. This was chosen knowingly — the all-caps editorial look is the intent, not a side effect to be worked around.

## Non-goals

- The body face (Inter) and meta face (IBM Plex Mono) are untouched.
- The palette, spacing, radius and tab-bar tokens are untouched.
- No screen layouts change. Only the type scale is retuned.

## Package

| Out | In |
|-----|-----|
| `@expo-google-fonts/antonio` | `@expo-google-fonts/bebas-neue@0.4.1` |

`@expo-google-fonts/*` packages ship TTFs loaded at runtime by `expo-font`. **No native rebuild is required** — this works in Expo Go and in existing dev/EAS builds.

## Token change

`constants/design.ts` currently exposes two display keys:

```ts
displaySemi: 'Antonio_600SemiBold',
displayBold: 'Antonio_700Bold',
```

Bebas has one weight, so two keys pointing at the same string would be a lie about the system. They collapse into a single key:

```ts
display: 'BebasNeue_400Regular',
```

Verified: `font.displaySemi` and `font.displayBold` are referenced **only** inside `constants/design.ts`'s own `type` map. Nothing under `app/` or `components/` reads them directly, so the collapse is contained to one file.

## Retuned type scale

Bebas 400 is lighter and considerably narrower than Antonio 700. A family swap at identical sizes would visibly shrink every heading. All-caps settings also need positive tracking to avoid looking cramped.

| Role | Current (Antonio) | New (Bebas) |
|------|-------------------|-------------|
| `screenTitle` | 30 / 34, ls −0.2 | 34 / 36, ls 0.5 |
| `cardTitle` | 17 / 21, ls — | 19 / 22, ls 0.4 |
| `stubDay` | 22 / 24, uppercase | 24 / 26, ls 0.5, uppercase |
| `tabLabel` | 11 / 13, ls 0.3 | 12 / 14, ls 0.8 |

`stubDay` keeps its explicit `textTransform: 'uppercase'`. It is now redundant (the face has no lowercase) but it records intent and survives a future face change. This also keeps the codemap's rule intact: uppercase is a token, never an inline `textTransform`.

## Files

**Modified**

| File | Change |
|------|--------|
| `package.json` | swap the font package |
| `app/_layout.tsx:5,40` | swap import + `useFonts` entries |
| `constants/design.ts:31-39` | `displaySemi`/`displayBold` → `display` |
| `constants/design.ts:55-58` | retuned display roles |
| `components/ui/Text.tsx:37` | doc comment: "Antonio" → "Bebas Neue" |
| `__tests__/constants/design.test.ts:55` | `/^Antonio_/` → `/^BebasNeue_/` |
| `__tests__/constants/design.test.ts:63-66` | rewrite the stale comment (see below) |
| `__tests__/components/ui/Text.test.tsx:14` | test name + family assertion |

No new files. No files deleted.

## Testing

The existing guard at `design.test.ts:50-58` — "binds each role to exactly one of the three faces" — keeps working with the regex updated, and still catches a display role accidentally assigned a body family.

**One test comment becomes false and must be rewritten.** `design.test.ts:63-64` currently reads:

> Sentence case for names and titles — Antonio has real weights, so hierarchy does not need shouting.

The assertion itself (`screenTitle.textTransform` is `undefined`) still passes and should stay — the caps now come from the face, not from a token. The comment gets replaced with the real reason: the display face is caps-only, so the token does not need to declare uppercase, and declaring it would imply a transform that isn't doing any work.

**One new assertion**, guarding the property that makes this system coherent: all four display roles resolve to the *same* font family. Bebas has one weight, so any future edit reintroducing a second display family or a fake weight is a mistake, and the test should say so.

## Verification

- `npx tsc --noEmit` clean
- `npx jest` green (currently 48 suites / 302 tests)
- Manual: the four display roles read correctly at size on a device — Discover title, an event card title, a date stub, the tab bar. Tab labels at 12px in a condensed caps face are the highest-risk spot for legibility and should be checked first.
