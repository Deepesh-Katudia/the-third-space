# Social Graph (Follows & Connections) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Follow button, Connections stat, Connector badge, and a new connections list screen real, backed by a `follows` Firestore collection.

**Architecture:** One top-level `follows/{followerUid_targetUid}` doc per edge (deterministic composite ID, mirrors the `conversations` pattern). Connections = client-side intersection of two live queries ("who I follow" ∩ "who follows me") via a pure helper — no counters, no cross-user writes, no Cloud Functions. Spec: `docs/superpowers/specs/2026-07-04-social-graph-design.md`.

**Tech Stack:** Expo SDK 54 / RN 0.81, TypeScript 5.7, Firebase v11 (client SDK + security rules), Jest (jest-expo) + @testing-library/react-native + @firebase/rules-unit-testing.

## Global Constraints

- All commands run from `thirdspace-app/` (repo root is `E:\Claude\The_Third_Space`).
- **No new packages. No composite indexes** (single-field `where` filters only, never add `orderBy` to follows queries).
- Code style: no semicolons, single quotes, 2-space indent — match surrounding files exactly.
- Copy: button labels are exactly `Follow` / `Following`; the Connector badge unlocks at **3** mutual connections (`CONNECTOR_THRESHOLD = 3`).
- `npx tsc --noEmit` must be clean after every task; full suite `npx jest` must stay green.
- Rules tests run via `npm run test:rules` (starts the Firestore emulator; requires Java). If the emulator can't start in your environment, still write the tests, run `npx tsc --noEmit`, and note "rules tests not executed locally" in the commit body — do NOT skip writing them.
- Screens (`app/**`) are not unit-tested in this repo (existing convention). Pure utils, services, and hooks are.
- Never swallow errors: subscriptions take an `onError` that sets a `hasError` flag surfaced in UI.

---

### Task 1: `Follow` type + pure helpers `utils/follows.ts`

**Files:**
- Modify: `types/models.ts` (append after the Points & Badges section, ~line 98)
- Create: `utils/follows.ts`
- Test: `__tests__/utils/follows.test.ts`

**Interfaces:**
- Consumes: `Timestamp` from `firebase/firestore` (already imported in models.ts).
- Produces: `Follow` interface; `followDocId(follower: string, target: string): string`; `mutualConnections(followingUids: string[], followerUids: string[]): string[]`. Tasks 2, 4 import these.

- [ ] **Step 1: Write the failing test**

Create `__tests__/utils/follows.test.ts`:

```typescript
import { followDocId, mutualConnections } from '../../utils/follows'

describe('followDocId', () => {
  it('joins follower and target with an underscore, in that order', () => {
    expect(followDocId('alice', 'bob')).toBe('alice_bob')
    expect(followDocId('bob', 'alice')).toBe('bob_alice')
  })
})

describe('mutualConnections', () => {
  it('returns only uids present in both lists', () => {
    expect(mutualConnections(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c'])
  })

  it('returns empty for disjoint lists', () => {
    expect(mutualConnections(['a', 'b'], ['c', 'd'])).toEqual([])
  })

  it('returns empty when either list is empty', () => {
    expect(mutualConnections([], ['a'])).toEqual([])
    expect(mutualConnections(['a'], [])).toEqual([])
  })

  it('preserves the order of the following list', () => {
    expect(mutualConnections(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/follows.test.ts`
Expected: FAIL — `Cannot find module '../../utils/follows'`

- [ ] **Step 3: Write the implementation**

Append to `types/models.ts` (after the `Redemption` interface, before the Chat section):

```typescript
// ── Social graph (sub-project E) ──────────────────────────────────────────
// One doc per follow edge at follows/{followerUid_targetUid}. createdAt is
// null in the local snapshot window before serverTimestamp resolves.
export interface Follow {
  follower: string
  target: string
  createdAt: Timestamp | null
}
```

Create `utils/follows.ts`:

