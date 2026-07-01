# Points & Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make points, tier, badges, and reward redemption real — points/tier stored on the profile and awarded/revoked by the same trusted batch that already touches `eventsCount` on register/cancel, badges computed live from real attendance history, and redemption logged and functional.

**Architecture:** A pure `utils/points.ts` (tier thresholds/progress) and `utils/badges.ts` (badge-earning rules) hold all business logic and are fully unit-tested. `services/events.ts` gains points/tier writes in its existing `registerForEvent`/`cancelRegistration` batches; `services/profiles.ts` gains a `redeemReward` batch that also writes an append-only `profiles/{uid}/redemptions` log. A new `hooks/useAttendanceStats.ts` extracts the "past registered events" logic already duplicated inline in `profile.tsx`. `firestore.rules` narrows its current blanket block on `points`/`tier` to a bounded-delta + tier-consistency check. `badges.tsx` becomes fully real; `profile.tsx` and `event/[id].tsx` get small consuming changes.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.7, expo-router v6, Firebase v11 (Firestore), Jest + @testing-library/react-native, @firebase/rules-unit-testing.

## Global Constraints

- **Source spec:** `docs/superpowers/specs/2026-07-01-points-badges-design.md`. Every task inherits it.
- **No new dependencies. No new composite indexes.**
- **`firestore.rules` change requires a manual deploy** (`firebase deploy --only firestore:rules`) before the live behavior works against production, same as sub-project C.
- **Points award trigger is registration, not verified attendance** — there's no check-in feature. Cancelling symmetrically revokes.
- **`POINTS_PER_EVENT = 50`; tier thresholds: Newcomer < 500, Regular 500–1499, Insider 1500+.** These exact numbers appear in `utils/points.ts`, the rules helper, and every test — keep them in sync.
- **Reward catalog is hardcoded**, not a Firestore collection: `{ id: 'rw1', label: 'Free drink at Cellar 9', cost: 500 }`, `{ id: 'rw2', label: "$10 off any ticketed event", cost: 800 }`.
- **Rules trust model:** every `points`/`tier` write must change points by exactly one of `{50, -50, -500, -800}` and set `tier` to the value a rules-side `tierFor()` helper (same thresholds) computes for the resulting points. `verified` stays fully blocked, unconditionally.
- **Palette (verbatim, unchanged from Phase 1):** background `#FBF7F2`, dark `#2C1810`, primary `#C4614A`, sage `#7A8C6E`, muted text `#8C7B70`, warm border `rgba(242,197,160,0.5)`.
- **Test pattern:** construct plain objects; for `Timestamp` fields use `{ toDate: () => new Date(...), toMillis: () => n } as unknown as Timestamp`. Mock the relevant `services/*` module for hook tests; mock `../../hooks/useAuth` where a hook/screen reads it. Firestore mocks follow the existing `events.test.ts`/`profiles.test.ts` shape (`doc`/`collection` return `{ path }`, `increment(n)` returns `{ __increment: n }`).
- **Rules tests require the Firestore emulator**: run via `npm run test:rules` (already wired to `firebase-tools emulators:exec`), not plain `npm test` (which ignores `__tests__/rules/`).
- Run `npx tsc --noEmit` clean and keep all existing tests (`npm test`) green before each commit. All commands run from `thirdspace-app/`.

---

## File Structure

**Create:**
- `thirdspace-app/utils/points.ts` — tier thresholds, `tierForPoints`, `tierProgress`
- `thirdspace-app/utils/badges.ts` — `computeBadges`
- `thirdspace-app/hooks/useAttendanceStats.ts` — shared "past attended events" hook
- `thirdspace-app/constants/rewards.ts` — hardcoded reward catalog
- Tests: `__tests__/utils/points.test.ts`, `__tests__/utils/badges.test.ts`, `__tests__/hooks/useAttendanceStats.test.tsx`

**Modify:**
- `thirdspace-app/types/models.ts` — add `Tier`, `Reward`, `Redemption`; `Profile.tier: Tier`
- `thirdspace-app/services/events.ts` — award/revoke points in `registerForEvent`/`cancelRegistration`
- `thirdspace-app/services/profiles.ts` — add `redeemReward`
- `thirdspace-app/firestore.rules` — bounded points/tier update rule + redemptions subcollection
- `thirdspace-app/app/(app)/(attender)/profile.tsx` — use `useAttendanceStats`
- `thirdspace-app/app/(app)/event/[id].tsx` — use shared `POINTS_PER_EVENT`
- `thirdspace-app/app/(app)/badges.tsx` — full real screen
- Tests: `__tests__/services/events.test.ts`, `__tests__/services/profiles.test.ts`, `__tests__/rules/firestore.rules.test.ts`

---

## Task 1: Domain types

