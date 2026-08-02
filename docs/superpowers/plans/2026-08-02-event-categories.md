# Event Categories & Category Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace nine generic event categories with ten opinionated ones stored as stable slugs, and replace Discover's horizontal chip scroll with a modal category picker that shows counts and honest empty states.

**Architecture:** `EventCategory` becomes a union of ten slugs. `constants/categories.ts` grows from a bare array into a metadata table (`id`, `label`, `blurb`, `emoji`) plus a `categoryLabel()` lookup. A new modal route `category-picker.tsx` — built to the same shape as the existing `borough-picker.tsx` — reads the module-store filters directly and writes a single-element `filters.categories`, which is the contract Discover already implements. Two drifted category UIs are deleted in favor of that one reader.

**Tech Stack:** React Native 0.81 / Expo SDK 54, expo-router v6 (typed routes), TypeScript 5.7, Firestore, Jest (jest-expo) + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-08-02-event-categories-design.md`

## Global Constraints

- Run all commands from `thirdspace-app/`.
- `constants/design.ts` is the only file in which a color may be written. No literal hex under `app/` or `components/` — guarded by `__tests__/constants/tokens.test.ts`.
- Every type role is uppercase app-wide; never add an inline `textTransform`.
- Firestore queries use single-field `where` only. No composite indexes. All category counting and filtering is client-side over the existing `subscribeUpcomingEvents` subscription.
- Dynamic and new routes use the object form: `router.push({ pathname: '/(app)/category-picker' })`.
- There is **no real event data**. No legacy mapping, no backfill, no back-compat branch anywhere.
- The ten slugs, in display order, are exactly: `day-drinks-nightlife`, `lets-get-active`, `creative-outlet`, `curious-minds`, `stage-time`, `lets-eat`, `touch-grass`, `game-time`, `slow-down`, `level-up`.
- Baseline before this plan: 53 suites / 362 tests passing, `tsc` clean.

---

### Task 1: The category metadata table

**Files:**
- Modify: `thirdspace-app/types/models.ts:3-12` (the `EventCategory` union)
- Modify: `thirdspace-app/constants/categories.ts` (whole file)
- Test: `thirdspace-app/__tests__/constants/categories.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `EventCategory` — union of the ten slug string literals, exported from `types/models.ts`.
  - `EventCategoryMeta` — `{ id: EventCategory; label: string; blurb: string; emoji: string }`, exported from `constants/categories.ts`.
  - `EVENT_CATEGORIES: EventCategoryMeta[]` — ten entries in display order.
  - `categoryLabel(id: string): string` — label for a known slug, the raw input otherwise.
  - `categoryMeta(id: string): EventCategoryMeta | undefined`.
  - `BOROUGHS` stays exactly as it is — same file, unchanged export.

Tasks 2-5 all depend on these exact names.

- [ ] **Step 1: Write the failing test**

Create `__tests__/constants/categories.test.ts`:

```ts
import { EVENT_CATEGORIES, categoryLabel, categoryMeta, BOROUGHS } from '../../constants/categories'

describe('event categories', () => {
  it('ships exactly ten categories', () => {
    expect(EVENT_CATEGORIES).toHaveLength(10)
  })

  it('gives every category a unique slug', () => {
    const ids = EVENT_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every category a label, a blurb and an emoji', () => {
    // The blurb is what stops a host guessing at "Touch Grass" or "Slow Down",
    // so an empty one is a real defect rather than a cosmetic omission.
    for (const c of EVENT_CATEGORIES) {
      expect([c.id, c.label.length > 0]).toEqual([c.id, true])
      expect([c.id, c.blurb.length > 0]).toEqual([c.id, true])
      expect([c.id, c.emoji.length > 0]).toEqual([c.id, true])
    }
  })

  it('uses slugs, not display strings, as the stored id', () => {
    // The whole point of the slug design: ids survive copy changes. A label
    // leaking into the id field would silently reintroduce the orphaning bug.
    for (const c of EVENT_CATEGORIES) {
      expect([c.id, c.id]).toEqual([c.id, c.id.toLowerCase()])
      expect(c.id).not.toContain(' ')
    }
  })

  it('drops the Social catch-all', () => {
    expect(EVENT_CATEGORIES.map((c) => c.id)).not.toContain('social')
    expect(EVENT_CATEGORIES.map((c) => c.label)).not.toContain('Social')
  })

  it('resolves a known slug to its label', () => {
    expect(categoryLabel('touch-grass')).toBe('Touch Grass')
    expect(categoryLabel('stage-time')).toBe('Stage Time: Comedy + Music')
  })

  it('falls back to the raw input for an unknown slug', () => {
    // A blank chip is a bug that hides; a visible "mystery-category" reports itself.
    expect(categoryLabel('mystery-category')).toBe('mystery-category')
    expect(categoryMeta('mystery-category')).toBeUndefined()
  })

  it('still exports the five boroughs', () => {
    expect(BOROUGHS).toHaveLength(5)
    expect(BOROUGHS).toContain('Brooklyn')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/constants/categories.test.ts`

