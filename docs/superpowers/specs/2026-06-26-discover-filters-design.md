# Discover & Filters — Design Spec
_Date: 2026-06-26 · Phase 2, Sub-project B of 6_

## Context

Phase 1 translated the Claude Design mockup into RN/Expo screens using per-screen `MOCK_*` data. Phase 2 connects those screens to live Firebase data across six independent subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| A | User Profiles & Identity | done |
| **B** | **Discover & Filters** | **This spec** |
| C | Chat & Messaging | later |
| D | Points & Badges | later |
| E | Social graph (follows/connections) | later |
| F | Venue Announcements | later |

Sub-project A is complete; profile reads are live. B makes the attender's primary surface — the Discover feed and its filter sheet — real.

### Current state (before this work)
- **Discover** (`(attender)/index.tsx`): renders a hardcoded `MOCK_FEED_EVENTS` array; a category quick-chip row filters that array client-side; `MOCK_USER_NAME` drives the header avatar; the "search" bar is a button that opens the filter modal.
- **Filters** (`(app)/filters.tsx` + `components/FilterSheet.tsx`): collects date / neighborhoods / free-only / hide-21 / categories into **local** state that is **never applied** to the feed; the footer shows a hardcoded `MOCK_RESULT_COUNT = 18`.
- The live data source already exists: `services/events.ts → subscribeUpcomingEvents(onChange, onError)` streams all non-cancelled upcoming events ordered by `startsAt`.
- `CommunityEvent` carries denormalized `venueName` and `neighborhood`; it has **no price field**. `ageRequirement` is `'18+' | '21+'`.

## Goal

Make Discover and its filters real:
- The feed renders live upcoming events.
- The filter sheet's selections actually drive the feed, and its "Show N events" count is live.
- A real inline text search filters by title / venue / neighborhood.
- The header avatar reflects the signed-in user's real profile.

No mock data remains on these two screens.

## Approach

**Client-side filtering over a single live subscription.** Subscribe once to `subscribeUpcomingEvents` and filter/search in memory. This matches the codebase's denormalized, no-composite-index philosophy (the feed already filters category client-side; `my-events` prunes client-side). Firestore cannot combine multiple array-membership filters, so multi-select categories + neighborhoods would be server-side painful for no benefit at this scale.

Filter state is shared between the two routes through a lightweight module store (the filter sheet is a modal at `(app)/filters`, a sibling of the `(attender)` group, so a React context at the attender layout would not wrap it). The store holds only the small, serializable `{ filters, query }`; each screen owns its own `useUpcomingEvents` subscription.

## Decisions (resolved during brainstorming)

- **Search:** real inline text search on Discover (not just a button).
- **"Free events only" filter:** removed — there is no price concept; every event is free. A no-op toggle would be leftover mock behaviour.
- **"Pick dates" custom range:** deferred. Keep the Today / This weekend / This week presets.
- **Filter engine:** client-side over the live feed (above).

## New / changed units

### `hooks/useUpcomingEvents.ts` — NEW
`useUpcomingEvents(): { events: CommunityEvent[]; loading: boolean; hasError: boolean }`. Subscribes to `subscribeUpcomingEvents` in an effect; returns the unsubscribe as cleanup. Mirrors the `useVenue`/`useProfile` shape (incl. `hasError`).

### `utils/eventFilters.ts` — NEW (core logic, fully unit-tested)
- `type DateFilter = 'today' | 'weekend' | 'week' | null` (custom removed).
- `applyEventFilters(events, filters, query, now = new Date()): CommunityEvent[]`
  - **date**: `today` = same calendar day as `now`; `weekend` = upcoming Sat+Sun (if `now` is already the weekend, the remainder of it); `week` = `now` → 7 days out. Compared against `event.startsAt.toDate()`.
  - **neighborhoods**: keep events whose `event.neighborhood` is in `filters.neighborhoods` (empty = all).
  - **hide21**: when true, drop events with `ageRequirement === '21+'`.
  - **categories**: keep events whose `category` is in `filters.categories` (empty = all).
  - **query**: case-insensitive substring over `title`, `venueName`, `neighborhood` (trimmed; empty = all).
  - Result sorted by `startsAt` ascending (the subscription is already ordered; re-sort defensively).
- `hasActiveFilters(filters): boolean` — true when any dimension is non-default (drives the Discover filter-button active dot).

