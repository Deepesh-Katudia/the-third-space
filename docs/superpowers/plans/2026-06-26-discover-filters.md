# Discover & Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock Discover feed and non-functional filter sheet with a live event feed whose filters and text search actually drive results, with a live result count.

**Architecture:** One realtime subscription to upcoming events (`subscribeUpcomingEvents`), filtered client-side by a pure `applyEventFilters` util. Filter + search state is shared between the Discover screen and the filter modal through a lightweight module store (`useSyncExternalStore`). No new collections, packages, indexes, or security-rule changes.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.7, expo-router v6, Firebase v11 (Firestore), Jest + @testing-library/react-native.

## Global Constraints

- **Source spec:** `docs/superpowers/specs/2026-06-26-discover-filters-design.md`. Every task implicitly inherits it.
- **Client-side filtering only.** One subscription; filter in memory. No Firestore query changes, no indexes, no rules changes.
- **No new dependencies.**
- **Fonts:** only `DMSerifDisplay_400Regular`, `DMSerifDisplay_400Regular_Italic`, `DMSans_300Light`, `DMSans_400Regular`, `DMSans_500Medium` are loaded. There is **no** DM Sans bold — `DMSans_500Medium` is the heaviest.
- **Palette (verbatim):** background `#FBF7F2` / dark `#2C1810`, primary `#C4614A`, soft orange `#E8855F`, sage `#7A8C6E`, muted text `#8C7B70`, warm border `rgba(242,197,160,0.5)`.
- **Dynamic navigation:** always object-form `router.push({ pathname: '/(app)/x/[id]', params: { id } })` — never template-string hrefs. (Static routes like `/(app)/filters` may be string literals.)
- **Removed filter dimensions (verbatim):** `freeOnly` and the `'custom'` date option are deleted — no price model exists and custom date-range is deferred.
- **Avatars fall back to initials** (`utils/avatar.ts` `avatarColor`/`initials`) whenever `photoURL` is null.
- **Util/hook test pattern:** construct plain objects; for `Timestamp` fields use `{ toDate, toMillis } as unknown as CommunityEvent['startsAt']`. Mock `../../services/events` for hook tests (see `__tests__/hooks/useProfile.test.tsx`). No emulator.
- Run `npx tsc --noEmit` clean and keep all existing tests green before each commit. All commands run from `thirdspace-app/`.

---

## File Structure

**Create:**
- `thirdspace-app/constants/filters.ts` — `DateFilter`, `EventFilters`, `EMPTY_FILTERS` (moved out of `FilterSheet.tsx`, minus `freeOnly`/`custom`)
- `thirdspace-app/utils/eventFilters.ts` — `applyEventFilters`, `hasActiveFilters`
- `thirdspace-app/hooks/useUpcomingEvents.ts` — live feed subscription hook
- `thirdspace-app/hooks/useDiscoverFilters.ts` — shared filter/search module store
- Tests: `__tests__/utils/eventFilters.test.ts`, `__tests__/hooks/useUpcomingEvents.test.tsx`, `__tests__/hooks/useDiscoverFilters.test.tsx`

**Modify:**
- `thirdspace-app/components/FilterSheet.tsx` — import types from `constants/filters`; drop `freeOnly` toggle + `custom` date option; rename "Price & age" → "Age"
- `thirdspace-app/app/(app)/(attender)/index.tsx` — live feed + search + filter store + real avatar
- `thirdspace-app/app/(app)/filters.tsx` — shared store + live count

---

## Task 1: Filter types + constants module

**Files:**
- Create: `thirdspace-app/constants/filters.ts`
- Modify: `thirdspace-app/components/FilterSheet.tsx`
- Test: tsc only (component; repo does not unit-test components)

**Interfaces:**
- Produces: `DateFilter = 'today' | 'weekend' | 'week' | null`; `interface EventFilters { date: DateFilter; neighborhoods: string[]; hide21: boolean; categories: EventCategory[] }`; `EMPTY_FILTERS: EventFilters`.