Expected: FAIL — `categoryLabel` and `categoryMeta` are not exported from `constants/categories.ts` yet, so the suite fails at import/reference.

- [ ] **Step 3: Replace the EventCategory union**

In `types/models.ts`, replace lines 3-12:

```ts
/**
 * Stored as stable slugs, never display strings. Labels live in
 * constants/categories.ts and can be reworded freely without orphaning events.
 * See docs/superpowers/specs/2026-08-02-event-categories-design.md
 */
export type EventCategory =
  | 'day-drinks-nightlife'
  | 'lets-get-active'
  | 'creative-outlet'
  | 'curious-minds'
  | 'stage-time'
  | 'lets-eat'
  | 'touch-grass'
  | 'game-time'
  | 'slow-down'
  | 'level-up'
```

- [ ] **Step 4: Write the metadata table**

Replace the whole of `constants/categories.ts`:

```ts
import { Borough, EventCategory } from '../types/models'

export interface EventCategoryMeta {
  /** Stored in Firestore. Never render this — use `label`. */
  id: EventCategory
  label: string
  /** Shown in the picker and the create-event form so hosts file events correctly. */
  blurb: string
  /** Used by the picker rows and by the per-category empty state. */
  emoji: string
}

/** Display order. Not alphabetical, not by popularity — this is the intended order. */
export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  { id: 'day-drinks-nightlife', label: 'Day Drinks & Nightlife', blurb: 'Bars, day parties, and nights out', emoji: '🍸' },
  { id: 'lets-get-active',      label: "Let's Get Active",       blurb: 'Gym sessions, yoga, basketball, run clubs', emoji: '🏃' },
  { id: 'creative-outlet',      label: 'Creative Outlet',        blurb: 'Art, sewing, painting, and making things', emoji: '🎨' },
  { id: 'curious-minds',        label: 'Curious Minds',          blurb: 'Talks, workshops, and anything that teaches', emoji: '🧠' },
  { id: 'stage-time',           label: 'Stage Time: Comedy + Music', blurb: 'Stand-up, live sets, and open mics', emoji: '🎤' },
  { id: 'lets-eat',             label: "Let's Eat/Tastings",     blurb: 'Wine and food tastings, dinners, supper clubs', emoji: '🍷' },
  { id: 'touch-grass',          label: 'Touch Grass',            blurb: 'Hikes and nature trips, usually free, often just outside the city', emoji: '🌲' },
  { id: 'game-time',            label: 'Game Time',              blurb: 'Arcades, barcades, and gaming sessions', emoji: '🎮' },
  { id: 'slow-down',            label: 'Slow Down',              blurb: 'Sound baths, massage, and genuinely relaxing sessions', emoji: '🧘' },
  { id: 'level-up',             label: 'Level Up – Networking',  blurb: 'Career, business, and networking events', emoji: '📈' },
]

export function categoryMeta(id: string): EventCategoryMeta | undefined {
  return EVENT_CATEGORIES.find((c) => c.id === id)
}

/**
 * Falls back to the raw id rather than an empty string: a blank chip is a bug
 * that hides, a visible slug is a bug that reports itself.
 */
export function categoryLabel(id: string): string {
  return categoryMeta(id)?.label ?? id
}

export const BOROUGHS: Borough[] = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/constants/categories.test.ts`

Expected: PASS, 8 tests.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/types/models.ts thirdspace-app/constants/categories.ts thirdspace-app/__tests__/constants/categories.test.ts
git commit -m "feat: ten event categories stored as stable slugs