```typescript
export function followDocId(follower: string, target: string): string {
  return `${follower}_${target}`
}

// Connections = mutual follows. Preserves followingUids order for stable UI.
export function mutualConnections(followingUids: string[], followerUids: string[]): string[] {
  const followers = new Set(followerUids)
  return followingUids.filter((uid) => followers.has(uid))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/utils/follows.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Verify types and commit**

Run: `npx tsc --noEmit` — expected: no output.

```bash
git add types/models.ts utils/follows.ts __tests__/utils/follows.test.ts
git commit -m "feat: add Follow model and pure follow/connection helpers"
```

---

### Task 2: `services/follows.ts`

**Files:**
- Create: `services/follows.ts`
- Test: `__tests__/services/follows.test.ts`

**Interfaces:**
- Consumes: `followDocId` from Task 1; `db` from `../firebase/config`.
- Produces (Tasks 3–4 import these exact signatures):
  - `followUser(followerUid: string, targetUid: string): Promise<void>`
  - `unfollowUser(followerUid: string, targetUid: string): Promise<void>`
  - `subscribeFollowStatus(followerUid: string, targetUid: string, onChange: (isFollowing: boolean) => void, onError: () => void): () => void`
  - `subscribeFollowing(uid: string, onChange: (targetUids: string[]) => void, onError: () => void): () => void`
  - `subscribeFollowers(uid: string, onChange: (followerUids: string[]) => void, onError: () => void): () => void`

- [ ] **Step 1: Write the failing test**

Create `__tests__/services/follows.test.ts` (same firestore-mock style as `__tests__/services/profiles.test.ts`):

```typescript
import { setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import {
  followUser, unfollowUser, subscribeFollowStatus, subscribeFollowing, subscribeFollowers,
} from '../../services/follows'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (col: { path: string }, ...constraints: unknown[]) => ({ col, constraints }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__serverTimestamp',
}))

beforeEach(() => jest.clearAllMocks())

describe('followUser', () => {
  it('writes the edge doc at follows/{follower_target} with follower, target, createdAt', async () => {
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)
    await followUser('me', 'you')
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'follows/me_you' },
      { follower: 'me', target: 'you', createdAt: '__serverTimestamp' }
    )
  })

  it('throws on self-follow without writing', async () => {
    await expect(followUser('me', 'me')).rejects.toThrow()
    expect(setDoc).not.toHaveBeenCalled()
  })
})

describe('unfollowUser', () => {
  it('deletes the edge doc at follows/{follower_target}', async () => {
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)
    await unfollowUser('me', 'you')
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'follows/me_you' })
  })
})