- [ ] **Step 1: Create `constants/filters.ts`**

```typescript
import { EventCategory } from '../types/models'

export type DateFilter = 'today' | 'weekend' | 'week' | null

export interface EventFilters {
  date: DateFilter
  neighborhoods: string[]
  hide21: boolean
  categories: EventCategory[]
}

export const EMPTY_FILTERS: EventFilters = {
  date: null,
  neighborhoods: [],
  hide21: false,
  categories: [],
}
```

- [ ] **Step 2: Update `components/FilterSheet.tsx`** — source the types from the new module (re-export for back-compat so `filters.tsx` keeps working until Task 6), delete the `freeOnly` toggle and the `'custom'` date option, and rename the section.

Replace the top type/const block (the current `export type DateFilter`, `export interface EventFilters`, `export const EMPTY_FILTERS`, `DATE_OPTIONS`) with:

```typescript
import { EventCategory } from '../types/models'
import { EVENT_CATEGORIES } from '../constants/categories'
import { DateFilter, EventFilters, EMPTY_FILTERS } from '../constants/filters'

// Re-exported so existing importers (filters screen) keep resolving these from here.
export { EMPTY_FILTERS }
export type { DateFilter, EventFilters }

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This weekend', value: 'weekend' },
  { label: 'This week', value: 'week' },
]
```

Then in the JSX, delete the `toggleNeighborhood`/category handlers? No — keep them. Delete only the "Free events only" `ToggleRow` and rename the section title. Replace the `<Section title="Price & age">` block with:

```tsx
      <Section title="Age">
        <ToggleRow
          label="Hide 21+ events"
          value={filters.hide21}
          onValueChange={(v) => onChange({ ...filters, hide21: v })}
        />
      </Section>
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: clean. (`filters.tsx` still imports `EventFilters, EMPTY_FILTERS` from `FilterSheet` via the re-export; `FilterSheet` no longer references `freeOnly`.)

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/constants/filters.ts thirdspace-app/components/FilterSheet.tsx
git commit -m "refactor: extract filter types, drop free-only and custom-date filters"
```

---

## Task 2: `applyEventFilters` + `hasActiveFilters` util

**Files:**
- Create: `thirdspace-app/utils/eventFilters.ts`
- Test: `thirdspace-app/__tests__/utils/eventFilters.test.ts`

**Interfaces:**
- Consumes: `EventFilters`, `EMPTY_FILTERS` (Task 1); `CommunityEvent` (`types/models`).
- Produces:
  - `applyEventFilters(events: CommunityEvent[], filters: EventFilters, query: string, now?: Date): CommunityEvent[]`
  - `hasActiveFilters(filters: EventFilters): boolean`

- [ ] **Step 1: Write the failing test** `__tests__/utils/eventFilters.test.ts`