Replaces nine generic categories with ten opinionated ones and drops the
Social catch-all. Category values become slugs with labels held separately,
so future copy changes cannot orphan events the way renaming a stored
display string would."
```

---

### Task 2: Move every consumer onto slugs and labels

**Files:**
- Modify: `thirdspace-app/utils/badges.ts:10`
- Modify: `thirdspace-app/components/EventCard.tsx:32`
- Modify: `thirdspace-app/app/(app)/event/[id].tsx:150`
- Modify: `thirdspace-app/components/FilterSheet.tsx:84` (label resolution in the multi-select)
- Test: `thirdspace-app/__tests__/utils/badges.test.ts:11,41-43`
- Test: `thirdspace-app/__tests__/utils/eventFilters.test.ts:11,34,35,36,94`
- Test: `thirdspace-app/__tests__/utils/eventValidation.test.ts:8`
- Test: `thirdspace-app/__tests__/components/EventCard.test.tsx:23`
- Test: `thirdspace-app/__tests__/hooks/useAttendanceStats.test.tsx:11`
- Test: `thirdspace-app/__tests__/services/events.test.ts:173,184`

**Interfaces:**
- Consumes: `EventCategory`, `EVENT_CATEGORIES`, `categoryLabel` from Task 1.
- Produces: a green suite on the new slugs. Task 4's Discover work assumes `EventCard` already renders labels.

**Why the badge matters:** `utils/badges.ts:10` filters attended events on the string literal `'Creative Arts'`. After Task 1 that literal matches nothing, so the Creative Soul badge stops being earnable — silently, because badges are computed live and would simply never unlock. The guard test below makes the next rename fail in CI instead.

- [ ] **Step 1: Write the failing badge guard test**

In `__tests__/utils/badges.test.ts`, change the default category on line 11 from `'Social'` to `'lets-eat'`, rename the Creative test and switch its literals:

```ts
  it('unlocks Creative soul at 3+ attended Creative Outlet events', () => {
    const two = [1, 2].map((n) => event({ id: `e${n}`, category: 'creative-outlet' }))
    const three = [1, 2, 3].map((n) => event({ id: `e${n}`, category: 'creative-outlet' }))
```

Then append this new test to the same file (import `EVENT_CATEGORIES` at the top):

```ts
  it('filters on a slug that is a real category', () => {
    // badges.ts hardcodes one category slug. If a rename lands without updating
    // it, the badge goes quietly unearnable — this is the loud failure instead.
    expect(EVENT_CATEGORIES.map((c) => c.id)).toContain('creative-outlet')
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/utils/badges.test.ts`

Expected: FAIL — `unlocks Creative soul` fails because `badges.ts` still filters on `'Creative Arts'` while the test now supplies `'creative-outlet'`, so `creativeCount` is 0.

- [ ] **Step 3: Point badges.ts at the slug**

In `utils/badges.ts`, replace line 10:

```ts
  // Slug, not a display string — see constants/categories.ts. A test asserts this
  // is a real category so a rename fails loudly instead of disabling the badge.
  const creativeCount = attendedEvents.filter((e) => e.category === 'creative-outlet').length
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest __tests__/utils/badges.test.ts`

Expected: PASS.

- [ ] **Step 5: Render labels instead of raw slugs**

In `components/EventCard.tsx`, add the import and change line 32:

```tsx
import { categoryLabel } from '../constants/categories'
```
```tsx
  const chips = [formatEventDate(startsAt), categoryLabel(event.category)]
```

In `app/(app)/event/[id].tsx`, add the same import (path `'../../../constants/categories'`) and change line 150:

```tsx
              <Meta role="eyebrow" tone="ink">{categoryLabel(event.category)}</Meta>
```

In `components/FilterSheet.tsx`, the category multi-select maps over `EVENT_CATEGORIES` into `Chip`s. Because that constant is now objects rather than strings, replace that map (line 84):

```tsx
          {EVENT_CATEGORIES.map((c) => (
            <Chip key={c.id} label={c.label} active={filters.categories.includes(c.id)} onPress={() => toggleCategory(c.id)} />
          ))}
```

`toggleCategory` itself is unchanged — it already takes an `EventCategory` and the slug satisfies that type.

- [ ] **Step 6: Migrate the remaining test literals**

Replace every old category string in the test suite with a slug. These are pure fixture values; pick any valid slug where the specific category does not matter:

| File:line | Old | New |
|---|---|---|
| `__tests__/utils/eventFilters.test.ts:11` | `'Music'` | `'stage-time'` |
| `__tests__/utils/eventFilters.test.ts:34` | `'Music'` | `'stage-time'` |
| `__tests__/utils/eventFilters.test.ts:35` | `'Food & Drink'` | `'lets-eat'` |
| `__tests__/utils/eventFilters.test.ts:36` | `categories: ['Music']` | `categories: ['stage-time']` |
| `__tests__/utils/eventFilters.test.ts:94` | `categories: ['Music']` | `categories: ['stage-time']` |
| `__tests__/utils/eventValidation.test.ts:8` | `'Creative Arts'` | `'creative-outlet'` |
| `__tests__/components/EventCard.test.tsx:23` | `'Creative Arts'` | `'creative-outlet'` |
| `__tests__/hooks/useAttendanceStats.test.tsx:11` | `'Social'` | `'lets-eat'` |
| `__tests__/services/events.test.ts:173` | `'Social' as const` | `'lets-eat' as const` |
| `__tests__/services/events.test.ts:184` | `'Social' as const` | `'lets-eat' as const` |

`__tests__/components/ui/Chip.test.tsx` uses the bare string `'Wellness'` as generic chip content, not as an `EventCategory`. Leave it alone.

If `EventCard.test.tsx` asserts the category text appears on the card, update the expected string from `'Creative Arts'` to `'Creative Outlet'` — the card now renders the label, not the slug.

- [ ] **Step 7: Run the full suite**

Run: `npx jest`

Expected: PASS. Every suite green. If a suite still fails on a category literal, it was missed in the table above — fix it the same way.

- [ ] **Step 8: Commit**

```bash
git add thirdspace-app/utils/badges.ts thirdspace-app/components/EventCard.tsx "thirdspace-app/app/(app)/event/[id].tsx" thirdspace-app/components/FilterSheet.tsx thirdspace-app/__tests__
git commit -m "refactor: read category labels through the lookup

Surfaces that rendered the stored value now resolve it via categoryLabel().
badges.ts moves to the creative-outlet slug with a test asserting the slug
is a real category, so a future rename fails in CI rather than silently
making the badge unearnable."
```

---

### Task 3: The category picker route

**Files:**
- Create: `thirdspace-app/app/(app)/category-picker.tsx`
- Modify: `thirdspace-app/app/(app)/_layout.tsx:11` (register the modal)
- Test: `thirdspace-app/__tests__/components/CategoryPicker.test.tsx` (create)

**Interfaces:**
- Consumes: `EVENT_CATEGORIES`, `EventCategoryMeta` (Task 1); `useDiscoverFilters()` returning `{ filters, setFilters }`; `useUpcomingEvents()` returning `{ events }`; `useUserLocation()` returning `{ borough }`; `filterByBorough(events, borough)` returning `{ events, widened }` from `utils/locationFilter`.
- Produces: route `/(app)/category-picker`. Task 4 pushes to it.

**Design note:** the picker reads the filters module store directly rather than receiving params, exactly as `borough-picker.tsx` reads `useUserLocation`. Counts are scoped by borough and computed before the category filter, so a `0` means "none near you" consistently with the empty state Task 4 adds.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/CategoryPicker.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import CategoryPicker from '../../app/(app)/category-picker'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { CommunityEvent } from '../../types/models'

const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }))

const mockSetFilters = jest.fn()
jest.mock('../../hooks/useDiscoverFilters', () => ({
  useDiscoverFilters: () => ({
    filters: { date: null, neighborhoods: [], hide21: false, categories: [] },
    setFilters: mockSetFilters,
  }),
}))

function ev(id: string, category: string): CommunityEvent {
  return {
    id, title: 'E', description: '', category,
    startsAt: Timestamp.fromDate(new Date(2026, 8, 1)),
    capacity: 10, ageRequirement: '18+', venueId: 'v', venueName: 'V',
    neighborhood: 'Bushwick', borough: 'Brooklyn', registeredCount: 0, cancelled: false,
  } as unknown as CommunityEvent
}

jest.mock('../../hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => ({
    events: [ev('a', 'stage-time'), ev('b', 'stage-time'), ev('c', 'touch-grass')],
    loading: false, hasError: false,
  }),
}))

jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: () => ({ borough: null }),
}))

describe('CategoryPicker', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists all ten categories plus All', () => {
    const { getByText } = render(<CategoryPicker />)
    for (const c of EVENT_CATEGORIES) expect(getByText(c.label)).toBeTruthy()
    expect(getByText('All events')).toBeTruthy()
  })

  it('shows a count per category, including zero for empty ones', () => {
    const { getByTestId } = render(<CategoryPicker />)
    expect(getByTestId('count-stage-time').props.children).toBe(2)
    expect(getByTestId('count-touch-grass').props.children).toBe(1)
    // An empty category still appears, with an honest zero rather than being hidden.
    expect(getByTestId('count-game-time').props.children).toBe(0)
    expect(getByTestId('count-all').props.children).toBe(3)
  })

  it('writes a single-element categories filter and closes', () => {
    const { getByText } = render(<CategoryPicker />)
    fireEvent.press(getByText('Touch Grass'))
    expect(mockSetFilters).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['touch-grass'] })
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('clears the filter when All is chosen', () => {
    const { getByText } = render(<CategoryPicker />)
    fireEvent.press(getByText('All events'))
    expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }))
  })

  it('shows each blurb so hosts and browsers can tell categories apart', () => {
    const { getByText } = render(<CategoryPicker />)
    expect(getByText('Hikes and nature trips, usually free, often just outside the city')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/components/CategoryPicker.test.tsx`

Expected: FAIL — cannot resolve `../../app/(app)/category-picker`.

- [ ] **Step 3: Write the route**

Create `app/(app)/category-picker.tsx`:

```tsx
import React, { useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { EventCategory } from '../../types/models'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { useUserLocation } from '../../hooks/useUserLocation'
import { filterByBorough } from '../../utils/locationFilter'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space, NAV_CLEARANCE } from '../../constants/design'

export default function CategoryPicker() {
  const router = useRouter()
  const { filters, setFilters } = useDiscoverFilters()
  const { events } = useUpcomingEvents()
  const { borough } = useUserLocation()

  // Counts are scoped to the borough the user is browsing but NOT to the active
  // category — otherwise every row but the current one would read zero. A zero
  // here therefore means the same thing the feed's empty state goes on to explain.
  const scoped = useMemo(() => filterByBorough(events, borough).events, [events, borough])
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of scoped) map[e.category] = (map[e.category] ?? 0) + 1
    return map
  }, [scoped])

  const active: EventCategory | null =
    filters.categories.length === 1 ? filters.categories[0] : null

  const choose = (id: EventCategory | null) => {
    setFilters({ ...filters, categories: id === null ? [] : [id] })
    router.back()
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Browse by</Display>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => choose(null)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: active === null }}
          >
            <View style={styles.rowText}>
              <Display>All events</Display>
              <Body role="bodySm">Everything happening near you</Body>
            </View>
            <Meta testID="count-all" tone="clay">{scoped.length}</Meta>
            {active === null ? (
              <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {EVENT_CATEGORIES.map((c, index) => {
            const isSelected = c.id === active
            const isLast = index === EVENT_CATEGORIES.length - 1
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, isLast && styles.rowLast]}
                onPress={() => choose(c.id)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Meta style={styles.emoji}>{c.emoji}</Meta>
                <View style={styles.rowText}>
                  <Display>{c.label}</Display>
                  <Body role="bodySm">{c.blurb}</Body>
                </View>
                <Meta testID={`count-${c.id}`} tone="clay">{counts[c.id] ?? 0}</Meta>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  scroll: { paddingBottom: NAV_CLEARANCE },
  card: {
    marginHorizontal: space.xl,
    marginBottom: space.lg,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: space.xs },
  emoji: { fontSize: 22, lineHeight: 26 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.rule },
})
```

- [ ] **Step 4: Register the modal**

In `app/(app)/_layout.tsx`, add after line 11:

```tsx
        <Stack.Screen name="category-picker" options={{ presentation: 'modal' }} />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/components/CategoryPicker.test.tsx`

Expected: PASS, 5 tests.

- [ ] **Step 6: Commit**

```bash
git add "thirdspace-app/app/(app)/category-picker.tsx" "thirdspace-app/app/(app)/_layout.tsx" thirdspace-app/__tests__/components/CategoryPicker.test.tsx
git commit -m "feat: add the category picker modal

Built to the same shape as borough-picker: reads the filters module store
directly and writes a single-element categories array, which is the contract
Discover already implements. Counts are borough-scoped but not category-
scoped, so an empty category reads an honest zero."
```

---

### Task 4: Wire Discover to the picker and add the per-category empty state

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/index.tsx` — delete `CATEGORY_CHIPS` (lines 22-30) and the chip `ScrollView` (the block starting `<ScrollView horizontal ...>` around line 105), add the trigger and the empty state
- Delete: `thirdspace-app/components/CategoryTabs.tsx`

**Interfaces:**
- Consumes: `categoryLabel`, `categoryMeta` (Task 1); route `/(app)/category-picker` (Task 3).
- Produces: nothing later tasks depend on.

**Note:** `components/CategoryTabs.tsx` is dead code — nothing imports it, confirmed by grep. It renders all nine old categories and is a second source of truth that already disagreed with Discover's six hardcoded chips. Deleting it is part of collapsing the drift. It has no test file.

- [ ] **Step 1: Delete the dead component**

```bash
git rm thirdspace-app/components/CategoryTabs.tsx
```

- [ ] **Step 2: Replace the chip row with a trigger**

In `app/(app)/(attender)/index.tsx`:

Delete the `CATEGORY_CHIPS` constant (lines 22-30) and the `selectCategory` helper. Keep `activeCategory`, retyped:

```tsx
  const activeCategory: EventCategory | null =
    filters.categories.length === 1 ? filters.categories[0] : null
```

Add the import:

```tsx
import { categoryLabel, categoryMeta } from '../../../constants/categories'
```

Replace the entire horizontal chip `ScrollView` block with a full-width trigger:

```tsx
        <TouchableOpacity
          style={styles.categoryTrigger}
          onPress={() => router.push({ pathname: '/(app)/category-picker' })}
          activeOpacity={0.7}
          accessibilityRole="button"
        >
          <Meta role="eyebrow" tone="inkSoft">Browse by</Meta>
          <Display style={styles.categoryTriggerLabel}>
            {activeCategory ? categoryLabel(activeCategory) : 'All events'}
          </Display>
          <Meta tone="ink">▾</Meta>
        </TouchableOpacity>
```

Add these styles to the `StyleSheet.create` block:

```ts
  categoryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginBottom: space.md,
  },
  categoryTriggerLabel: { flex: 1 },
```

Confirm `radius` is in the `constants/design` import on line 20; add it if not.

- [ ] **Step 3: Add the per-category empty state**

In the render's empty branch, the current code distinguishes "no events at all" from "no match". Add a category-specific case ahead of the generic no-match branch:

```tsx
        ) : visible.length === 0 ? (
          events.length === 0 ? (
            <EmptyState emoji="🗓️" title="Nothing coming up yet" body="New events will appear here as venues post them." />
          ) : activeCategory ? (
            <EmptyState
              emoji={categoryMeta(activeCategory)?.emoji ?? '🔍'}
              title={categoryLabel(activeCategory)}
              body={`No ${categoryLabel(activeCategory)} events yet. New ones land here as hosts post them.`}
              actionLabel="Browse all events"
              // Clears the category only — the user keeps their search, date and
              // neighborhood filters and lands back in the feed they came from.
              onAction={() => setFilters({ ...filters, categories: [] })}
            />
          ) : (
            <EmptyState
              emoji="🔍"
              title="No events match"
              body="Try clearing your search and filters."
              actionLabel="Clear filters"
              onAction={() => { reset() }}
            />
          )
        ) : (
```

- [ ] **Step 4: Typecheck and run the suite**

Adding a route invalidates expo-router's generated types. Run `npx expo start`, wait ~25 seconds for it to regenerate, kill it, then:

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npx jest`
Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add -A thirdspace-app/
git commit -m "feat: swap Discover's chip scroll for the category dropdown

Deletes the six hardcoded chips in index.tsx and the unused CategoryTabs
component — two sources of truth that had already drifted from each other
and from EVENT_CATEGORIES. Picking an empty category now names it and
offers a way back rather than showing a generic no-match."
```

---

### Task 5: Show blurbs in the create-event picker

**Files:**
- Modify: `thirdspace-app/app/(app)/create-event.tsx:100-106`

**Interfaces:**
- Consumes: `EVENT_CATEGORIES` (Task 1).
- Produces: nothing.

**Why:** miscategorization happens at creation, not at browse. "Touch Grass" and "Slow Down" are not self-describing, so the host picking a category is exactly who needs the blurb.

- [ ] **Step 1: Replace the chip row with labelled rows**

The current block maps `EVENT_CATEGORIES` into small chips rendering `{c}`. Since the constant is now objects, that map breaks and must change regardless. Replace the mapped chips with stacked rows showing label and blurb:

```tsx
          {EVENT_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[styles.categoryRow, category === c.id && styles.categoryRowActive]}
              activeOpacity={0.7}
            >
              <Meta style={styles.categoryEmoji}>{c.emoji}</Meta>
              <View style={styles.categoryText}>
                <Display>{c.label}</Display>
                <Body role="bodySm">{c.blurb}</Body>
              </View>
            </TouchableOpacity>
          ))}
