# Antonio Ticket Redesign — Design

_Source comp: `docs/events-redesign-mockup.html` (Claude Design). Supersedes the orange/Poppins
system from `2026-06-22-thirdspace-design-phase1.md`._

## Problem

Two problems, one pass.

1. **The app does not look like the comp.** The shipped design is `#FF9F3D` accents on a `#F3F3F5`
   grey field with Poppins and five rotating pastel cards. The comp is a two-tone pastel orange
   field with cream ticket cards, a warm brown ink, and a condensed display face.
2. **Tokens do not govern anything.** The Poppins restyle wrote literal hex into all 37 route files
   and 22 components. `constants/theme.ts` is nominally the source of truth, but editing a token
   repaints nothing. A third restyle done the same way costs the same as this one.

Problem 2 is why this is sequenced token-layer-first rather than screen-by-screen.

## Decisions (locked)

- **Antonio**, not Anton. The comp renders three display candidates; the chosen face is
  `@expo-google-fonts/antonio` (weights 100–700), not the `Anton` column shown in the file.
- Poppins is removed entirely — all five `@expo-google-fonts/poppins` weights.
- Three faces, three roles: Antonio display / Inter body / IBM Plex Mono meta.
- Three comp accents are darkened to pass WCAG AA (see Palette). `ink` is unchanged.
- Ticket tear-notches appear on **event surfaces only**.
- Deep orange on browse screens; **cream on forms and chat threads**.
- `cardPalette` / `paletteFor` are deleted. Two-tone replaces per-card color.
- Screens consume tokens and primitives. A screen file may not contain a literal hex value.

## Type system

| Role | Face | Package | Weights | Use |
|------|------|---------|---------|-----|
| Display | Antonio | `@expo-google-fonts/antonio` | 600, 700 | Screen titles, event names, date-stub numerals, tab labels |
| Body | Inter | `@expo-google-fonts/inter` | 400, 500, 600 | Descriptions, locations, form fields, chat messages |
| Meta | IBM Plex Mono | `@expo-google-fonts/ibm-plex-mono` | 500, 600 | Timestamps, category/price chips, city chip, eyebrows |

Antonio carries real weights, so hierarchy comes from weight *and* size. The comp's
uppercase-everything treatment is therefore softened: **caps for eyebrows, chips, and the date
stub; sentence case at weight 700 for event names and screen titles.** Uppercase is a token
(`display.eyebrow`), never an ad-hoc `textTransform` in a screen.

## Palette

Comp values, with three corrections. Measured against WCAG 2.1 AA (4.5:1 body, 3:1 large):

```
cream        #FBF3E9   form + chat background
orange-deep  #F3B27A   browse screen background
orange-light #FCE3C0   ticket / card fill
ink          #2B2015   unchanged — 8.68:1 on deep, 12.79:1 on light
ink-soft     #584C3C   was #5C4F3F (4.33:1 on deep, under AA) → 4.56 deep / 6.72 light
clay         #853615   was #C4501F (2.54:1 on deep, fails) → 4.52 deep / 6.66 light
sage         #49513E   was #6E7A5E (2.49:1 on deep, fails) → 4.53 deep / 6.68 light
rule         rgba(43,32,21,0.20)
```

The uncorrected `clay` is used in the comp for the "Send announcement" line directly on the deep
orange field (2.54:1) and for 10px meta chips (3.74:1 on light — large-text-only, and these are not
large text). `sage` fails the same way on the meta accent. The corrections are the smallest
darkening that clears 4.5:1 on **both** orange tones, so one accent value works on any surface.

**White never appears on orange** — `#FFFFFF` on `orange-deep` is 1.83:1. The existing
"ink on orange, never white" invariant survives this redesign and its test moves over intact.

## Token layer (`constants/theme.ts`)

Replaced wholesale. New exports:

```ts
colors      // the palette above — no primary/primaryLight/canvas/shell/gold
type        // { display: {...}, body: {...}, meta: {...} } — fontFamily + size + weight + tracking
radius      // ticket: 14, chip: 20, sheet: 34, pill: 999, icon: 50%
space       // 4-point scale
rule        // dashed/solid divider colors
tabBar      // comp's flat bottom bar: orange-light fill, 1px ink rule, clay active
```

Removed: `gradients`, `cardPalette`, `paletteFor`, `floatingNav`, `shadow.float`, `ColorKey`.

The floating detached nav from the Poppins system is gone — the comp's tab bar is flat, flush to
the bottom edge, with a hairline top rule. `NAV_CLEARANCE` shrinks accordingly and stays exported
since every scrollable tab screen pads by it.

## Primitives (new, `components/ui/`)

Each is presentational, takes no data-layer dependency, and is unit-tested for token usage.

| Component | Responsibility |
|-----------|----------------|
| `Screen` | `tone="deep" \| "cream"` background, safe-area, nav clearance |
| `TicketCard` | Photo, dashed tear line, side notches, date stub, body slot |
| `Display` / `Body` / `Meta` | Text bound to one face; `role` prop selects size+weight |
| `Chip` | Meta chip with `/` dividers and optional sage accent |
| `CityChip` | Outlined pill ("NYC + Brooklyn") |
| `IconButton` | Circular ink button with orange-light glyph |