```typescript
import { CommunityEvent } from '../../types/models'
import { applyEventFilters, hasActiveFilters } from '../../utils/eventFilters'
import { EMPTY_FILTERS } from '../../constants/filters'

function ev(over: Partial<CommunityEvent> & { startsAt: Date }): CommunityEvent {
  const { startsAt, ...rest } = over
  return {
    id: rest.id ?? 'e',
    title: rest.title ?? 'Event',
    description: '',
    category: rest.category ?? 'Music',
    startsAt: { toDate: () => startsAt, toMillis: () => startsAt.getTime() } as unknown as CommunityEvent['startsAt'],
    capacity: 20,
    ageRequirement: rest.ageRequirement ?? '18+',
    venueId: 'v',
    venueName: rest.venueName ?? 'Venue',
    neighborhood: rest.neighborhood ?? 'Williamsburg',
    registeredCount: 0,
  }
}

// Thursday 2026-06-25 12:00
const NOW = new Date(2026, 5, 25, 12, 0, 0)

describe('applyEventFilters', () => {
  it('returns all events sorted by start time when filters are empty', () => {
    const a = ev({ id: 'a', startsAt: new Date(2026, 5, 27, 18) })
    const b = ev({ id: 'b', startsAt: new Date(2026, 5, 26, 18) })
    const out = applyEventFilters([a, b], EMPTY_FILTERS, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('filters by category (multi-select)', () => {
    const music = ev({ id: 'm', category: 'Music', startsAt: new Date(2026, 5, 27) })
    const food = ev({ id: 'f', category: 'Food & Drink', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([music, food], { ...EMPTY_FILTERS, categories: ['Music'] }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['m'])
  })

  it('filters by neighborhood', () => {
    const wb = ev({ id: 'w', neighborhood: 'Williamsburg', startsAt: new Date(2026, 5, 27) })
    const bw = ev({ id: 'b', neighborhood: 'Bushwick', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([wb, bw], { ...EMPTY_FILTERS, neighborhoods: ['Bushwick'] }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['b'])
  })

  it('hides 21+ events when hide21 is set', () => {
    const ok = ev({ id: 'ok', ageRequirement: '18+', startsAt: new Date(2026, 5, 27) })
    const bar = ev({ id: 'bar', ageRequirement: '21+', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([ok, bar], { ...EMPTY_FILTERS, hide21: true }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['ok'])
  })

  it('text search matches title, venue, or neighborhood case-insensitively', () => {
    const a = ev({ id: 'a', title: 'Vinyl Listening Night', startsAt: new Date(2026, 5, 27) })
    const b = ev({ id: 'b', title: 'Yoga', venueName: 'Static Bar', startsAt: new Date(2026, 5, 27) })
    const c = ev({ id: 'c', title: 'Run', neighborhood: 'Greenpoint', startsAt: new Date(2026, 5, 27) })
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'vinyl', NOW).map((e) => e.id)).toEqual(['a'])
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'STATIC', NOW).map((e) => e.id)).toEqual(['b'])
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'green', NOW).map((e) => e.id)).toEqual(['c'])
  })

  it('date=today keeps only events on the same calendar day as now', () => {
    const today = ev({ id: 't', startsAt: new Date(2026, 5, 25, 20) })
    const tomorrow = ev({ id: 'tm', startsAt: new Date(2026, 5, 26, 20) })
    const out = applyEventFilters([today, tomorrow], { ...EMPTY_FILTERS, date: 'today' }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['t'])
  })

  it('date=week keeps events within 7 days from now', () => {
    const soon = ev({ id: 's', startsAt: new Date(2026, 5, 28, 20) })
    const later = ev({ id: 'l', startsAt: new Date(2026, 6, 10, 20) })
    const out = applyEventFilters([soon, later], { ...EMPTY_FILTERS, date: 'week' }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['s'])
  })

  it('date=weekend keeps the upcoming Saturday/Sunday only', () => {
    // NOW is Thu Jun 25 2026; that weekend is Sat Jun 27 + Sun Jun 28.
    const sat = ev({ id: 'sat', startsAt: new Date(2026, 5, 27, 14) })
    const sun = ev({ id: 'sun', startsAt: new Date(2026, 5, 28, 14) })
    const mon = ev({ id: 'mon', startsAt: new Date(2026, 5, 29, 14) })
    const out = applyEventFilters([sat, sun, mon], { ...EMPTY_FILTERS, date: 'weekend' }, '', NOW)
    expect(out.map((e) => e.id).sort()).toEqual(['sat', 'sun'])
  })
})

describe('hasActiveFilters', () => {
  it('is false for empty filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })
  it('is true when any dimension is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, hide21: true })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, date: 'today' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, categories: ['Music'] })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, neighborhoods: ['Bushwick'] })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/eventFilters.test.ts`
Expected: FAIL — `Cannot find module '../../utils/eventFilters'`.