```

Add the styles, following the existing `chip` / `chipActive` pattern in that file for tone and border treatment:

```ts
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    padding: space.md,
    marginBottom: space.sm,
  },
  categoryRowActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  categoryEmoji: { fontSize: 20, lineHeight: 24 },
  categoryText: { flex: 1, gap: space.xs },
```

Ensure `Display`, `Body`, `View`, `radius` and `palette` are imported in that file; add whichever are missing. Remove the now-unused `chip` / `chipActive` styles only if nothing else in the file uses them — check before deleting.

- [ ] **Step 2: Typecheck and run the suite**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx jest` — expected all pass.

- [ ] **Step 3: Commit**

```bash
git add "thirdspace-app/app/(app)/create-event.tsx"
git commit -m "feat: show category blurbs in the create-event picker

Miscategorization happens at creation. Touch Grass and Slow Down are not
self-describing, so the host choosing one gets the description."
```

---

### Task 6: Codemap and final verification

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`

- [ ] **Step 1: Update the codemap**

Add `category-picker.tsx` to the route tree beside `borough-picker.tsx`:

```
        ├── borough-picker.tsx  # Borough selection modal (Discover → location override)
        ├── category-picker.tsx # Category selection modal (Discover → category dropdown)
```

Add to Key Invariants & Gotchas:

```
- **Event categories are stored as slugs, never display strings** — `constants/categories.ts`
  holds the id/label/blurb/emoji table and `categoryLabel()` resolves it. Rendering
  `event.category` raw is a bug. The point is that copy can be reworded without
  orphaning events, which is what renaming a stored display string would do.