**Files:**
- Modify: `thirdspace-app/types/models.ts`
- Test: tsc only

**Interfaces:**
- Produces: `Tier`, `Reward { id, label, cost }`, `Redemption { id, rewardId, label, cost, redeemedAt }`; `Profile.tier` changes from `string` to `Tier`.

- [ ] **Step 1: Change `Profile.tier` and append the new types** in `types/models.ts`

Change this line inside `Profile`:

```typescript
  tier: string
```
to:
```typescript
  tier: Tier
```

Then append after the `Registration` interface (before `Profile`), add the `Tier` type, and after `CreateProfileInput` append `Reward`/`Redemption`:

```typescript
export type Tier = 'Newcomer' | 'Regular' | 'Insider'
```

```typescript
// ── Points & Badges (sub-project D) ───────────────────────────────────────
// The reward catalog is a hardcoded constant (constants/rewards.ts), not a
// Firestore collection — Redemption is the only stored record, an
// append-only log at profiles/{uid}/redemptions/{id}.
export interface Reward {
  id: string
  label: string
  cost: number
}

export interface Redemption {
  id: string
  rewardId: string
  label: string
  cost: number
  redeemedAt: Timestamp
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean (no errors) — `Tier` is a subtype of `string`, so every existing read site (e.g. `MemberProfileCard`'s `Member.tier: string`) still accepts it, and `createProfile`'s untyped literal `tier: 'Newcomer'` is unaffected.

- [ ] **Step 3: Commit**

```bash
git add types/models.ts
git commit -m "feat: add Tier/Reward/Redemption types for points & badges"
```

---

## Task 2: `utils/points.ts` — tier thresholds and progress

**Files:**
- Create: `thirdspace-app/utils/points.ts`
- Test: `thirdspace-app/__tests__/utils/points.test.ts`

**Interfaces:**
- Consumes: `Tier` (Task 1).
- Produces:
  - `POINTS_PER_EVENT: number` (= 50)
  - `tierForPoints(points: number): Tier`
  - `interface TierProgress { tier: Tier; nextTier: Tier | null; pointsToNext: number; progress: number }`
  - `tierProgress(points: number): TierProgress`

- [ ] **Step 1: Write the failing test** `__tests__/utils/points.test.ts`

```typescript
import { POINTS_PER_EVENT, tierForPoints, tierProgress } from '../../utils/points'

describe('POINTS_PER_EVENT', () => {
  it('is 50', () => {
    expect(POINTS_PER_EVENT).toBe(50)
  })
})

describe('tierForPoints', () => {
  it('is Newcomer below 500', () => {
    expect(tierForPoints(0)).toBe('Newcomer')
    expect(tierForPoints(499)).toBe('Newcomer')
  })

  it('is Regular from 500 up to 1499', () => {
    expect(tierForPoints(500)).toBe('Regular')
    expect(tierForPoints(1499)).toBe('Regular')
  })

  it('is Insider at 1500 and above', () => {
    expect(tierForPoints(1500)).toBe('Insider')
    expect(tierForPoints(50000)).toBe('Insider')
  })
})