- [ ] **Step 3: Implement `utils/eventFilters.ts`**

```typescript
import { CommunityEvent } from '../types/models'
import { EventFilters } from '../constants/filters'

function inDateRange(date: Date, filter: EventFilters['date'], now: Date): boolean {
  if (!filter) return true
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (filter === 'today') {
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    return date >= startOfDay && date < endOfDay
  }

  if (filter === 'week') {
    const weekEnd = new Date(startOfDay)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return date >= now && date < weekEnd
  }

  // weekend: the upcoming Saturday + Sunday (or the remainder if today is already
  // the weekend), ending Monday 00:00.
  const day = now.getDay() // 0=Sun .. 6=Sat
  let start: Date
  if (day === 0 || day === 6) {
    start = now
  } else {
    start = new Date(startOfDay)
    start.setDate(start.getDate() + (6 - day))
  }
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  end.setDate(end.getDate() + (((1 - end.getDay() + 7) % 7) || 7))
  return date >= start && date < end
}

export function applyEventFilters(
  events: CommunityEvent[],
  filters: EventFilters,
  query: string,
  now: Date = new Date()
): CommunityEvent[] {
  const q = query.trim().toLowerCase()
  return events
    .filter((e) => {
      if (!inDateRange(e.startsAt.toDate(), filters.date, now)) return false
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(e.neighborhood)) return false
      if (filters.hide21 && e.ageRequirement === '21+') return false
      if (filters.categories.length > 0 && !filters.categories.includes(e.category)) return false
      if (q) {
        const haystack = `${e.title} ${e.venueName} ${e.neighborhood}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
}