- **`utils/badges.ts` hardcodes the `creative-outlet` slug** — the Creative Soul badge
  filters on it. A rename that misses that line makes the badge silently unearnable;
  `__tests__/utils/badges.test.ts` asserts the slug is a real category to catch it.
- **Category counts in the picker are borough-scoped but not category-scoped** —
  scoping by the active category would make every row but one read zero.
```

Update the Design System section to note there is one category UI (`category-picker.tsx`), replacing the deleted `CategoryTabs`.

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit` — expected clean.
Run: `npx jest` — expected all suites pass.

Confirm no old category string survives anywhere:

```bash
grep -rn "Creative Arts\|'Food & Drink'\|'Nightlife'\|'Outdoors'\|'Wellness'" thirdspace-app/app thirdspace-app/components thirdspace-app/utils thirdspace-app/constants thirdspace-app/types thirdspace-app/services thirdspace-app/hooks
```

Expected: no matches.

- [ ] **Step 3: Commit**

```bash
git add docs/CODEMAPS/thirdspace-codemap.md
git commit -m "docs: record the category slug model and picker route in the codemap"
```

---

## Verification

After Task 6 all of the following must hold:

- `npx tsc --noEmit` clean.
- `npx jest` green.
- `EVENT_CATEGORIES` has exactly ten entries; no `Social`.
- No old category display string appears anywhere in app source.
- `components/CategoryTabs.tsx` is deleted and `CATEGORY_CHIPS` no longer exists in `index.tsx`.
- Selecting an empty category shows that category's name and emoji with a working "Browse all events" action.

### Manual device check

Category counts come from a live subscription, so they cannot be verified statically. On device: open Discover, tap the trigger, confirm counts match the feed; pick a category with zero events and confirm the empty state names it and the action returns you to the full feed with your search text still intact.