### `components/FilterSheet.tsx` — MODIFY
- `EventFilters` loses `freeOnly`; `DateFilter` loses `'custom'`. `EMPTY_FILTERS` updated accordingly.
- Remove the "Pick dates" date option and the "Free events only" toggle. Rename the "Price & age" section to **Age** (hide-21 toggle only).
- No change to neighborhoods/categories chips.

### `hooks/useDiscoverFilters.ts` — NEW (shared store)
Module-level store exposed via `useSyncExternalStore`:
`useDiscoverFilters(): { filters: EventFilters; query: string; setFilters; setQuery; reset }`.
`reset()` returns to `EMPTY_FILTERS` + `''`. State persists across modal open/close for the session (not across app restarts — acceptable; the feed is ephemeral).

### `app/(app)/(attender)/index.tsx` (Discover) — MODIFY
- `const { events, loading, hasError } = useUpcomingEvents()`.
- `const { filters, query, setQuery, setFilters } = useDiscoverFilters()`.
- `const visible = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])`.
- Replace the search button with a `TextInput` bound to `query`; add a filter icon button → `router.push('/(app)/filters')` showing an active dot when `hasActiveFilters(filters)`.
- Category quick-chip row writes to the store: selecting a chip sets `filters.categories = [value]`; **All** sets `[]`. Active chip = `filters.categories.length === 1 && filters.categories[0] === value` (or All when empty). (Multi-select from the modal renders the row as All-inactive — accepted.)
- Header avatar: `useProfile(user?.uid)` → `<Image>` photo or initials fallback (mirrors `(attender)/profile.tsx`).
- `loading` → `LoadingView`; `hasError` → `EmptyState`/`Banner`; zero matches → `EmptyState` with a "Clear filters" action calling `reset()`.
- Remove `MOCK_FEED_EVENTS`, `MOCK_USER_NAME`, and the local `ts()` seed helper.

### `app/(app)/filters.tsx` — MODIFY
- Read `{ filters, query, setFilters, reset }` from the store (drop local `useState`). The active search `query` still constrains the count even though the modal has no search input.
- `const { events } = useUpcomingEvents()`; `const count = applyEventFilters(events, filters, query).length`.
- Footer button reads **"Show {count} events"**; "Clear all" → `reset()`. Remove `MOCK_RESULT_COUNT`.

## Data flow

```
subscribeUpcomingEvents ──► useUpcomingEvents ──► events
                                                   │
useDiscoverFilters (module store) ──► filters, query
                                                   │
                          applyEventFilters(events, filters, query)
                              │                         │
                        Discover list            Filters "Show N" count
```
Toggling a filter in the modal updates the shared store; on return Discover re-derives via `useMemo`.

## Error handling & edge cases

- **Empty feed** (no upcoming events) → `EmptyState` ("Nothing coming up yet").
- **Zero matches after filtering** → distinct `EmptyState` with Clear action (`reset()`), so users aren't stuck.
- **Read error** → `EmptyState`/`Banner`; no crash.
- **Weekend boundary** — `weekend` computed from `now`'s day-of-week; covered by unit tests with injected `now`.
- **Neighborhood mismatch** — filter matches the denormalized `event.neighborhood` string exactly; the sheet's list is the existing hardcoded Brooklyn set (real-venue-derived neighborhoods are future).
- **Quick-chip vs multi-select divergence** — documented above; All-inactive is acceptable.

## Testing

- **Unit:** `applyEventFilters` — each dimension in isolation, combinations, search substring (case-insensitive, across all three fields), date presets at boundaries (injected `now`), empty filters = identity. `hasActiveFilters`. `useDiscoverFilters` store set/reset semantics.
- **Type/build:** `npx tsc --noEmit` clean; existing 55 Jest tests stay green.
- **Manual smoke:** open Discover → live events; type in search → list narrows; open Filters → toggle date/category/neighborhood/hide-21 → count updates → apply → Discover reflects it; Clear all resets; category quick-chips select; header avatar shows the real photo.

## New dependencies & infra

None. No new packages, no Firestore rules changes, no new collections — read-only over the existing `events` collection and rules.

## Out of scope

- Price / "free" filtering (no price model).
- Custom date-range picker.
- Deriving the neighborhood list from real venues.
- Server-side filtered queries / composite indexes.
- The static "Brooklyn, NY" header location (decorative, like onboarding's member count).