describe('tierProgress', () => {
  it('reports progress toward Regular for a Newcomer', () => {
    const p = tierProgress(250)
    expect(p.tier).toBe('Newcomer')
    expect(p.nextTier).toBe('Regular')
    expect(p.pointsToNext).toBe(250)
    expect(p.progress).toBeCloseTo(0.5)
  })

  it('reports progress toward Insider for a Regular', () => {
    const p = tierProgress(1000)
    expect(p.tier).toBe('Regular')
    expect(p.nextTier).toBe('Insider')
    expect(p.pointsToNext).toBe(500)
    expect(p.progress).toBeCloseTo(0.5)
  })

  it('reports no further tier once Insider', () => {
    const p = tierProgress(2000)
    expect(p.tier).toBe('Insider')
    expect(p.nextTier).toBeNull()
    expect(p.pointsToNext).toBe(0)
    expect(p.progress).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/points.test.ts`
Expected: FAIL — `Cannot find module '../../utils/points'`.

- [ ] **Step 3: Write the implementation** `utils/points.ts`

```typescript
import { Tier } from '../types/models'

export const POINTS_PER_EVENT = 50

const REGULAR_THRESHOLD = 500
const INSIDER_THRESHOLD = 1500

export function tierForPoints(points: number): Tier {
  if (points >= INSIDER_THRESHOLD) return 'Insider'
  if (points >= REGULAR_THRESHOLD) return 'Regular'
  return 'Newcomer'
}

export interface TierProgress {
  tier: Tier
  nextTier: Tier | null
  pointsToNext: number
  progress: number
}

export function tierProgress(points: number): TierProgress {
  const tier = tierForPoints(points)

  if (tier === 'Newcomer') {
    return {
      tier,
      nextTier: 'Regular',
      pointsToNext: REGULAR_THRESHOLD - points,
      progress: points / REGULAR_THRESHOLD,
    }
  }

  if (tier === 'Regular') {
    const span = INSIDER_THRESHOLD - REGULAR_THRESHOLD
    return {
      tier,
      nextTier: 'Insider',
      pointsToNext: INSIDER_THRESHOLD - points,
      progress: (points - REGULAR_THRESHOLD) / span,
    }
  }

  return { tier, nextTier: null, pointsToNext: 0, progress: 1 }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/points.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/points.ts __tests__/utils/points.test.ts
git commit -m "feat: add points/tier threshold utility"
```

---

## Task 3: `utils/badges.ts` — badge-earning rules

**Files:**
- Create: `thirdspace-app/utils/badges.ts`
- Test: `thirdspace-app/__tests__/utils/badges.test.ts`

**Interfaces:**
- Consumes: `Tier` (Task 1), `CommunityEvent` (existing), `Badge` interface from `components/BadgeGrid.tsx` (existing: `{ id: string; icon: string; label: string; earned: boolean }`).
- Produces: `computeBadges(attendedEvents: CommunityEvent[], tier: Tier): Badge[]` — always returns exactly 8 entries in a fixed order.

- [ ] **Step 1: Write the failing test** `__tests__/utils/badges.test.ts`

```typescript
import { Timestamp } from 'firebase/firestore'
import { CommunityEvent } from '../../types/models'
import { computeBadges } from '../../utils/badges'

function event(overrides: Partial<CommunityEvent> & { hour?: number }): CommunityEvent {
  const hour = overrides.hour ?? 14
  return {
    id: overrides.id ?? 'e1',
    title: 'Event',
    description: '',
    category: overrides.category ?? 'Social',
    startsAt: { toDate: () => new Date(2026, 0, 1, hour, 0) } as unknown as Timestamp,
    capacity: 10,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'Venue',
    neighborhood: 'Nbhd',
    registeredCount: 1,
  }
}

describe('computeBadges', () => {
  it('returns all 8 badges locked when there is no attendance history', () => {
    const badges = computeBadges([], 'Newcomer')
    expect(badges).toHaveLength(8)
    expect(badges.every((b) => !b.earned)).toBe(true)
  })

  it('unlocks First event after 1 attended event', () => {
    const badges = computeBadges([event({ id: 'e1' })], 'Newcomer')
    expect(badges.find((b) => b.id === 'first-event')?.earned).toBe(true)
  })

  it('unlocks 5 in a row only at 5+ attended events', () => {
    const four = [1, 2, 3, 4].map((n) => event({ id: `e${n}` }))
    const five = [1, 2, 3, 4, 5].map((n) => event({ id: `e${n}` }))
    expect(computeBadges(four, 'Newcomer').find((b) => b.id === 'five-in-a-row')?.earned).toBe(false)
    expect(computeBadges(five, 'Newcomer').find((b) => b.id === 'five-in-a-row')?.earned).toBe(true)
  })

  it('unlocks Creative soul at 3+ attended Creative Arts events', () => {
    const two = [1, 2].map((n) => event({ id: `e${n}`, category: 'Creative Arts' }))
    const three = [1, 2, 3].map((n) => event({ id: `e${n}`, category: 'Creative Arts' }))
    expect(computeBadges(two, 'Newcomer').find((b) => b.id === 'creative-soul')?.earned).toBe(false)
    expect(computeBadges(three, 'Newcomer').find((b) => b.id === 'creative-soul')?.earned).toBe(true)
  })

  it('unlocks Night owl for an attended event at or after 9pm', () => {
    const evening = [event({ id: 'e1', hour: 21 })]
    const afternoon = [event({ id: 'e1', hour: 14 })]
    expect(computeBadges(evening, 'Newcomer').find((b) => b.id === 'night-owl')?.earned).toBe(true)
    expect(computeBadges(afternoon, 'Newcomer').find((b) => b.id === 'night-owl')?.earned).toBe(false)
  })

  it('unlocks Insider only when the tier is Insider', () => {
    expect(computeBadges([], 'Regular').find((b) => b.id === 'insider')?.earned).toBe(false)
    expect(computeBadges([], 'Insider').find((b) => b.id === 'insider')?.earned).toBe(true)
  })

  it('keeps Connector, Top rated, and Host hero permanently locked', () => {
    const badges = computeBadges([event({ id: 'e1' })], 'Insider')
    expect(badges.find((b) => b.id === 'connector')?.earned).toBe(false)
    expect(badges.find((b) => b.id === 'top-rated')?.earned).toBe(false)
    expect(badges.find((b) => b.id === 'host-hero')?.earned).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/badges.test.ts`
Expected: FAIL — `Cannot find module '../../utils/badges'`.

- [ ] **Step 3: Write the implementation** `utils/badges.ts`

```typescript
import { Badge } from '../components/BadgeGrid'
import { CommunityEvent, Tier } from '../types/models'

const FIVE_IN_A_ROW_THRESHOLD = 5
const CREATIVE_SOUL_THRESHOLD = 3
const NIGHT_OWL_HOUR = 21

export function computeBadges(attendedEvents: CommunityEvent[], tier: Tier): Badge[] {
  const creativeCount = attendedEvents.filter((e) => e.category === 'Creative Arts').length
  const hasNightEvent = attendedEvents.some((e) => e.startsAt.toDate().getHours() >= NIGHT_OWL_HOUR)

  return [
    { id: 'first-event', icon: '🌱', label: 'First event', earned: attendedEvents.length >= 1 },
    { id: 'five-in-a-row', icon: '🔥', label: '5 in a row', earned: attendedEvents.length >= FIVE_IN_A_ROW_THRESHOLD },
    { id: 'creative-soul', icon: '🎨', label: 'Creative soul', earned: creativeCount >= CREATIVE_SOUL_THRESHOLD },
    { id: 'night-owl', icon: '🌙', label: 'Night owl', earned: hasNightEvent },
    { id: 'connector', icon: '🤝', label: 'Connector', earned: false },
    { id: 'top-rated', icon: '⭐', label: 'Top rated', earned: false },
    { id: 'host-hero', icon: '🏆', label: 'Host hero', earned: false },
    { id: 'insider', icon: '💎', label: 'Insider', earned: tier === 'Insider' },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/badges.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/badges.ts __tests__/utils/badges.test.ts
git commit -m "feat: compute badges from real attendance history"
```

---

## Task 4: `hooks/useAttendanceStats.ts`

**Files:**
- Create: `thirdspace-app/hooks/useAttendanceStats.ts`
- Test: `thirdspace-app/__tests__/hooks/useAttendanceStats.test.tsx`

**Interfaces:**
- Consumes: `getMyRegisteredEvents(uid: string): Promise<CommunityEvent[]>` (existing, `services/events.ts`).
- Produces: `useAttendanceStats(uid: string | undefined): { attendedEvents: CommunityEvent[]; loading: boolean }`.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useAttendanceStats.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { useAttendanceStats } from '../../hooks/useAttendanceStats'
import { getMyRegisteredEvents } from '../../services/events'
import { CommunityEvent } from '../../types/models'

jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))

function event(id: string, msFromNow: number): CommunityEvent {
  return {
    id, title: 'E', description: '', category: 'Social',
    startsAt: { toMillis: () => Date.now() + msFromNow } as unknown as Timestamp,
    capacity: 10, ageRequirement: '18+', venueId: 'v1', venueName: 'V', neighborhood: 'N', registeredCount: 1,
  }
}

beforeEach(() => jest.clearAllMocks())

describe('useAttendanceStats', () => {
  it('returns only events that already started', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([
      event('past', -60_000),
      event('future', 60_000),
    ])
    const { result } = renderHook(() => useAttendanceStats('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents.map((e) => e.id)).toEqual(['past'])
  })

  it('returns loading=false with an empty array when uid is undefined', async () => {
    const { result } = renderHook(() => useAttendanceStats(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents).toEqual([])
    expect(getMyRegisteredEvents).not.toHaveBeenCalled()
  })

  it('returns an empty array on fetch failure', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useAttendanceStats('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useAttendanceStats.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useAttendanceStats'`.

- [ ] **Step 3: Write the implementation** `hooks/useAttendanceStats.ts`

```typescript
import { useEffect, useState } from 'react'
import { getMyRegisteredEvents } from '../services/events'
import { CommunityEvent } from '../types/models'

export function useAttendanceStats(uid: string | undefined): { attendedEvents: CommunityEvent[]; loading: boolean } {
  const [attendedEvents, setAttendedEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setAttendedEvents([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    getMyRegisteredEvents(uid)
      .then((events) => {
        if (cancelled) return
        const now = Date.now()
        setAttendedEvents(events.filter((e) => e.startsAt.toMillis() < now))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setAttendedEvents([])
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [uid])

  return { attendedEvents, loading }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useAttendanceStats.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useAttendanceStats.ts __tests__/hooks/useAttendanceStats.test.tsx
git commit -m "feat: add shared attendance-stats hook"
```

---

## Task 5: Award/revoke points in `services/events.ts`

**Files:**
- Modify: `thirdspace-app/services/events.ts`
- Test: Modify `thirdspace-app/__tests__/services/events.test.ts`

**Interfaces:**
- Consumes: `POINTS_PER_EVENT`, `tierForPoints` (Task 2).
- Produces: no new exports — `registerForEvent`/`cancelRegistration` keep their existing signatures; their profile batch write gains `points`/`tier`.

- [ ] **Step 1: Write the failing/updated tests** — replace the two `registerForEvent`/`cancelRegistration` `describe` blocks in `__tests__/services/events.test.ts` with:

```typescript
describe('registerForEvent', () => {
  it('atomically creates the registration, bumps the count, and tracks it on the user', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => undefined })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      expect.objectContaining({ displayName: 'Maya', registeredAt: '__serverTimestamp' })
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'events/e1' },
      { registeredCount: { __increment: 1 } }
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { registeredEventIds: { __arrayUnion: 'e1' } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('writes a denormalized profile snippet and bumps the profile eventsCount', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ photoURL: 'http://x/a.jpg', age: 27, neighborhood: 'Bushwick', interests: ['Art', 'Coffee', 'Film', 'Music'], points: 0 }),
    })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      expect.objectContaining({
        displayName: 'Maya', photoURL: 'http://x/a.jpg', age: 27,
        neighborhood: 'Bushwick', interestsPreview: ['Art', 'Coffee', 'Film'],
      })
    )
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: 1 }, points: { __increment: 50 }, tier: 'Newcomer' },
      { merge: true }
    )
  })

  it('awards points into the next tier when the resulting total crosses a threshold', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 480 }) })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: 1 }, points: { __increment: 50 }, tier: 'Regular' },
      { merge: true }
    )
  })
})

describe('cancelRegistration', () => {
  it('atomically removes the registration, decrements the count, and untracks it', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 100 }) })

    await cancelRegistration('e1', 'u1')

    expect(batch.delete).toHaveBeenCalledWith({ path: 'events/e1/registrations/u1' })
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'events/e1' },
      { registeredCount: { __increment: -1 } }
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { registeredEventIds: { __arrayRemove: 'e1' } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('decrements the profile eventsCount and revokes the points/tier it earned', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 550 }) })

    await cancelRegistration('e1', 'u1')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: -1 }, points: { __increment: -50 }, tier: 'Regular' },
      { merge: true }
    )
  })

  it('treats a missing profile as zero points and never goes negative', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => undefined })

    await cancelRegistration('e1', 'u1')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: -1 }, points: { __increment: -50 }, tier: 'Newcomer' },
      { merge: true }
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/events.test.ts`
Expected: FAIL — the new/updated assertions on `points`/`tier` don't match the current implementation's `batch.set` call, and `cancelRegistration` doesn't call `getDoc` yet (its tests will error on the mock not being consulted / assertion mismatch).

- [ ] **Step 3: Update the implementation** in `services/events.ts`

Add the import at the top:

```typescript
import { POINTS_PER_EVENT, tierForPoints } from '../utils/points'
```

Replace `registerForEvent`'s body from `const batch = writeBatch(db)` onward:

```typescript
export async function registerForEvent(eventId: string, uid: string, displayName: string): Promise<void> {
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  const p = profileSnap.exists() ? profileSnap.data() : undefined
  const currentPoints = (p?.points as number | undefined) ?? 0
  const newPoints = currentPoints + POINTS_PER_EVENT

  const batch = writeBatch(db)
  batch.set(doc(db, 'events', eventId, 'registrations', uid), {
    displayName,
    photoURL: (p?.photoURL as string | null) ?? null,
    age: (p?.age as number | undefined) ?? null,
    neighborhood: (p?.neighborhood as string | undefined) ?? null,
    interestsPreview: ((p?.interests as string[] | undefined) ?? []).slice(0, 3),
    registeredAt: serverTimestamp(),
  })
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayUnion(eventId) })
  batch.set(
    doc(db, 'profiles', uid),
    { eventsCount: increment(1), points: increment(POINTS_PER_EVENT), tier: tierForPoints(newPoints) },
    { merge: true }
  )
  await batch.commit()
}
```

Replace `cancelRegistration` entirely:

```typescript
export async function cancelRegistration(eventId: string, uid: string): Promise<void> {
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  const currentPoints = profileSnap.exists() ? ((profileSnap.data().points as number | undefined) ?? 0) : 0
  const newPoints = Math.max(0, currentPoints - POINTS_PER_EVENT)

  const batch = writeBatch(db)
  batch.delete(doc(db, 'events', eventId, 'registrations', uid))
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(-1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayRemove(eventId) })
  batch.set(
    doc(db, 'profiles', uid),
    { eventsCount: increment(-1), points: increment(-POINTS_PER_EVENT), tier: tierForPoints(newPoints) },
    { merge: true }
  )
  await batch.commit()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/events.test.ts`
Expected: PASS (all tests in the file, including `createEvent`/`deleteEventWithRegistrations` which are unchanged).

- [ ] **Step 5: Verify the full suite and types are still clean**

Run: `npx tsc --noEmit && npx jest`
Expected: clean / all green.

- [ ] **Step 6: Commit**

```bash
git add services/events.ts __tests__/services/events.test.ts
git commit -m "feat: award and revoke points on registration/cancellation"
```

---

## Task 6: `redeemReward` in `services/profiles.ts`

**Files:**
- Modify: `thirdspace-app/services/profiles.ts`
- Test: Modify `thirdspace-app/__tests__/services/profiles.test.ts`

**Interfaces:**
- Consumes: `tierForPoints` (Task 2), `Reward` (Task 1).
- Produces: `redeemReward(uid: string, reward: Reward, currentPoints: number): Promise<void>`.

- [ ] **Step 1: Write the failing test** — update the `jest.mock('firebase/firestore', ...)` factory at the top of `__tests__/services/profiles.test.ts` to add `collection` and `increment`, and make `doc` handle an auto-id call (one argument that is itself a `{ path }` ref, as produced by `collection(...)`):

```typescript
import { writeBatch, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { createProfile, updateProfile, getProfile, subscribeProfile, redeemReward } from '../../services/profiles'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (dbOrRef: unknown, ...segments: string[]) => {
    if (segments.length === 0 && typeof dbOrRef === 'object' && dbOrRef !== null && 'path' in (dbOrRef as { path?: string })) {
      return { path: `${(dbOrRef as { path: string }).path}/auto-id` }
    }
    return { path: segments.join('/') }
  },
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: { fromDate: (d: Date) => ({ __ts: d.getTime() }) },
}))

function mockBatch() {
  return { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
}

beforeEach(() => jest.clearAllMocks())
```

(This changes only the mock factory and the import line; the existing `createProfile`/`getProfile`/`subscribeProfile`/`updateProfile` `describe` blocks below are unchanged.) Then append a new `describe` block at the end of the file:

```typescript
describe('redeemReward', () => {
  it('deducts points, recomputes tier, and logs the redemption', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    const reward = { id: 'rw1', label: 'Free drink at Cellar 9', cost: 500 }

    await redeemReward('u1', reward, 600)

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { points: { __increment: -500 }, tier: 'Newcomer' },
      { merge: true }
    )
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1/redemptions/auto-id' },
      expect.objectContaining({ rewardId: 'rw1', label: 'Free drink at Cellar 9', cost: 500, redeemedAt: '__serverTimestamp' })
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/profiles.test.ts`
Expected: FAIL — `redeemReward` is not exported from `services/profiles`.

- [ ] **Step 3: Write the implementation** — update `services/profiles.ts`

Change the import line at the top:

```typescript
import {
  doc, collection, writeBatch, updateDoc, getDoc, onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { CreateProfileInput, Profile, Reward } from '../types/models'
import { tierForPoints } from '../utils/points'
```

Append this function at the end of the file (after `getProfile`):

```typescript
export async function redeemReward(uid: string, reward: Reward, currentPoints: number): Promise<void> {
  const newPoints = currentPoints - reward.cost

  const batch = writeBatch(db)
  batch.set(
    doc(db, 'profiles', uid),
    { points: increment(-reward.cost), tier: tierForPoints(newPoints) },
    { merge: true }
  )
  batch.set(doc(collection(db, 'profiles', uid, 'redemptions')), {
    rewardId: reward.id,
    label: reward.label,
    cost: reward.cost,
    redeemedAt: serverTimestamp(),
  })
  await batch.commit()
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/profiles.test.ts`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Verify the full suite and types are still clean**

Run: `npx tsc --noEmit && npx jest`
Expected: clean / all green.

- [ ] **Step 6: Commit**

```bash
git add services/profiles.ts __tests__/services/profiles.test.ts
git commit -m "feat: add reward redemption with logged history"
```

---

## Task 7: `firestore.rules` — bounded points/tier + redemptions

**Files:**
- Modify: `thirdspace-app/firestore.rules`
- Test: Modify `thirdspace-app/__tests__/rules/firestore.rules.test.ts`

**Interfaces:**
- No TypeScript interface — this is a rules-language change. The rules-side `tierFor()` helper must mirror `utils/points.ts`'s `tierForPoints` thresholds (500 / 1500) exactly.

- [ ] **Step 1: Write the failing tests** — replace the `owner cannot escalate points/tier/verified on update` test in `__tests__/rules/firestore.rules.test.ts` with:

```typescript
test('owner can update points/tier together with a valid earn/revoke delta', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { bio: 'updated' }))
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { points: 50, tier: 'Newcomer' }))
})

test('owner cannot set points to an arbitrary value, mismatch tier, or escalate verified', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 9999, tier: 'Insider' }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 50, tier: 'Insider' }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { verified: true }))
})

test('owner can create their own redemption log entry; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 500, tier: 'Regular', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(setDoc(doc(me, 'profiles/me/redemptions/r1'), { rewardId: 'rw1', label: 'Free drink', cost: 500 }))
  await assertFails(setDoc(doc(stranger, 'profiles/me/redemptions/r2'), { rewardId: 'rw1', label: 'Free drink', cost: 500 }))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:rules`
Expected: FAIL — the current rules still blanket-block `points`/`tier`, so the two "succeeds" assertions fail; the redemptions match doesn't exist yet, so both redemption assertions fail (create denied for everyone, no rule permits it).

- [ ] **Step 3: Update `firestore.rules`**

Add these two helper functions near the top, after the existing `isEventChatMember` function:

```
    function tierFor(points) {
      return points >= 1500 ? 'Insider' : (points >= 500 ? 'Regular' : 'Newcomer');
    }

    function isValidPointsDelta(delta) {
      return delta == 50 || delta == -50 || delta == -500 || delta == -800;
    }
```

Replace the `profiles/{uid}` match block:

```
    match /profiles/{uid} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      allow update: if signedIn() && request.auth.uid == uid
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['verified'])
        && (
          !request.resource.data.diff(resource.data).affectedKeys().hasAny(['points', 'tier'])
          || (
            isValidPointsDelta(request.resource.data.points - resource.data.points)
            && request.resource.data.tier == tierFor(request.resource.data.points)
          )
        );

      match /redemptions/{redemptionId} {
        allow read, create: if signedIn() && request.auth.uid == uid;
      }
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS (all tests in the file, including the pre-existing profile/registration ones, which are unaffected).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules __tests__/rules/firestore.rules.test.ts
git commit -m "feat: bound points/tier writes to valid deltas, add redemption log rule"
```

**Note for the human operator:** this rules change must be deployed manually with `firebase deploy --only firestore:rules` before points/badges/redemption work against the live app — same manual step as sub-project C's chat rules.

---

## Task 8: `constants/rewards.ts` and the real `badges.tsx` screen

**Files:**
- Create: `thirdspace-app/constants/rewards.ts`
- Modify: `thirdspace-app/app/(app)/badges.tsx`
- Test: manual smoke only (screen composes already-tested units; no new business logic)

**Interfaces:**
- Consumes: `Reward` (Task 1), `tierProgress` (Task 2), `computeBadges` (Task 3), `useAttendanceStats` (Task 4), `redeemReward` (Task 6), `useProfile` (existing), `useAuth` (existing), `BadgeGrid`/`LoadingView`/`Banner` (existing).

- [ ] **Step 1: Create the reward catalog** `constants/rewards.ts`

```typescript
import { Reward } from '../types/models'

export const REWARDS: Reward[] = [
  { id: 'rw1', label: 'Free drink at Cellar 9', cost: 500 },
  { id: 'rw2', label: '$10 off any ticketed event', cost: 800 },
]
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Rewrite `app/(app)/badges.tsx`**

Replace the entire file with:

```typescript
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BadgeGrid } from '../../components/BadgeGrid'
import { LoadingView } from '../../components/LoadingView'
import { Banner } from '../../components/Banner'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useAttendanceStats } from '../../hooks/useAttendanceStats'
import { tierProgress } from '../../utils/points'
import { computeBadges } from '../../utils/badges'
import { redeemReward } from '../../services/profiles'
import { REWARDS } from '../../constants/rewards'

export default function Badges() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile(user?.uid)
  const { attendedEvents, loading: attendanceLoading } = useAttendanceStats(user?.uid)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [banner, setBanner] = useState('')

  if (profileLoading || attendanceLoading || !profile) return <LoadingView />

  const progress = tierProgress(profile.points)
  const badges = computeBadges(attendedEvents, profile.tier)

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (!user || profile.points < cost) return
    const reward = REWARDS.find((r) => r.id === rewardId)
    if (!reward) return
    setRedeemingId(rewardId)
    setBanner('')
    try {
      await redeemReward(user.uid, reward, profile.points)
    } catch {
      setBanner("Couldn't redeem that reward. Try again.")
    } finally {
      setRedeemingId(null)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Points & badges</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#C4614A', '#E8855F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>YOUR POINTS</Text>
          <Text style={styles.heroPoints}>{profile.points.toLocaleString()}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{progress.tier}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress.progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.nextTier ? `${progress.pointsToNext} pts to ${progress.nextTier}` : "You've reached the top tier"}
          </Text>
        </LinearGradient>

        {banner ? <Banner message={banner} /> : null}

        <Text style={styles.sectionLabel}>Badges</Text>
        <BadgeGrid badges={badges} />

        <Text style={styles.sectionLabel}>Redeem</Text>
        {REWARDS.map((r) => {
          const disabled = profile.points < r.cost || redeemingId === r.id
          return (
            <View key={r.id} style={styles.rewardRow}>
              <View style={styles.rewardText}>
                <Text style={styles.rewardLabel}>{r.label}</Text>
                <Text style={styles.rewardCost}>{r.cost} pts</Text>
              </View>
              <TouchableOpacity
                style={[styles.useBtn, disabled && styles.useBtnDisabled]}
                onPress={() => handleRedeem(r.id, r.cost)}
                disabled={disabled}
              >
                <Text style={styles.useText}>{redeemingId === r.id ? '…' : 'Use'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },

  hero: { borderRadius: 22, padding: 24, marginBottom: 28, alignItems: 'center' },
  heroLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8, marginBottom: 6 },
  heroPoints: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 52, color: 'white', letterSpacing: -1 },
  tierBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8, marginBottom: 18 },
  tierText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'white' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: 'white' },
  progressText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  rewardText: { flex: 1 },
  rewardLabel: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 2 },
  rewardCost: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#C4614A' },
  useBtn: { backgroundColor: '#2C1810', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 },
  useBtnDisabled: { opacity: 0.4 },
  useText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FBF7F2' },
})
```

- [ ] **Step 4: Verify build and full test suite**

Run: `npx tsc --noEmit && npx jest`
Expected: clean / all green.

- [ ] **Step 5: Commit**

```bash
git add constants/rewards.ts "app/(app)/badges.tsx"
git commit -m "feat: wire the badges screen to real points, badges, and redemption"
```

---

## Task 9: `profile.tsx` uses the shared attendance hook

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx`

**Interfaces:**
- Consumes: `useAttendanceStats` (Task 4).

- [ ] **Step 1: Replace the inline attendance logic**

Remove the `attendedCount` state and its `useEffect` (lines importing `getMyRegisteredEvents` and computing `attendedCount`):

```typescript
  const [attendedCount, setAttendedCount] = useState(0)

  // Attended = registered events whose start time is in the past.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    getMyRegisteredEvents(user.uid)
      .then((events) => {
        if (cancelled) return
        const now = Date.now()
        setAttendedCount(events.filter((e) => e.startsAt.toMillis() < now).length)
      })
      .catch(() => { if (!cancelled) setAttendedCount(0) })
    return () => { cancelled = true }
  }, [user])
```

Replace with:

```typescript
  const { attendedEvents } = useAttendanceStats(user?.uid)
```

Update the import line — remove `useEffect`/`useState` if no longer used elsewhere in the file (check: `notifications` still uses `useState`, so keep `useState`; `useEffect` is no longer used, so drop it) and remove `getMyRegisteredEvents`:

```typescript
import React, { useState } from 'react'
```
and remove this line:
```typescript
import { getMyRegisteredEvents } from '../../../services/events'
```
add:
```typescript
import { useAttendanceStats } from '../../../hooks/useAttendanceStats'
```

Update the stat row usage:

```typescript
          <Stat value={attendedEvents.length} label="Attended" />
```

- [ ] **Step 2: Verify build and full test suite**

Run: `npx tsc --noEmit && npx jest`
Expected: clean / all green (no test file targets this screen directly today, so no test changes are expected).

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(attender)/profile.tsx"
git commit -m "refactor: share attendance-stats logic between profile and badges"
```

---

## Task 10: `event/[id].tsx` uses the shared points constant

**Files:**
- Modify: `thirdspace-app/app/(app)/event/[id].tsx`

**Interfaces:**
- Consumes: `POINTS_PER_EVENT` (Task 2).

- [ ] **Step 1: Replace the local constant with the shared one**

Remove:

```typescript
// Points awarded for attending — Phase 2 will compute this server-side.
const POINTS_PER_EVENT = 50
```

Add to the imports:

```typescript
import { POINTS_PER_EVENT } from '../../../utils/points'
```

- [ ] **Step 2: Verify build and full test suite**

Run: `npx tsc --noEmit && npx jest`
Expected: clean / all green.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/event/[id].tsx"
git commit -m "refactor: use the shared POINTS_PER_EVENT constant"
```

---

## Final Verification

- [ ] Run the full non-rules suite: `npx jest` — all green.
- [ ] Run the rules suite: `npm run test:rules` — all green.
- [ ] Run `npx tsc --noEmit` — clean.
- [ ] Manual smoke (per spec): register for an event → points +50 and tier updates on the badges screen; cancel → points −50; redeem a reward with enough points → balance drops; redeem attempt without enough points → button disabled; badges unlock as attendance criteria are met.
- [ ] Remind the operator: `firebase deploy --only firestore:rules` is required before any of this works against the live Firebase project.