`TicketCard` owns the geometry that makes the comp read as a ticket: notch circles are painted in
the *screen's* background tone, so the component takes a `tone` prop and cannot be dropped onto a
mismatched background without the notches showing as wrong-colored dots.

## Surface rules

**Deep orange** (browse/list): `(hoster)/events`, `(hoster)/index`, `(attender)/index`,
`my-events`, `chats`, `connections`, `message-requests`, `badges`.

**Cream** (forms, threads, long text): `create-event`, `edit-profile`, `venue-setup`,
`change-password`, `settings`, `message-privacy`, `become-host`, `verify-identity`, `chat/[id]`,
all of `(auth)`.

**Ticket notches**: `EventCard`, `CompactEventRow`, `my-events` rows, `event/[id]` header only.
Chat rows, settings rows, member cards, and badge tiles use the two-tone palette and type without
notch geometry — a settings row shaped like a ticket stub reads as a rendering bug.

## Waves

Each wave ends green (`tsc --noEmit` + `jest`) and is committed separately.

1. **Tokens + primitives** — rewrite `theme.ts`, add `components/ui/`, swap font packages in
   `app/_layout.tsx`, rewrite `__tests__/components/contrast.test.ts` for the new palette, add
   `tokens.test.ts` with its starting allowlist. No screen changes; the app still renders
   Poppins-era styles against the old literals.
2. **Hoster tabs + Events** — `(hoster)/events.tsx`, `(hoster)/index.tsx`, `(hoster)/_layout.tsx`,
   `EventCard`. Deletes `PillTabButton` (see below). The one screen with a comp; fidelity
   checkpoint — run on device and compare against the file before continuing.
3. **Attender browse** — `(attender)/index`, `my-events`, `chats`, `(attender)/_layout.tsx`, plus
   `CompactEventRow`, `ChatRow`, `CategoryTabs`, `FilterSheet`, `filters`.
4. **Detail surfaces** — `event/[id]`, `chat/[id]`, `member/[uid]`, `guest-list/[id]`,
   `AttendeeAvatarStack`, `ChatBubble`, `RegistrationConfirmation`, `AnnouncementBanner`.
5. **Auth + onboarding** — all seven `(auth)` routes incl. `(auth)/_layout.tsx`, `AuthButton`,
   `FormInput`, `OnboardingSlide`, `PasswordStrengthMeter`, `Banner`.
6. **Remaining app** — `settings`, `change-password`, `(attender)/profile`, `badges`,
   `connections`, `become-host`, `verify-identity`, `venue-setup`, `create-event`, `edit-profile`,
   `message-privacy`, `message-requests`, `(app)/_layout.tsx`, `(hoster)/venue`,
   `(hoster)/announcement/[id]`, `BadgeGrid`, `MemberProfileCard`, `InterestChip`, `VenueForm`,
   `EmptyState`, `LoadingView`, `Toast`.

`app/index.tsx` and `(app)/index.tsx` are redirect-only and render no UI — no wave touches them.
That accounts for all 37 route files.

**`PillTabButton` is deleted, not restyled.** It draws the pill-shaped active tab of the floating
Poppins nav; the comp's tab bar is flat and flush with a dot-over-label active state in clay. Its
behavior moves into the `tabBar` token and the two tab `_layout.tsx` files.

Waves 2–6 each delete literal hex from the files they touch. A wave is not done while a file it
owns still contains a `#` color.

## Files touched

- **Rewritten**: `constants/theme.ts`, `__tests__/components/contrast.test.ts`, `app/_layout.tsx`
  (font loading only)
- **New**: `components/ui/{Screen,TicketCard,Text,Chip,CityChip,IconButton}.tsx` + tests
- **Restyled**: 37 route files, 22 existing components
- **Deps**: add `@expo-google-fonts/{antonio,inter,ibm-plex-mono}`; remove
  `@expo-google-fonts/{poppins,dm-sans,dm-serif-display}`
- **Deleted**: `paletteFor` consumers (only `EventCard` + `(attender)/index` today)

## Testing

- `contrast.test.ts` rewritten: asserts every accent clears 4.5:1 on **both** orange tones, that
  `ink` clears on all three surfaces, and that white-on-orange never appears in the palette export.
- New: `tokens.test.ts` — no screen or component file contains a literal hex outside
  `constants/theme.ts`. This is the guard that keeps problem 2 from recurring.
  **It ships in wave 1 with an explicit allowlist of every not-yet-converted file**, and each wave
  deletes its own files from that list. The allowlist is empty when wave 6 lands, and the test
  fails from then on if any screen reintroduces a literal color. Without the allowlist this test
  would fail waves 1–5 and contradict the "every wave ends green" rule.
- Primitive render tests for `TicketCard` (notch tone matches screen tone) and the text components
  (correct `fontFamily` per role).
- Existing 222 tests stay green throughout; none of them assert on color, so the restyle should not
  disturb them. Any that break indicate a behavior change, not a style change.

## Out of scope (YAGNI)

- Dark mode. The comp has one theme.
- Animation or transition work beyond what exists.
- `expo-blur` — still not installed, still not needed; the comp's tab bar is opaque.
- Icon set change. Ionicons stays.
- Any data-layer, rules, or Cloud Function change. This is presentation only.
- Re-rendering the comp for screens it does not cover — the ticket/two-tone system is extrapolated
  by rule (see Surface rules), not by generating new mockups per screen.