describe('subscribeFollowStatus', () => {
  it('emits true when the edge doc exists and false when it does not', () => {
    let handler: (snap: { exists: () => boolean }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_ref, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowStatus('me', 'you', onChange, jest.fn())
    expect((onSnapshot as jest.Mock).mock.calls[0][0]).toEqual({ path: 'follows/me_you' })
    handler({ exists: () => true })
    expect(onChange).toHaveBeenCalledWith(true)
    handler({ exists: () => false })
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

describe('subscribeFollowing', () => {
  it('queries by follower and emits the target uids', () => {
    let handler: (snap: { docs: { data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowing('me', onChange, jest.fn())
    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.constraints).toEqual([{ field: 'follower', op: '==', value: 'me' }])
    handler({ docs: [{ data: () => ({ follower: 'me', target: 'a' }) }, { data: () => ({ follower: 'me', target: 'b' }) }] })
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
  })
})

describe('subscribeFollowers', () => {
  it('queries by target and emits the follower uids', () => {
    let handler: (snap: { docs: { data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowers('me', onChange, jest.fn())
    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.constraints).toEqual([{ field: 'target', op: '==', value: 'me' }])
    handler({ docs: [{ data: () => ({ follower: 'x', target: 'me' }) }] })
    expect(onChange).toHaveBeenCalledWith(['x'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/follows.test.ts`
Expected: FAIL — `Cannot find module '../../services/follows'`

- [ ] **Step 3: Write the implementation**

Create `services/follows.ts`:

```typescript
import {
  collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { followDocId } from '../utils/follows'

export async function followUser(followerUid: string, targetUid: string): Promise<void> {
  if (followerUid === targetUid) throw new Error('Cannot follow yourself')
  await setDoc(doc(db, 'follows', followDocId(followerUid, targetUid)), {
    follower: followerUid,
    target: targetUid,
    createdAt: serverTimestamp(),
  })
}

export async function unfollowUser(followerUid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(db, 'follows', followDocId(followerUid, targetUid)))
}

export function subscribeFollowStatus(
  followerUid: string,
  targetUid: string,
  onChange: (isFollowing: boolean) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'follows', followDocId(followerUid, targetUid)),
    (snap) => onChange(snap.exists()),
    onError
  )
}

export function subscribeFollowing(
  uid: string,
  onChange: (targetUids: string[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'follows'), where('follower', '==', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => (d.data().target as string) ?? '')), onError)
}

export function subscribeFollowers(
  uid: string,
  onChange: (followerUids: string[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'follows'), where('target', '==', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => (d.data().follower as string) ?? '')), onError)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/services/follows.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Verify types and commit**

Run: `npx tsc --noEmit` — expected: no output.

```bash
git add services/follows.ts __tests__/services/follows.test.ts
git commit -m "feat: add follows service (edge writes + status/following/followers subscriptions)"
```

---

### Task 3: `hooks/useFollowStatus.ts`

**Files:**
- Create: `hooks/useFollowStatus.ts`
- Test: `__tests__/hooks/useFollowStatus.test.tsx`

**Interfaces:**
- Consumes: `followUser`, `unfollowUser`, `subscribeFollowStatus` (Task 2); `useAuth` from `./useAuth` (returns `{ user }` with `user.uid`).
- Produces: `useFollowStatus(targetUid: string | undefined): { isFollowing: boolean; loading: boolean; hasError: boolean; toggle: () => Promise<void> }`. Task 6 consumes this. `toggle` rethrows write failures so the screen can show a Banner.

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useFollowStatus.test.tsx`:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useFollowStatus } from '../../hooks/useFollowStatus'
import { followUser, unfollowUser, subscribeFollowStatus } from '../../services/follows'

jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }))
jest.mock('../../services/follows', () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  subscribeFollowStatus: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

function captureStatusCallback() {
  let emit: (v: boolean) => void = () => {}
  let fail: () => void = () => {}
  ;(subscribeFollowStatus as jest.Mock).mockImplementation((_f, _t, onChange, onError) => {
    emit = onChange
    fail = onError
    return jest.fn()
  })
  return { emit: (v: boolean) => emit(v), fail: () => fail() }
}

describe('useFollowStatus', () => {
  it('subscribes to the edge and reflects the emitted status', async () => {
    const cb = captureStatusCallback()
    const { result } = renderHook(() => useFollowStatus('you'))
    expect(subscribeFollowStatus).toHaveBeenCalledWith('me', 'you', expect.any(Function), expect.any(Function))
    act(() => cb.emit(true))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isFollowing).toBe(true)
  })

  it('toggle follows when not following and unfollows when following', async () => {
    const cb = captureStatusCallback()
    ;(followUser as jest.Mock).mockResolvedValue(undefined)
    ;(unfollowUser as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderHook(() => useFollowStatus('you'))
    act(() => cb.emit(false))
    await act(async () => result.current.toggle())
    expect(followUser).toHaveBeenCalledWith('me', 'you')
    act(() => cb.emit(true))
    await act(async () => result.current.toggle())
    expect(unfollowUser).toHaveBeenCalledWith('me', 'you')
  })

  it('does not subscribe and stays inert when the target is yourself', async () => {
    const { result } = renderHook(() => useFollowStatus('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeFollowStatus).not.toHaveBeenCalled()
    expect(result.current.isFollowing).toBe(false)
    await act(async () => result.current.toggle())
    expect(followUser).not.toHaveBeenCalled()
  })

  it('sets hasError when the subscription errors', async () => {
    const cb = captureStatusCallback()
    const { result } = renderHook(() => useFollowStatus('you'))
    act(() => cb.fail())
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(result.current.loading).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useFollowStatus.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useFollowStatus'`

- [ ] **Step 3: Write the implementation**

Create `hooks/useFollowStatus.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react'
import { followUser, unfollowUser, subscribeFollowStatus } from '../services/follows'
import { useAuth } from './useAuth'

export function useFollowStatus(targetUid: string | undefined) {
  const { user } = useAuth()
  const myUid = user?.uid
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!myUid || !targetUid || myUid === targetUid) {
      setIsFollowing(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setHasError(false)
    return subscribeFollowStatus(
      myUid,
      targetUid,
      (following) => { setIsFollowing(following); setLoading(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [myUid, targetUid])

  // Rethrows on failure so the screen can surface a Banner; the button
  // renders subscription state, so a failed write simply never flips it.
  const toggle = useCallback(async () => {
    if (!myUid || !targetUid || myUid === targetUid) return
    if (isFollowing) await unfollowUser(myUid, targetUid)
    else await followUser(myUid, targetUid)
  }, [myUid, targetUid, isFollowing])

  return { isFollowing, loading, hasError, toggle }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useFollowStatus.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Verify types and commit**

Run: `npx tsc --noEmit` — expected: no output.

```bash
git add hooks/useFollowStatus.ts __tests__/hooks/useFollowStatus.test.tsx
git commit -m "feat: add useFollowStatus hook (live edge subscription + toggle)"
```

---

### Task 4: `hooks/useConnections.ts`

**Files:**
- Create: `hooks/useConnections.ts`
- Test: `__tests__/hooks/useConnections.test.tsx`

**Interfaces:**
- Consumes: `subscribeFollowing`, `subscribeFollowers` (Task 2); `mutualConnections` (Task 1).
- Produces: `useConnections(uid: string | undefined): { connectionUids: string[]; loading: boolean; hasError: boolean }`. Tasks 5, 7, 8 consume this.

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useConnections.test.tsx`:

```typescript
import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useConnections } from '../../hooks/useConnections'
import { subscribeFollowing, subscribeFollowers } from '../../services/follows'

jest.mock('../../services/follows', () => ({
  subscribeFollowing: jest.fn(),
  subscribeFollowers: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

function captureBoth() {
  let emitFollowing: (uids: string[]) => void = () => {}
  let failFollowing: () => void = () => {}
  let emitFollowers: (uids: string[]) => void = () => {}
  const unsubFollowing = jest.fn()
  const unsubFollowers = jest.fn()
  ;(subscribeFollowing as jest.Mock).mockImplementation((_uid, onChange, onError) => {
    emitFollowing = onChange
    failFollowing = onError
    return unsubFollowing
  })
  ;(subscribeFollowers as jest.Mock).mockImplementation((_uid, onChange) => {
    emitFollowers = onChange
    return unsubFollowers
  })
  return {
    emitFollowing: (u: string[]) => emitFollowing(u),
    failFollowing: () => failFollowing(),
    emitFollowers: (u: string[]) => emitFollowers(u),
    unsubFollowing,
    unsubFollowers,
  }
}

describe('useConnections', () => {
  it('stays loading until both subscriptions emit, then intersects', async () => {
    const cb = captureBoth()
    const { result } = renderHook(() => useConnections('me'))
    act(() => cb.emitFollowing(['a', 'b', 'c']))
    expect(result.current.loading).toBe(true)
    act(() => cb.emitFollowers(['b', 'c', 'd']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connectionUids).toEqual(['b', 'c'])
  })

  it('returns empty and does not subscribe when uid is undefined', async () => {
    const { result } = renderHook(() => useConnections(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connectionUids).toEqual([])
    expect(subscribeFollowing).not.toHaveBeenCalled()
    expect(subscribeFollowers).not.toHaveBeenCalled()
  })

  it('sets hasError and stops loading when a subscription errors', async () => {
    const cb = captureBoth()
    const { result } = renderHook(() => useConnections('me'))
    act(() => cb.failFollowing())
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(result.current.loading).toBe(false)
  })

  it('unsubscribes from both queries on unmount', () => {
    const cb = captureBoth()
    const { unmount } = renderHook(() => useConnections('me'))
    unmount()
    expect(cb.unsubFollowing).toHaveBeenCalledTimes(1)
    expect(cb.unsubFollowers).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useConnections.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useConnections'`

- [ ] **Step 3: Write the implementation**

Create `hooks/useConnections.ts`:

```typescript
import { useEffect, useMemo, useState } from 'react'
import { subscribeFollowing, subscribeFollowers } from '../services/follows'
import { mutualConnections } from '../utils/follows'

// null = subscription has not emitted its first snapshot yet.
export function useConnections(uid: string | undefined) {
  const [followingUids, setFollowingUids] = useState<string[] | null>(null)
  const [followerUids, setFollowerUids] = useState<string[] | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setFollowingUids([])
      setFollowerUids([])
      setHasError(false)
      return
    }
    setFollowingUids(null)
    setFollowerUids(null)
    setHasError(false)
    const unsubFollowing = subscribeFollowing(uid, setFollowingUids, () => setHasError(true))
    const unsubFollowers = subscribeFollowers(uid, setFollowerUids, () => setHasError(true))
    return () => {
      unsubFollowing()
      unsubFollowers()
    }
  }, [uid])

  const connectionUids = useMemo(
    () => mutualConnections(followingUids ?? [], followerUids ?? []),
    [followingUids, followerUids]
  )
  const loading = !hasError && (followingUids === null || followerUids === null)

  return { connectionUids, loading, hasError }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useConnections.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Verify types and commit**

Run: `npx tsc --noEmit` — expected: no output.

```bash
git add hooks/useConnections.ts __tests__/hooks/useConnections.test.tsx
git commit -m "feat: add useConnections hook (live mutual-follow intersection)"
```

---

### Task 5: Connector badge goes live (`utils/badges.ts` + `badges.tsx`)

**Files:**
- Modify: `utils/badges.ts`
- Modify: `app/(app)/badges.tsx` (imports ~lines 11-17, hook block ~lines 20-27, `computeBadges` call ~line 45)
- Test: `__tests__/utils/badges.test.ts`

**Interfaces:**
- Consumes: `useConnections` (Task 4).
- Produces: `computeBadges(attendedEvents: CommunityEvent[], tier: Tier, connectionsCount: number): Badge[]` — note the **new third parameter**; every call site must pass it.

- [ ] **Step 1: Update the tests (failing first)**

In `__tests__/utils/badges.test.ts`:

1. Add `0` as the third argument to **every** existing `computeBadges(...)` call (7 call sites, e.g. `computeBadges([], 'Newcomer')` → `computeBadges([], 'Newcomer', 0)`).
2. Replace the final test (`'keeps Connector, Top rated, and Host hero permanently locked'`) with:

```typescript
  it('unlocks Connector at 3+ mutual connections', () => {
    expect(computeBadges([], 'Newcomer', 2).find((b) => b.id === 'connector')?.earned).toBe(false)
    expect(computeBadges([], 'Newcomer', 3).find((b) => b.id === 'connector')?.earned).toBe(true)
  })

  it('keeps Top rated and Host hero permanently locked', () => {
    const badges = computeBadges([event({ id: 'e1' })], 'Insider', 99)
    expect(badges.find((b) => b.id === 'top-rated')?.earned).toBe(false)
    expect(badges.find((b) => b.id === 'host-hero')?.earned).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/badges.test.ts`
Expected: FAIL — TypeScript/runtime: `computeBadges` receives 3 args but accepts 2; Connector assertions fail.

- [ ] **Step 3: Update `utils/badges.ts`**

```typescript
import { Badge } from '../components/BadgeGrid'
import { CommunityEvent, Tier } from '../types/models'

const FIVE_IN_A_ROW_THRESHOLD = 5
const CREATIVE_SOUL_THRESHOLD = 3
const NIGHT_OWL_HOUR = 21
const CONNECTOR_THRESHOLD = 3

export function computeBadges(attendedEvents: CommunityEvent[], tier: Tier, connectionsCount: number): Badge[] {
  const creativeCount = attendedEvents.filter((e) => e.category === 'Creative Arts').length
  const hasNightEvent = attendedEvents.some((e) => e.startsAt.toDate().getHours() >= NIGHT_OWL_HOUR)

  return [
    { id: 'first-event', icon: '🌱', label: 'First event', earned: attendedEvents.length >= 1 },
    { id: 'five-in-a-row', icon: '🔥', label: '5 in a row', earned: attendedEvents.length >= FIVE_IN_A_ROW_THRESHOLD },
    { id: 'creative-soul', icon: '🎨', label: 'Creative soul', earned: creativeCount >= CREATIVE_SOUL_THRESHOLD },
    { id: 'night-owl', icon: '🌙', label: 'Night owl', earned: hasNightEvent },
    { id: 'connector', icon: '🤝', label: 'Connector', earned: connectionsCount >= CONNECTOR_THRESHOLD },
    { id: 'top-rated', icon: '⭐', label: 'Top rated', earned: false },
    { id: 'host-hero', icon: '🏆', label: 'Host hero', earned: false },
    { id: 'insider', icon: '💎', label: 'Insider', earned: tier === 'Insider' },
  ]
}
```

- [ ] **Step 4: Wire `app/(app)/badges.tsx`**

Add the import (after the `useAttendanceStats` import on line 13):

```typescript
import { useConnections } from '../../hooks/useConnections'
```

Inside `Badges()`, after the `useAttendanceStats` line (line 23), add:

```typescript
  const { connectionUids, loading: connectionsLoading } = useConnections(user?.uid)
```

Change the loading gate (line 27) to:

```typescript
  if (profileLoading || attendanceLoading || connectionsLoading) return <LoadingView />
```

Change the `computeBadges` call (line 45) to:

```typescript
  const badges = computeBadges(attendedEvents, profile.tier, connectionUids.length)
```

(A connections read error leaves `connectionUids` empty → Connector simply renders locked; no fake count is *displayed*, matching the spec.)

- [ ] **Step 5: Run tests, verify types, commit**

Run: `npx jest __tests__/utils/badges.test.ts` — expected: PASS (8 tests).
Run: `npx tsc --noEmit` — expected: no output (this proves the `badges.tsx` call site was updated).

```bash
git add utils/badges.ts app/\(app\)/badges.tsx __tests__/utils/badges.test.ts
git commit -m "feat: unlock the Connector badge from real mutual connections"
```

---

### Task 6: Controlled Follow button (`MemberProfileCard` + `member/[uid].tsx`)

**Files:**
- Modify: `components/MemberProfileCard.tsx`
- Modify: `app/(app)/member/[uid].tsx`

**Interfaces:**
- Consumes: `useFollowStatus` (Task 3); existing `Banner` component (`{ message: string }`).
- Produces: `MemberProfileCardProps` becomes `{ member: Member; isFollowing: boolean; onToggleFollow: () => void; onMessage: () => void; showActions: boolean }`. `member/[uid].tsx` is its only consumer.

- [ ] **Step 1: Make `MemberProfileCard` controlled**

In `components/MemberProfileCard.tsx`:

1. Change the react import (line 1) to `import React from 'react'` (drop `useState`).
2. Replace the props interface and the component signature/body top:

```typescript
interface MemberProfileCardProps {
  member: Member
  isFollowing: boolean
  onToggleFollow: () => void
  onMessage: () => void
  showActions: boolean
}

export function MemberProfileCard({ member, isFollowing, onToggleFollow, onMessage, showActions }: MemberProfileCardProps) {
  const tint = avatarColor(member.name)
```

(Delete the `const [following, setFollowing] = useState(false)` line.)

3. Replace the actions block (the `<View style={styles.actions}>` JSX) with:

```tsx
        {showActions ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={onToggleFollow}
            >
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn} onPress={onMessage}>
              <Text style={styles.messageText}>Message request</Text>
            </TouchableOpacity>
          </View>
        ) : null}
```

Styles are unchanged. The component keeps zero Firebase imports (pure presentation).

- [ ] **Step 2: Wire `app/(app)/member/[uid].tsx`**

1. Change the react import (line 1) to `import React, { useState } from 'react'`.
2. Add imports (after the `dmConversationId` import on line 11):

```typescript
import { Banner } from '../../../components/Banner'
import { useFollowStatus } from '../../../hooks/useFollowStatus'
```

3. Inside `MemberProfile()`, after the `useAuth()` line (line 17), add:

```typescript
  const { isFollowing, toggle } = useFollowStatus(uid)
  const [banner, setBanner] = useState('')

  const handleToggleFollow = async () => {
    setBanner('')
    try {
      await toggle()
    } catch {
      setBanner("Couldn't update follow. Check your connection and try again.")
    }
  }
```

4. In the JSX, immediately above `<MemberProfileCard`, add:

```tsx
        {banner ? <Banner message={banner} /> : null}
```

5. Update the `<MemberProfileCard>` element to:

```tsx
        <MemberProfileCard
          member={member}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          showActions={Boolean(user?.uid && uid && user.uid !== uid)}
          onMessage={() => {
            if (!user?.uid || !uid || user.uid === uid) return
            router.push({ pathname: '/(app)/chat/[id]', params: { id: dmConversationId(user.uid, uid), kind: 'dm', name: profile.displayName } })
          }}
        />
```

- [ ] **Step 3: Verify types and full suite**

Run: `npx tsc --noEmit` — expected: no output.
Run: `npx jest` — expected: all suites PASS (screens/components have no new tests; this catches accidental breakage).

- [ ] **Step 4: Commit**

```bash
git add components/MemberProfileCard.tsx app/\(app\)/member/\[uid\].tsx
git commit -m "feat: wire the Follow button to real follow state"
```

---

### Task 7: Connections list screen (`app/(app)/connections.tsx`)

**Files:**
- Create: `app/(app)/connections.tsx`

**Interfaces:**
- Consumes: `useConnections` (Task 4), `useProfile`, `useAuth`, `EmptyState { emoji, title, body }`, `LoadingView`, `avatarColor`/`initials` from `utils/avatar`.
- Produces: route `/(app)/connections` (expo-router auto-registers; no `_layout.tsx` change — it inherits the default non-modal stack entry like `badges.tsx`). Task 8 navigates here.

- [ ] **Step 1: Create the screen**

Create `app/(app)/connections.tsx`:

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { useAuth } from '../../hooks/useAuth'
import { useConnections } from '../../hooks/useConnections'
import { useProfile } from '../../hooks/useProfile'
import { avatarColor, initials } from '../../utils/avatar'

// Resolves its own profile so one failed read renders a neutral placeholder
// row instead of sinking the whole list.
function ConnectionRow({ uid }: { uid: string }) {
  const router = useRouter()
  const { profile } = useProfile(uid)
  const name = profile?.displayName ?? 'Member'

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(app)/member/[uid]', params: { uid } })}
    >
      {profile?.photoURL ? (
        <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.name}>{name}</Text>
        {profile?.neighborhood ? <Text style={styles.neighborhood}>{profile.neighborhood}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function Connections() {
  const router = useRouter()
  const { user } = useAuth()
  const { connectionUids, loading, hasError } = useConnections(user?.uid)

  if (loading) return <LoadingView />

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Connections</Text>
      </View>

      {hasError ? (
        <EmptyState emoji="🛰️" title="Couldn't load connections" body="Check your connection and try again." />
      ) : connectionUids.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="No connections yet"
          body="Follow people you meet at events — when they follow you back, they'll show up here."
        />
      ) : (
        <FlatList
          data={connectionUids}
          keyExtractor={(uid) => uid}
          renderItem={({ item }) => <ConnectionRow uid={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810', letterSpacing: -0.5 },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 18, color: 'white' },
  rowText: { flex: 1 },
  name: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2C1810' },
  neighborhood: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70', marginTop: 1 },
  chevron: { fontSize: 20, color: '#C9B8A8' },
})
```

- [ ] **Step 2: Verify types and full suite**

Run: `npx tsc --noEmit` — expected: no output.
Run: `npx jest` — expected: all suites PASS.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/connections.tsx
git commit -m "feat: add connections list screen"
```

---

### Task 8: Live Connections stat on `profile.tsx`

**Files:**
- Modify: `app/(app)/(attender)/profile.tsx` (imports ~lines 9-13, hook block ~lines 16-23, stats row ~lines 59-65, `Stat` helper ~lines 97-104)

**Interfaces:**
- Consumes: `useConnections` (Task 4); route `/(app)/connections` (Task 7).
- Produces: nothing downstream.

- [ ] **Step 1: Wire the stat**

1. Add the import (after the `useAttendanceStats` import on line 11):

```typescript
import { useConnections } from '../../../hooks/useConnections'
```

2. Inside `Profile()`, after the `useAttendanceStats` line (line 20), add:

```typescript
  const { connectionUids, loading: connectionsLoading, hasError: connectionsHasError } = useConnections(user?.uid)
```

3. Replace the stats row (lines 59–65) with — loading/error shows `—`, never a fake `0`:

```tsx
        <View style={styles.statsRow}>
          <Stat value={attendedEvents.length} label="Attended" />
          <View style={styles.statDivider} />
          <Stat value={0} label="Hosted" />
          <View style={styles.statDivider} />
          <Stat
            value={connectionsLoading || connectionsHasError ? '—' : connectionUids.length}
            label="Connections"
            onPress={() => router.push('/(app)/connections')}
          />
        </View>
```

4. Replace the `Stat` helper (lines 97–104) with a press-aware version:

```tsx
function Stat({ value, label, onPress }: { value: number | string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress} disabled={!onPress}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  )
}
```

(`TouchableOpacity` is already imported in this file.)

- [ ] **Step 2: Verify types and full suite**

Run: `npx tsc --noEmit` — expected: no output.
Run: `npx jest` — expected: all suites PASS.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(attender)/profile.tsx"
git commit -m "feat: show real connections count on profile, tappable to the list"
```

---

### Task 9: Firestore rules for `follows` + rules tests

**Files:**
- Modify: `firestore.rules` (insert after the `users/{uid}/chatReads` block, before the closing braces)
- Test: `__tests__/rules/firestore.rules.test.ts` (append tests; add `deleteDoc` to the firestore import on line 2)

**Interfaces:**
- Consumes: existing `signedIn()` rules helper.
- Produces: security for the `follows` collection. **Manual deploy required after merge:** `firebase deploy --only firestore:rules`.

- [ ] **Step 1: Write the failing rules tests**

In `__tests__/rules/firestore.rules.test.ts`, change line 2 to:

```typescript
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
```

Append at the end of the file:

```typescript
test('a user can create their own follow edge with a matching id', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'follows/me_you'), { follower: 'me', target: 'you' }))
})

test('a user cannot forge a follow from someone else or mismatch the doc id', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/you_me'), { follower: 'you', target: 'me' }))
  await assertFails(setDoc(doc(me, 'follows/me_you'), { follower: 'me', target: 'someoneelse' }))
})

test('a user cannot follow themselves', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/me_me'), { follower: 'me', target: 'me' }))
})

test('a user can delete their own follow edge; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'follows/me_you'), { follower: 'me', target: 'you' })
  })
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertFails(deleteDoc(doc(stranger, 'follows/me_you')))
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(deleteDoc(doc(me, 'follows/me_you')))
})

test('any signed-in user can read follow edges', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'follows/me_you'), { follower: 'me', target: 'you' })
  })
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(getDoc(doc(stranger, 'follows/me_you')))
})
```

- [ ] **Step 2: Run rules tests to verify the new ones fail**

Run: `npm run test:rules`
Expected: the 5 new tests FAIL (no `follows` match block → creates/reads denied where the test asserts success). Existing rules tests still PASS.
(If the emulator cannot start locally, proceed — the constraint note in Global Constraints applies.)

- [ ] **Step 3: Add the rules block**

In `firestore.rules`, insert before the final two closing braces (after the `users/{uid}/chatReads/{threadId}` block):

```text
    match /follows/{followId} {
      allow read: if signedIn();
      allow create: if signedIn()
        && request.resource.data.follower == request.auth.uid
        && request.resource.data.target != request.auth.uid
        && followId == request.auth.uid + '_' + request.resource.data.target;
      allow delete: if signedIn() && resource.data.follower == request.auth.uid;
    }
```

(No `update` rule on purpose — an edge either exists or it doesn't.)

- [ ] **Step 4: Run rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS — all rules tests including the 5 new ones.

- [ ] **Step 5: Full verification and commit**

Run: `npx tsc --noEmit` — expected: no output.
Run: `npx jest` — expected: all suites PASS.

```bash
git add firestore.rules __tests__/rules/firestore.rules.test.ts
git commit -m "feat: add security rules for the follows collection"
```

---

## Post-implementation (manual, outside this plan)

1. **Deploy rules:** `firebase deploy --only firestore:rules` — follows will not work in prod until this runs (same as sub-projects C and D).
2. **Two-account smoke test:** A follows B → button flips to Following and survives an app restart; B follows A back → both see Connections = 1 and each other in the connections list; unfollow → the connection disappears for both; a third mutual connection → 🤝 Connector unlocks on the badges screen.
