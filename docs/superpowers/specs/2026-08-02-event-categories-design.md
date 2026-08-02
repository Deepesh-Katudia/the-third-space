# Event Categories & Category Dropdown — Design

_2026-08-02. Replaces the nine generic categories established in the original event
model with ten opinionated ones, and replaces Discover's horizontal chip scroll with
a modal picker._

## Goal

Ten named categories with a point of view, reachable from a dropdown at the top of
Discover, with honest empty states for the ones that have not filled up yet.

## The category set

Social is dropped — it was a catch-all that overlapped every other category, and
removing it forces hosts to pick something that actually describes their event.

| Slug | Label | Blurb | Emoji |
|------|-------|-------|-------|
| `day-drinks-nightlife` | Day Drinks & Nightlife | Bars, day parties, and nights out | 🍸 |
| `lets-get-active` | Let's Get Active | Gym sessions, yoga, basketball, run clubs | 🏃 |
| `creative-outlet` | Creative Outlet | Art, sewing, painting, and making things | 🎨 |
| `curious-minds` | Curious Minds | Talks, workshops, and anything that teaches | 🧠 |
| `stage-time` | Stage Time: Comedy + Music | Stand-up, live sets, and open mics | 🎤 |
| `lets-eat` | Let's Eat/Tastings | Wine and food tastings, dinners, supper clubs | 🍷 |
| `touch-grass` | Touch Grass | Hikes and nature trips, usually free, often just outside the city | 🌲 |
| `game-time` | Game Time | Arcades, barcades, and gaming sessions | 🎮 |
| `slow-down` | Slow Down | Sound baths, massage, and genuinely relaxing sessions | 🧘 |
| `level-up` | Level Up – Networking | Career, business, and networking events | 📈 |

The blurbs are not decoration. They ship as data because "Touch Grass" and "Slow
Down" are not self-describing, and a host guessing wrong is how categories become
useless. They render in the create-event picker, where miscategorization actually
happens, and in the dropdown rows.

## Store slugs, not labels

`CommunityEvent.category` holds `'touch-grass'`, never `'Touch Grass'`. The UI
resolves the label through a lookup.

This design exists because the app just renamed nine categories at once, which is
direct evidence the copy will be tuned again. With display strings as the stored
value, changing `Stage Time: Comedy + Music` to `Stage Time — Comedy & Music`
silently orphans every event filed under it: the value no longer matches any member
of the union, so those events fall out of every category view without an error.
Slugs make copy changes cosmetic permanently.

There is no data to migrate today, so this costs nothing now and cannot be adopted
for free later. That timing is the whole argument.

**Price:** `components/EventCard.tsx:32` and `app/(app)/event/[id].tsx:150` currently
render `{event.category}` directly and must call `categoryLabel()` instead. That is
the complete cost.

## Data model

`types/models.ts` — `EventCategory` becomes the union of the ten slugs.

`constants/categories.ts` grows from a bare string array into a metadata table plus
one lookup:

```ts
export interface EventCategoryMeta {
  id: EventCategory
  label: string
  blurb: string
  emoji: string
}

export const EVENT_CATEGORIES: EventCategoryMeta[]

/** Falls back to the raw id so an unknown slug degrades to something visible. */
export function categoryLabel(id: string): string
```

`categoryLabel` returning the raw id for an unknown slug is deliberate: a blank chip
is a bug that hides, and a visible `touch-grass` is a bug that reports itself.

## The picker route

New modal route `app/(app)/category-picker.tsx`, registered in `app/(app)/_layout.tsx`
alongside the existing `filters` and `borough-picker` modals and built to the same
shape as `borough-picker.tsx` — same problem (pick one from a list), same solution.

Discover's header gets a full-width trigger showing the active category and a chevron.
Rows show emoji, label, blurb, and a count.

**Counts are computed over the borough-scoped feed**, before the category filter is
applied — "how many of these are near me". Counting the fully-filtered feed would
make every row read 0 except the active one; counting all of NYC would make a row
promise events the user cannot see without changing boroughs. Scoping to borough
makes a `0` mean exactly what the empty state then explains.

Counting is client-side over the existing `subscribeUpcomingEvents` subscription. No
new query, and no composite index — consistent with the app-wide rule that every
Firestore query uses single-field `where` only.

## Collapsing the drift

Discover currently hardcodes six chips at `app/(app)/(attender)/index.tsx:22`, while
`components/CategoryTabs.tsx` renders all nine. Two implementations, two subsets,
already disagreeing with each other and with `EVENT_CATEGORIES`.

Both are deleted. The picker becomes the single reader of `EVENT_CATEGORIES`. Delete
`components/CategoryTabs.tsx` and its test file if one exists.

`components/FilterSheet.tsx` keeps its multi-select — combining several categories is
a genuinely different job from jumping to one — but starts resolving labels through
`categoryLabel()` rather than rendering the stored value.

The dropdown writes `filters.categories` as a single-element array, which is the
contract Discover already implements at `index.tsx:55-58`. The filter sheet and the
dropdown therefore stay consistent with no new state and no new store.

## Empty state

Selecting a category with no events renders the existing `EmptyState` component with
the category's own emoji and label:

```
        🎮
    GAME TIME

  No Game Time events yet.
  New ones land here as
  hosts post them.

  [ BROWSE ALL EVENTS ]
```

This composes with the existing borough-widening behavior rather than replacing it.
Widening answers "none near you"; this answers "none yet, anywhere". The button
clears the category filter rather than navigating, so the user lands back in the feed
they came from.

## The badge fix

`utils/badges.ts:10` filters attended events on the string literal `'Creative Arts'`
to award the Creative Soul badge. Renaming categories without touching that line
stops the badge being earnable — silently, because the badge is computed live and
would simply never unlock again.

It moves to the `creative-outlet` slug. A test asserts the slug it filters on is a
member of `EVENT_CATEGORIES`, so a future rename fails loudly in CI rather than
quietly in production.

## Testing

- `__tests__/constants/categories.test.ts` (new): exactly ten entries; slugs unique;
  every entry has a non-empty label, blurb, and emoji; `categoryLabel` resolves a
  known slug to its label and returns the raw input for an unknown one.
- `__tests__/utils/badges.test.ts` (update): Creative Soul earns on `creative-outlet`,
  plus the guard that the filtered slug is a real category.
- `__tests__/components/CategoryPicker.test.tsx` (new): renders all ten rows plus
  All; shows a zero count for an empty category; selecting a row writes a
  single-element `filters.categories`.
- Existing `eventFilters` tests update to the new slugs. The filtering logic itself
  is unchanged — it compares category values without interpreting them.

## Out of scope

- Category icons beyond the emoji already specified.
- Per-category sort, or ordering the dropdown by popularity. The order in the table
  above is the display order.
- Any change to `FilterSheet`'s multi-select behavior beyond label resolution.
- Backfill or legacy mapping. Confirmed there is no real event data; stale test
  events are deleted rather than migrated.

## Build note

Adding `category-picker.tsx` invalidates expo-router's generated types. Per the
codemap: run `npx expo start` for ~25s, kill it, then run `tsc`. Use the object form
`router.push({ pathname: '/(app)/category-picker' })` for the same reason.
