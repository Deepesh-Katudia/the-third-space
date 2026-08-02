# All-Caps Typography — Design

_2026-08-02. Supersedes the "uppercase is reserved for `eyebrow` and `stubDay`" rule
established in `2026-07-29-bebas-neue-display-face-design.md`._

## Goal

Every string the app renders — chrome and user-written content alike — displays in
uppercase, including text the user is actively typing into a field.

## Why this is a one-file change

Two properties of the existing system make this a token edit rather than a sweep:

1. All rendered copy goes through `Display` / `Body` / `Meta` in
   `components/ui/Text.tsx`, which resolve their style from `type` in
   `constants/design.ts`. Raw `<Text>` survives in exactly three shapes — avatar
   initials (already caps via `utils/avatar.ts → initials()`), emoji, and the
   Google "G" in `AuthButton` — none of which have lowercase to transform.
2. Every `TextInput` in the app spreads a `typeScale.*` role into its own style
   (`FormInput`, the Discover search field, the chat composer, the announcement
   composer, and the bio fields on create-profile / edit-profile). They inherit the
   token change without being touched.

Applying the transform in the `Text.tsx` wrapper instead would miss all five
`TextInput` spreads, leaving typing in sentence case while the rendered result is
caps. The token table is the only layer that covers both.

## Scope

### Token change

All ten roles in `type` carry `textTransform: 'uppercase'`.

The four display roles already render caps because Bebas Neue ships no lowercase.
They still get the explicit token. Previously the token was withheld from
`screenTitle` / `cardTitle` precisely to mark the difference between "caps by
deliberate choice" and "caps because the face has no alternative". Under this design
every role is caps by deliberate choice, so that distinction no longer carries
meaning and the token is uniform.

Uppercased Inter sets tighter than mixed case at these sizes, so the four body roles
gain modest tracking:

| Role | Size | letterSpacing |
|------|------|---------------|
| `bodyLg` | 15 | 0.3 |
| `body` | 13 | 0.3 |
| `bodySm` | 11.5 | 0.4 |
| `button` | 16 | 0.4 |

The meta roles (`meta` 0.4, `eyebrow` 1.4) and display roles already carry tracking
and are unchanged on that axis.

### The one carve-out: password fields

`FormInput` renders a Show/Hide toggle when `secureTextEntry` is set. Its `TextInput`
spreads `typeScale.bodyLg`, so the token change would uppercase revealed passwords:
a user whose password is `hunter2` taps "Show" and reads `HUNTER2`. The field would
be misrepresenting the credential it holds.

Password inputs therefore set `textTransform: 'none'` explicitly. This is a
correctness exception, not an aesthetic one, and it is the only one.

Email fields are **not** excepted. They render caps like everything else; the stored
value is unaffected and Firebase Auth is case-insensitive on the address.

## Casing is display-only

React Native's `textTransform` is a render-time style. It does not modify the string
in the component tree, the value held in state, or the text handed to the platform
accessibility API. Three consequences worth stating because they are what make this
design safe:

- **Firestore is untouched.** Bios, messages, event titles and venue names keep the
  casing the user typed. No migration, no backfill.
- **Screen readers are untouched.** VoiceOver and TalkBack receive the original
  string, so they do not spell out short strings letter-by-letter the way they can
  with genuinely uppercased source text.
- **The decision is reversible.** Backing all-caps off long-form copy later means
  deleting `textTransform` from three or four roles.

## Known tradeoff

All-caps long-form copy — chat threads, event descriptions, bios — reads measurably
slower than mixed case, and the penalty is largest for dyslexic readers, because
uniform-height glyphs remove the word-shape cues that scanning depends on. This was
raised and the full-caps scope was chosen deliberately. It is recorded here so that
a future reader finds an accepted tradeoff rather than an oversight, and so the exit
path above is documented alongside it.

## Test changes

`__tests__/constants/design.test.ts` currently contains a test named
_"reserves uppercase for eyebrows, chips and the date stub"_ that asserts
`screenTitle.textTransform` and `cardTitle.textTransform` are `undefined`. That test
encodes the rule this design replaces, so it is rewritten — not deleted — to assert
the new invariant: every role in `type` carries `textTransform: 'uppercase'`, with a
comment recording that this is app-wide by intent.

New coverage:

- A `FormInput` test asserting a `secureTextEntry` field resolves to
  `textTransform: 'none'` while a plain field resolves to `'uppercase'`. This is the
  guard that keeps the password exception from being "simplified away" later.
- `__tests__/components/ui/Text.test.tsx` broadens its single eyebrow assertion to
  cover one role per face.

Everything else in the suite should pass untouched. `tokens.test.ts` polices literal
hex only and is unaffected.

## Documentation

`docs/CODEMAPS/thirdspace-codemap.md` states under the design system that
"Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`". The
parenthetical is now wrong and becomes: uppercase is a token on every role, applied
app-wide, with `FormInput`'s password field the single documented exception.

## Out of scope

- Changing stored data casing anywhere.
- `utils/avatar.ts` initials, emoji, and the `AuthButton` "G" — no lowercase to
  transform.
- Any font, color, size, or layout change. This design touches `textTransform` and
  `letterSpacing` only.