export function hasActiveFilters(filters: EventFilters): boolean {
  return (
    filters.date !== null ||
    filters.neighborhoods.length > 0 ||
    filters.hide21 ||
    filters.categories.length > 0
  )
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/utils/eventFilters.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/utils/eventFilters.ts thirdspace-app/__tests__/utils/eventFilters.test.ts
git commit -m "feat: add applyEventFilters and hasActiveFilters"
```

---

## Task 3: `useUpcomingEvents` hook

**Files:**
- Create: `thirdspace-app/hooks/useUpcomingEvents.ts`
- Test: `thirdspace-app/__tests__/hooks/useUpcomingEvents.test.tsx`

**Interfaces:**
- Consumes: `subscribeUpcomingEvents(onChange, onError)` (`services/events`).
- Produces: `useUpcomingEvents(): { events: CommunityEvent[]; loading: boolean; hasError: boolean }`.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useUpcomingEvents.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { subscribeUpcomingEvents } from '../../services/events'

jest.mock('../../services/events', () => ({ subscribeUpcomingEvents: jest.fn() }))

describe('useUpcomingEvents', () => {
  it('exposes events from the subscription and clears loading', async () => {
    ;(subscribeUpcomingEvents as jest.Mock).mockImplementation((onChange) => {
      onChange([{ id: 'e1' }])
      return () => {}
    })
    const { result } = renderHook(() => useUpcomingEvents())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([{ id: 'e1' }])
    expect(result.current.hasError).toBe(false)
  })

  it('sets hasError when the subscription errors', async () => {
    ;(subscribeUpcomingEvents as jest.Mock).mockImplementation((_onChange, onError) => {
      onError()
      return () => {}
    })
    const { result } = renderHook(() => useUpcomingEvents())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useUpcomingEvents.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useUpcomingEvents'`.

- [ ] **Step 3: Implement `hooks/useUpcomingEvents.ts`**

```typescript
import { useEffect, useState } from 'react'
import { CommunityEvent } from '../types/models'
import { subscribeUpcomingEvents } from '../services/events'

export function useUpcomingEvents() {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setHasError(false)
    return subscribeUpcomingEvents(
      (list) => { setEvents(list); setLoading(false); setHasError(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [])

  return { events, loading, hasError }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useUpcomingEvents.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/hooks/useUpcomingEvents.ts thirdspace-app/__tests__/hooks/useUpcomingEvents.test.tsx
git commit -m "feat: add useUpcomingEvents live feed hook"
```

---

## Task 4: `useDiscoverFilters` shared store

**Files:**
- Create: `thirdspace-app/hooks/useDiscoverFilters.ts`
- Test: `thirdspace-app/__tests__/hooks/useDiscoverFilters.test.tsx`

**Interfaces:**
- Consumes: `EventFilters`, `EMPTY_FILTERS` (Task 1).
- Produces: `useDiscoverFilters(): { filters: EventFilters; query: string; setFilters: (f: EventFilters) => void; setQuery: (q: string) => void; reset: () => void }`. Backed by a module singleton shared across all consumers.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useDiscoverFilters.test.tsx`

```typescript
import { renderHook, act } from '@testing-library/react-native'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { EMPTY_FILTERS } from '../../constants/filters'

describe('useDiscoverFilters', () => {
  afterEach(() => {
    const { result } = renderHook(() => useDiscoverFilters())
    act(() => result.current.reset())
  })

  it('updates query and filters, then resets', () => {
    const { result } = renderHook(() => useDiscoverFilters())

    act(() => result.current.setQuery('wine'))
    expect(result.current.query).toBe('wine')

    act(() => result.current.setFilters({ ...EMPTY_FILTERS, hide21: true }))
    expect(result.current.filters.hide21).toBe(true)

    act(() => result.current.reset())
    expect(result.current.query).toBe('')
    expect(result.current.filters).toEqual(EMPTY_FILTERS)
  })

  it('shares state across separate consumers', () => {
    const a = renderHook(() => useDiscoverFilters())
    const b = renderHook(() => useDiscoverFilters())
    act(() => a.result.current.setQuery('vinyl'))
    expect(b.result.current.query).toBe('vinyl')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useDiscoverFilters.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useDiscoverFilters'`.

- [ ] **Step 3: Implement `hooks/useDiscoverFilters.ts`**

```typescript
import { useSyncExternalStore } from 'react'
import { EventFilters, EMPTY_FILTERS } from '../constants/filters'

interface DiscoverState {
  filters: EventFilters
  query: string
}

let state: DiscoverState = { filters: EMPTY_FILTERS, query: '' }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): DiscoverState {
  return state
}

function setFilters(filters: EventFilters): void {
  state = { ...state, filters }
  emit()
}

function setQuery(query: string): void {
  state = { ...state, query }
  emit()
}

function reset(): void {
  state = { filters: EMPTY_FILTERS, query: '' }
  emit()
}

export function useDiscoverFilters() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return { filters: snap.filters, query: snap.query, setFilters, setQuery, reset }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useDiscoverFilters.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/hooks/useDiscoverFilters.ts thirdspace-app/__tests__/hooks/useDiscoverFilters.test.tsx
git commit -m "feat: add shared discover filter/search store"
```

---

## Task 5: Discover screen — live feed, search, real avatar

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/index.tsx`
- Test: tsc + manual smoke (repo does not unit-test screens)

**Interfaces:**
- Consumes: `useUpcomingEvents` (Task 3), `useDiscoverFilters` (Task 4), `applyEventFilters`/`hasActiveFilters` (Task 2), `useProfile` (existing), `useAuth` (existing), `FeaturedEventCard`/`CompactEventRow`/`LoadingView`/`EmptyState` (existing), `avatarColor`/`initials` (existing).

- [ ] **Step 1: Replace `app/(app)/(attender)/index.tsx`** with the live version (removes `MOCK_FEED_EVENTS`, `MOCK_USER_NAME`, and the `ts()` seed helper):

```tsx
import React, { useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EventCategory } from '../../../types/models'
import { FeaturedEventCard } from '../../../components/FeaturedEventCard'
import { CompactEventRow } from '../../../components/CompactEventRow'
import { LoadingView } from '../../../components/LoadingView'
import { EmptyState } from '../../../components/EmptyState'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useUpcomingEvents } from '../../../hooks/useUpcomingEvents'
import { useDiscoverFilters } from '../../../hooks/useDiscoverFilters'
import { applyEventFilters, hasActiveFilters } from '../../../utils/eventFilters'
import { avatarColor, initials } from '../../../utils/avatar'

const CATEGORY_CHIPS: { label: string; value: EventCategory | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Creative', value: 'Creative Arts' },
  { label: 'Nightlife', value: 'Nightlife' },
  { label: 'Wellness', value: 'Wellness' },
  { label: 'Music', value: 'Music' },
  { label: 'Food', value: 'Food & Drink' },
  { label: 'Social', value: 'Social' },
]

export default function Discover() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useProfile(user?.uid)
  const { events, loading, hasError } = useUpcomingEvents()
  const { filters, query, setQuery, setFilters, reset } = useDiscoverFilters()

  const name = profile?.displayName ?? user?.displayName ?? 'Member'
  const visible = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])
  const [featured, ...rest] = visible

  const activeCategory: EventCategory | 'All' =
    filters.categories.length === 1 ? filters.categories[0] : 'All'
  const selectCategory = (value: EventCategory | 'All') =>
    setFilters({ ...filters, categories: value === 'All' ? [] : [value] })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.location}>Brooklyn, NY</Text>
            <Text style={styles.title}>Discover</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/(attender)/profile')}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: avatarColor(name) }]}>
                <Text style={styles.userInitials}>{initials(name)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, venues, neighborhoods"
              placeholderTextColor="#8C7B70"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push('/(app)/filters')}>
            <Text style={styles.filterIcon}>⚙</Text>
            {hasActiveFilters(filters) ? <View style={styles.filterDot} /> : null}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORY_CHIPS.map((chip) => {
            const active = activeCategory === chip.value
            return (
              <TouchableOpacity
                key={chip.label}
                onPress={() => selectCategory(chip.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {loading ? (
          <LoadingView />
        ) : hasError ? (
          <EmptyState emoji="🛰️" title="Couldn't load events" body="Check your connection and try again." />
        ) : visible.length === 0 ? (
          events.length === 0 ? (
            <EmptyState emoji="🗓️" title="Nothing coming up yet" body="New events will appear here as venues post them." />
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
          <>
            {featured ? (
              <FeaturedEventCard
                event={featured}
                onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: featured.id } })}
              />
            ) : null}
            {rest.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>More this week</Text>
                {rest.map((event) => (
                  <CompactEventRow
                    key={event.id}
                    event={event}
                    onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: event.id } })}
                  />
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  location: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4614A', marginBottom: 2, letterSpacing: 0.3 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 34, color: '#2C1810', letterSpacing: -0.5 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4, overflow: 'hidden' },
  userInitials: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.5)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: { fontSize: 18, color: '#8C7B70' },
  searchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', paddingVertical: 0 },
  searchClear: { fontSize: 14, color: '#8C7B70' },
  filterBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  filterIcon: { fontSize: 18, color: '#2C1810' },
  filterDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4614A' },
  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 16 },
  chip: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#2C1810', borderColor: '#2C1810' },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  chipTextActive: { color: 'white' },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 4 },
})
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; all tests pass.
Manual: open Discover → live events render; type "wine" → list narrows to matches; tap a category chip → filters; tap the filter button → modal; with a filter set, the filter button shows the dot.

- [ ] **Step 3: Commit**

```bash
git add "thirdspace-app/app/(app)/(attender)/index.tsx"
git commit -m "feat: live discover feed with search, filters, and real avatar"
```

---

## Task 6: Filters screen — shared store + live count

**Files:**
- Modify: `thirdspace-app/app/(app)/filters.tsx`
- Test: tsc + full jest + manual smoke

**Interfaces:**
- Consumes: `useDiscoverFilters` (Task 4), `useUpcomingEvents` (Task 3), `applyEventFilters` (Task 2), `FilterSheet` (existing).

- [ ] **Step 1: Replace `app/(app)/filters.tsx`** with the store-backed version (removes `MOCK_RESULT_COUNT` and local `useState`):

```tsx
import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { FilterSheet } from '../../components/FilterSheet'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { applyEventFilters } from '../../utils/eventFilters'

export default function Filters() {
  const router = useRouter()
  const { filters, query, setFilters, reset } = useDiscoverFilters()
  const { events } = useUpcomingEvents()

  const count = useMemo(() => applyEventFilters(events, filters, query).length, [events, filters, query])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <FilterSheet filters={filters} onChange={setFilters} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => reset()} hitSlop={8}>
          <Text style={styles.clear}>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()}>
          <Text style={styles.applyText}>Show {count} event{count === 1 ? '' : 's'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(242,197,160,0.7)', marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', letterSpacing: -0.5 },
  close: { fontSize: 18, color: '#8C7B70' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,197,160,0.5)',
    gap: 16,
  },
  clear: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#8C7B70' },
  applyBtn: { flex: 1, backgroundColor: '#C4614A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: 'white' },
})
```

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; **all** tests pass (existing 55 + new eventFilters/useUpcomingEvents/useDiscoverFilters suites).

- [ ] **Step 3: Manual smoke of the whole flow**
  - Open Discover → live events; search narrows the list.
  - Open Filters → toggle Date/Category/Neighborhood/Hide-21 → "Show N events" updates live.
  - Apply (back) → Discover reflects the same filters; the filter button shows its active dot.
  - "Clear all" resets both the count and Discover.
  - Category quick-chip on Discover selects a single category and syncs with the sheet.

- [ ] **Step 4: Commit**

```bash
git add "thirdspace-app/app/(app)/filters.tsx"
git commit -m "feat: live filter result count wired to shared store"
```

---

## Self-Review

**Spec coverage**
- Live feed (`useUpcomingEvents`) → Task 3; Discover consumes it → Task 5.
- Client-side filtering core (`applyEventFilters`, `hasActiveFilters`) → Task 2.
- Shared filter/search store across both routes → Task 4; consumed by Discover (Task 5) and Filters (Task 6).
- Inline text search → Task 5 (`query` in store, `TextInput` on Discover, applied in `applyEventFilters`).
- Removed `freeOnly` + `custom` date; "Age" section rename → Task 1.
- Live "Show N events" count → Task 6.
- Real header avatar via `useProfile` → Task 5.
- Empty/error/zero-match states → Task 5.
- Static "Brooklyn, NY" kept decorative (out of scope) → Task 5 (unchanged literal).
- No new deps / rules / indexes → respected (no such tasks).

**Placeholder scan:** No TBD/TODO; every code step shows complete code; manual-smoke steps enumerate concrete actions.

**Type consistency:** `EventFilters`/`DateFilter`/`EMPTY_FILTERS` defined in Task 1, consumed unchanged in Tasks 2, 4, 5, 6. `applyEventFilters(events, filters, query, now?)` and `hasActiveFilters(filters)` signatures consistent across Tasks 2, 5, 6. `useUpcomingEvents()` → `{ events, loading, hasError }` consistent across Tasks 3, 5, 6. `useDiscoverFilters()` → `{ filters, query, setFilters, setQuery, reset }` consistent across Tasks 4, 5, 6. `FilterSheet` props (`filters`, `onChange`) unchanged.

---

## Execution Notes

- Tasks 1–4 are foundation (types, util, hooks) and independently unit-testable. Tasks 5–6 are screen wiring gated on tsc + manual smoke (this repo does not unit-test screens).
- No deploy step: B is read-only over existing `events` data and rules. Nothing to publish after merge.
