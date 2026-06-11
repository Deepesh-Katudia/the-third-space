# Role Dashboards (Attender Feed + Hoster Venue Portal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder app home with working role dashboards: venue partners create free events, attenders discover and register for them in a live feed, and venues see who registered.

**Architecture:** Expo Router tab groups per role under `app/(app)/` with role/venue guards via redirects. All Firestore access lives in `services/` (screens never import Firestore directly). Events are denormalized (venue name + neighborhood copied on), registrations live in a subcollection, and registering is one atomic `writeBatch`.

**Tech Stack:** Expo SDK 54 (DO NOT upgrade), expo-router ~6 (typed routes), Firebase JS SDK v11 (Auth + Firestore), jest-expo + @testing-library/react-native, @react-native-community/datetimepicker.

**Spec:** `docs/superpowers/specs/2026-06-10-role-dashboards-design.md`

**Working directory for ALL commands:** `E:\Claude\The_Third_Space\thirdspace-app`

**Existing code you build on (read these first):**
- `hooks/useAuth.ts` — returns `{ user, role, loading }`, role is `'attender' | 'hoster' | null`
- `firebase/config.ts` — exports `auth`, `db`
- `components/FormInput.tsx`, `components/AuthButton.tsx` — reuse for forms/CTAs
- Visual language: bg `#FBF7F2`, accent `#C4614A`, text `#2C1810`, muted `#8C7B70`, headings `DMSerifDisplay_400Regular`, body `DMSans_400Regular`/`DMSans_300Light`

**Note on typed routes:** expo-router generates route types when the dev server runs. After tasks that add/remove route files, if `npx tsc --noEmit` complains about an href that definitely exists, run `npx expo start` for ~10 seconds (until "Waiting on http://localhost:8081"), stop it (Ctrl+C), and re-run tsc.

---

### Task 1: Dependencies, types, and category constants

**Files:**
- Create: `types/models.ts`
- Create: `constants/categories.ts`

- [ ] **Step 1: Install the date/time picker (Expo Go compatible)**

Run: `npx expo install @react-native-community/datetimepicker`
Expected: package added to package.json with an SDK-54-compatible version.

- [ ] **Step 2: Create `types/models.ts`**

```ts
import { Timestamp } from 'firebase/firestore'

export type EventCategory =
  | 'Creative Arts'
  | 'Fitness'
  | 'Social'
  | 'Nightlife'
  | 'Food & Drink'
  | 'Music'
  | 'Outdoors'
  | 'Learning'
  | 'Wellness'

export type AgeRequirement = '18+' | '21+'

export interface Venue {
  name: string
  borough: string
  neighborhood: string
  description: string
}

export interface CommunityEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  startsAt: Timestamp
  capacity: number
  ageRequirement: AgeRequirement
  venueId: string
  venueName: string
  neighborhood: string
  registeredCount: number
}

export interface Registration {
  uid: string
  displayName: string
}
```

- [ ] **Step 3: Create `constants/categories.ts`**

```ts
import { EventCategory } from '../types/models'

export const EVENT_CATEGORIES: EventCategory[] = [
  'Creative Arts',
  'Fitness',
  'Social',
  'Nightlife',
  'Food & Drink',
  'Music',
  'Outdoors',
  'Learning',
  'Wellness',
]

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Creative Arts': '#C4614A',
  Fitness: '#5B8C5A',
  Social: '#C99A2E',
  Nightlife: '#6B5B95',
  'Food & Drink': '#B5651D',
  Music: '#3F6C9B',
  Outdoors: '#4E7E62',
  Learning: '#7A6A8A',
  Wellness: '#588B8B',
}

export const BOROUGHS = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add types/models.ts constants/categories.ts package.json package-lock.json
git commit -m "feat: add event/venue domain types and category constants"
```

---

### Task 2: Event display helpers (TDD)

**Files:**
- Create: `utils/eventHelpers.ts`
- Test: `__tests__/utils/eventHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/utils/eventHelpers.test.ts`:

```ts
import { formatEventDate, isStartingSoon, spotsLeftText } from '../../utils/eventHelpers'

describe('isStartingSoon', () => {
  const now = new Date('2026-06-10T12:00:00')

  it('returns true when the event starts within 24 hours', () => {
    expect(isStartingSoon(new Date('2026-06-10T18:00:00'), now)).toBe(true)
    expect(isStartingSoon(new Date('2026-06-11T11:59:00'), now)).toBe(true)
  })

  it('returns false when the event starts more than 24 hours away', () => {
    expect(isStartingSoon(new Date('2026-06-11T12:01:00'), now)).toBe(false)
  })

  it('returns false when the event already started', () => {
    expect(isStartingSoon(new Date('2026-06-10T11:00:00'), now)).toBe(false)
  })
})

describe('spotsLeftText', () => {
  it('shows remaining spots', () => {
    expect(spotsLeftText(20, 16)).toBe('4 spots left')
  })

  it('uses singular for one spot', () => {
    expect(spotsLeftText(20, 19)).toBe('1 spot left')
  })

  it('shows sold out at capacity', () => {
    expect(spotsLeftText(20, 20)).toBe('Sold out')
    expect(spotsLeftText(20, 25)).toBe('Sold out')
  })
})

describe('formatEventDate', () => {
  it('formats date and time', () => {
    expect(formatEventDate(new Date('2026-06-13T19:00:00'))).toBe('Sat, Jun 13 · 7:00 PM')
  })

  it('formats morning times and pads minutes', () => {
    expect(formatEventDate(new Date('2026-06-14T09:05:00'))).toBe('Sun, Jun 14 · 9:05 AM')
  })

  it('formats midnight as 12 AM', () => {
    expect(formatEventDate(new Date('2026-06-14T00:30:00'))).toBe('Sun, Jun 14 · 12:30 AM')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/utils/eventHelpers.test.ts`
Expected: FAIL — cannot find module '../../utils/eventHelpers'.

- [ ] **Step 3: Implement `utils/eventHelpers.ts`**

```ts
const STARTING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isStartingSoon(startsAt: Date, now: Date): boolean {
  const msUntilStart = startsAt.getTime() - now.getTime()
  return msUntilStart > 0 && msUntilStart <= STARTING_SOON_WINDOW_MS
}

export function spotsLeftText(capacity: number, registeredCount: number): string {
  const remaining = capacity - registeredCount
  if (remaining <= 0) return 'Sold out'
  return remaining === 1 ? '1 spot left' : `${remaining} spots left`
}

export function formatEventDate(date: Date): string {
  const hours24 = date.getHours()
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()} · ${hours12}:${minutes} ${period}`
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/utils/eventHelpers.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/eventHelpers.ts __tests__/utils/eventHelpers.test.ts
git commit -m "feat: add event date/badge/spots display helpers"
```

---

### Task 3: Event form validation (TDD)

**Files:**
- Create: `utils/eventValidation.ts`
- Test: `__tests__/utils/eventValidation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/utils/eventValidation.test.ts`:

```ts
import { validateEventForm } from '../../utils/eventValidation'

const now = new Date('2026-06-10T12:00:00')

const validInput = {
  title: 'Ceramics Night',
  description: 'Hands-on wheel throwing for beginners.',
  category: 'Creative Arts',
  startsAt: new Date('2026-06-20T19:00:00'),
  capacity: '12',
}

describe('validateEventForm', () => {
  it('returns no errors for valid input', () => {
    expect(validateEventForm(validInput, now)).toEqual({})
  })

  it('requires title, description, and category', () => {
    const errors = validateEventForm(
      { ...validInput, title: '  ', description: '', category: '' },
      now
    )
    expect(errors.title).toBe('Title is required.')
    expect(errors.description).toBe('Description is required.')
    expect(errors.category).toBe('Pick a category.')
  })

  it('rejects a start time in the past', () => {
    const errors = validateEventForm(
      { ...validInput, startsAt: new Date('2026-06-09T19:00:00') },
      now
    )
    expect(errors.startsAt).toBe('Event must be in the future.')
  })

  it('rejects non-numeric, fractional, and out-of-range capacity', () => {
    expect(validateEventForm({ ...validInput, capacity: 'abc' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '2.5' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '0' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '501' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/utils/eventValidation.test.ts`
Expected: FAIL — cannot find module '../../utils/eventValidation'.

- [ ] **Step 3: Implement `utils/eventValidation.ts`**

```ts
export interface EventFormErrors {
  title?: string
  description?: string
  category?: string
  startsAt?: string
  capacity?: string
}

export interface EventFormInput {
  title: string
  description: string
  category: string
  startsAt: Date
  capacity: string
}

const CAPACITY_MIN = 1
const CAPACITY_MAX = 500

export function validateEventForm(input: EventFormInput, now: Date = new Date()): EventFormErrors {
  const errors: EventFormErrors = {}

  if (!input.title.trim()) errors.title = 'Title is required.'
  if (!input.description.trim()) errors.description = 'Description is required.'
  if (!input.category) errors.category = 'Pick a category.'
  if (input.startsAt.getTime() <= now.getTime()) errors.startsAt = 'Event must be in the future.'

  const capacity = Number(input.capacity)
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) {
    errors.capacity = 'Capacity must be a whole number between 1 and 500.'
  }

  return errors
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/utils/eventValidation.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/eventValidation.ts __tests__/utils/eventValidation.test.ts
git commit -m "feat: add create-event form validation"
```

---

### Task 4: Venue service and useVenue hook

**Files:**
- Create: `services/venues.ts`
- Create: `hooks/useVenue.ts`

These are thin Firestore wrappers — no unit tests (per spec test scope); they're exercised by the manual loop in Task 13.

- [ ] **Step 1: Create `services/venues.ts`**

```ts
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

export async function saveVenue(uid: string, venue: Venue): Promise<void> {
  await setDoc(
    doc(db, 'venues', uid),
    { ...venue, updatedAt: serverTimestamp() },
    { merge: true }
  )
}
```

- [ ] **Step 2: Create `hooks/useVenue.ts`**

Real-time subscription so the venue-setup gate redirects automatically the moment the venue doc is created.

```ts
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

export function useVenue(uid: string | undefined) {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setVenue(null)
      setLoading(false)
      return
    }
    return onSnapshot(
      doc(db, 'venues', uid),
      (snap) => {
        setVenue(snap.exists() ? (snap.data() as Venue) : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
  }, [uid])

  return { venue, loading }
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add services/venues.ts hooks/useVenue.ts
git commit -m "feat: add venue service and useVenue subscription hook"
```

---

### Task 5: Events service with registration batches (TDD)

**Files:**
- Create: `services/events.ts`
- Test: `__tests__/services/events.test.ts`

- [ ] **Step 1: Write the failing tests for the registration batches**

Create `__tests__/services/events.test.ts`:

```ts
import { writeBatch } from 'firebase/firestore'
import { registerForEvent, cancelRegistration } from '../../services/events'

jest.mock('../../firebase/config', () => ({ db: {} }))

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
  arrayUnion: (value: unknown) => ({ __arrayUnion: value }),
  arrayRemove: (value: unknown) => ({ __arrayRemove: value }),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}))

function mockBatch() {
  return {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }
}

describe('registerForEvent', () => {
  it('atomically creates the registration, bumps the count, and tracks it on the user', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      { displayName: 'Maya', registeredAt: '__serverTimestamp' }
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
})

describe('cancelRegistration', () => {
  it('atomically removes the registration, decrements the count, and untracks it', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

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
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/events.test.ts`
Expected: FAIL — cannot find module '../../services/events'.

- [ ] **Step 3: Implement `services/events.ts` (complete file)**

```ts
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { AgeRequirement, CommunityEvent, EventCategory, Registration, Venue } from '../types/models'

const DELETE_BATCH_SIZE = 400

function toEvent(snap: QueryDocumentSnapshot<DocumentData>): CommunityEvent {
  return { id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) }
}

export interface CreateEventInput {
  title: string
  description: string
  category: EventCategory
  startsAt: Date
  capacity: number
  ageRequirement: AgeRequirement
}

export async function createEvent(venueId: string, venue: Venue, input: CreateEventInput): Promise<void> {
  await addDoc(collection(db, 'events'), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    startsAt: Timestamp.fromDate(input.startsAt),
    capacity: input.capacity,
    ageRequirement: input.ageRequirement,
    venueId,
    venueName: venue.name,
    neighborhood: venue.neighborhood,
    registeredCount: 0,
    createdAt: serverTimestamp(),
  })
}

export function subscribeUpcomingEvents(
  onChange: (events: CommunityEvent[]) => void,
  onError: () => void
): () => void {
  const upcoming = query(
    collection(db, 'events'),
    where('startsAt', '>=', Timestamp.now()),
    orderBy('startsAt', 'asc')
  )
  return onSnapshot(upcoming, (snap) => onChange(snap.docs.map(toEvent)), onError)
}

export function subscribeVenueEvents(
  venueId: string,
  onChange: (events: CommunityEvent[]) => void,
  onError: () => void
): () => void {
  // No orderBy: avoids a composite index. Sorted client-side (venues have few events).
  const own = query(collection(db, 'events'), where('venueId', '==', venueId))
  return onSnapshot(
    own,
    (snap) => {
      const events = snap.docs.map(toEvent)
      events.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
      onChange(events)
    },
    onError
  )
}

export function subscribeEvent(
  eventId: string,
  onChange: (event: CommunityEvent | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'events', eventId),
    (snap) => onChange(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) } : null),
    onError
  )
}

export function subscribeIsRegistered(
  eventId: string,
  uid: string,
  onChange: (isRegistered: boolean) => void
): () => void {
  return onSnapshot(doc(db, 'events', eventId, 'registrations', uid), (snap) => onChange(snap.exists()))
}

export function subscribeRegistrations(
  eventId: string,
  onChange: (registrations: Registration[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, 'events', eventId, 'registrations'),
    (snap) =>
      onChange(snap.docs.map((d) => ({ uid: d.id, displayName: (d.data().displayName as string) ?? 'Member' }))),
    onError
  )
}

export async function registerForEvent(eventId: string, uid: string, displayName: string): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'events', eventId, 'registrations', uid), {
    displayName,
    registeredAt: serverTimestamp(),
  })
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayUnion(eventId) })
  await batch.commit()
}

export async function cancelRegistration(eventId: string, uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'events', eventId, 'registrations', uid))
  batch.update(doc(db, 'events', eventId), { registeredCount: increment(-1) })
  batch.update(doc(db, 'users', uid), { registeredEventIds: arrayRemove(eventId) })
  await batch.commit()
}

export async function deleteEventWithRegistrations(eventId: string): Promise<void> {
  const registrations = await getDocs(collection(db, 'events', eventId, 'registrations'))
  const docs = registrations.docs
  for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db)
    docs.slice(i, i + DELETE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'events', eventId))
}

export async function getMyRegisteredEvents(uid: string): Promise<CommunityEvent[]> {
  const userSnap = await getDoc(doc(db, 'users', uid))
  const ids = ((userSnap.exists() ? userSnap.data().registeredEventIds : undefined) as string[] | undefined) ?? []
  if (ids.length === 0) return []

  const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'events', id))))
  const events: CommunityEvent[] = []
  const missingIds: string[] = []
  snaps.forEach((snap, i) => {
    if (snap.exists()) {
      events.push({ id: snap.id, ...(snap.data() as Omit<CommunityEvent, 'id'>) })
    } else {
      missingIds.push(ids[i])
    }
  })

  // Prune ids for events the venue cancelled (spec: silently skip and clean up).
  if (missingIds.length > 0) {
    await updateDoc(doc(db, 'users', uid), { registeredEventIds: arrayRemove(...missingIds) })
  }

  events.sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
  return events
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/events.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: all suites pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add services/events.ts __tests__/services/events.test.ts
git commit -m "feat: add events service with atomic registration batches"
```

---

### Task 6: Shared UI components (EventCard with tests)

**Files:**
- Create: `components/Banner.tsx`
- Create: `components/EmptyState.tsx`
- Create: `components/LoadingView.tsx`
- Create: `components/CategoryTabs.tsx`
- Create: `components/EventCard.tsx`
- Test: `__tests__/components/EventCard.test.tsx`

- [ ] **Step 1: Create `components/Banner.tsx`**

```tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface BannerProps {
  message: string
  tone?: 'error' | 'success'
}

export function Banner({ message, tone = 'error' }: BannerProps) {
  const isError = tone === 'error'
  return (
    <View style={[styles.banner, isError ? styles.error : styles.success]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  error: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  success: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  text: { fontFamily: 'DMSans_400Regular', fontSize: 14 },
  errorText: { color: '#dc2626' },
  successText: { color: '#16a34a' },
})
```

- [ ] **Step 2: Create `components/EmptyState.tsx`**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface EmptyStateProps {
  emoji: string
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ emoji, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#2C1810', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#8C7B70', textAlign: 'center' },
  action: { marginTop: 20, backgroundColor: '#C4614A', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  actionText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
})
```

- [ ] **Step 3: Create `components/LoadingView.tsx`**

```tsx
import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C4614A" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7F2' },
})
```

- [ ] **Step 4: Create `components/CategoryTabs.tsx`**

```tsx
import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { EVENT_CATEGORIES } from '../constants/categories'
import { EventCategory } from '../types/models'

export type CategoryFilter = 'All' | EventCategory

interface CategoryTabsProps {
  selected: CategoryFilter
  onSelect: (category: CategoryFilter) => void
}

const FILTERS: CategoryFilter[] = ['All', ...EVENT_CATEGORIES]

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((filter) => {
        const isActive = filter === selected
        return (
          <TouchableOpacity
            key={filter}
            onPress={() => onSelect(filter)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 12 },
  chip: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  chipTextActive: { color: 'white' },
})
```

- [ ] **Step 5: Write the failing EventCard tests**

Create `__tests__/components/EventCard.test.tsx`:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { EventCard } from '../../components/EventCard'
import { CommunityEvent } from '../../types/models'

const DAY_MS = 24 * 60 * 60 * 1000

function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return {
    id: 'e1',
    title: 'Ceramics Night',
    description: 'Wheel throwing for beginners.',
    category: 'Creative Arts',
    startsAt: Timestamp.fromDate(new Date(Date.now() + 3 * DAY_MS)),
    capacity: 12,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'Clay Studio',
    neighborhood: 'Williamsburg',
    registeredCount: 4,
    ...overrides,
  }
}

describe('EventCard', () => {
  it('renders title, venue, neighborhood, cost, and going count', () => {
    const { getByText } = render(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(getByText('Ceramics Night')).toBeTruthy()
    expect(getByText('Clay Studio · Williamsburg')).toBeTruthy()
    expect(getByText('Free')).toBeTruthy()
    expect(getByText('4 going')).toBeTruthy()
  })

  it('shows Sold out when at capacity', () => {
    const { getByText } = render(
      <EventCard event={makeEvent({ registeredCount: 12 })} onPress={() => {}} />
    )
    expect(getByText('Sold out')).toBeTruthy()
  })

  it('shows the 21+ badge only for 21+ events', () => {
    const { getByText, queryByText, rerender } = render(
      <EventCard event={makeEvent({ ageRequirement: '21+' })} onPress={() => {}} />
    )
    expect(getByText('21+')).toBeTruthy()
    rerender(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(queryByText('21+')).toBeNull()
  })

  it('shows Starting Soon within 24 hours of start', () => {
    const soon = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000))
    const { getByText, queryByText, rerender } = render(
      <EventCard event={makeEvent({ startsAt: soon })} onPress={() => {}} />
    )
    expect(getByText('Starting Soon')).toBeTruthy()
    rerender(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(queryByText('Starting Soon')).toBeNull()
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx jest __tests__/components/EventCard.test.tsx`
Expected: FAIL — cannot find module '../../components/EventCard'.

- [ ] **Step 7: Implement `components/EventCard.tsx`**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { CATEGORY_COLORS } from '../constants/categories'
import { formatEventDate, isStartingSoon } from '../utils/eventHelpers'

interface EventCardProps {
  event: CommunityEvent
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: CATEGORY_COLORS[event.category] }]}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
        {isStartingSoon(startsAt, new Date()) ? <Text style={styles.soonBadge}>Starting Soon</Text> : null}
        {event.ageRequirement === '21+' ? <Text style={styles.ageBadge}>21+</Text> : null}
      </View>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.venue}>{event.venueName} · {event.neighborhood}</Text>
      <Text style={styles.date}>{formatEventDate(startsAt)}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.cost}>Free</Text>
        <Text style={[styles.going, soldOut && styles.soldOut]}>
          {soldOut ? 'Sold out' : `${event.registeredCount} going`}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
  soonBadge: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#C4614A' },
  ageBadge: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B5B95', marginLeft: 'auto' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 4 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginBottom: 2 },
  date: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cost: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#5B8C5A' },
  going: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  soldOut: { color: '#dc2626' },
})
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest __tests__/components/EventCard.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 9: Commit**

```bash
git add components/Banner.tsx components/EmptyState.tsx components/LoadingView.tsx components/CategoryTabs.tsx components/EventCard.tsx __tests__/components/EventCard.test.tsx
git commit -m "feat: add shared dashboard UI components with EventCard tests"
```

---

### Task 7: Navigation skeleton — role tab groups, guards, profile screen

**Files:**
- Modify: `app/(app)/_layout.tsx` (replace entirely)
- Modify: `app/(app)/index.tsx` (replace entirely — becomes role redirect)
- Create: `app/(app)/(attender)/_layout.tsx`
- Create: `app/(app)/(attender)/index.tsx` (placeholder, replaced in Task 10)
- Create: `app/(app)/(attender)/my-events.tsx` (placeholder, replaced in Task 12)
- Create: `app/(app)/(attender)/profile.tsx` (final version now)
- Create: `app/(app)/(hoster)/_layout.tsx`
- Create: `app/(app)/(hoster)/index.tsx` (placeholder, replaced in Task 11)
- Create: `app/(app)/(hoster)/events.tsx` (placeholder, replaced in Task 11)
- Create: `app/(app)/(hoster)/venue.tsx` (placeholder, replaced in Task 12)

- [ ] **Step 1: Replace `app/(app)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
    </Stack>
  )
}
```

- [ ] **Step 2: Replace `app/(app)/index.tsx` with the role redirect**

```tsx
import React from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { LoadingView } from '../../components/LoadingView'

export default function AppIndex() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingView />
  return <Redirect href={role === 'hoster' ? '/(app)/(hoster)' : '/(app)/(attender)'} />
}
```

- [ ] **Step 3: Create `app/(app)/(attender)/_layout.tsx`**

```tsx
import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { LoadingView } from '../../../components/LoadingView'

export default function AttenderLayout() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingView />
  if (role !== 'attender') return <Redirect href="/(app)" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C4614A',
        tabBarInactiveTintColor: '#8C7B70',
        tabBarStyle: { backgroundColor: '#FBF7F2', borderTopColor: 'rgba(242,197,160,0.4)' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Feed', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="my-events"
        options={{ title: 'My Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 4: Create `app/(app)/(hoster)/_layout.tsx` (role guard + venue gate)**

```tsx
import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { LoadingView } from '../../../components/LoadingView'

export default function HosterLayout() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)

  if (loading || venueLoading) return <LoadingView />
  if (role !== 'hoster') return <Redirect href="/(app)" />
  if (!venue) return <Redirect href="/(app)/venue-setup" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C4614A',
        tabBarInactiveTintColor: '#8C7B70',
        tabBarStyle: { backgroundColor: '#FBF7F2', borderTopColor: 'rgba(242,197,160,0.4)' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="venue"
        options={{ title: 'Venue', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
```

- [ ] **Step 5: Create `app/(app)/(attender)/profile.tsx` (final version — moves today's placeholder content)**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'

export default function Profile() {
  const { user } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoCircle}>
        <Text style={styles.logoLetter}>{(user?.displayName ?? 'T')[0].toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{user?.displayName ?? 'Member'}</Text>
      <Text style={styles.email}>{user?.email ?? ''}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>Attender</Text>
      </View>
      <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, color: 'white' },
  name: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', marginBottom: 4 },
  email: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginBottom: 12 },
  roleBadge: { backgroundColor: 'rgba(196,97,74,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 32 },
  roleBadgeText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#C4614A', letterSpacing: 0.5 },
  signOutButton: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
```

- [ ] **Step 6: Create the four placeholder screens (each replaced by a later task)**

Each placeholder is this exact pattern with its own title. Create:

`app/(app)/(attender)/index.tsx` (title "Feed"), `app/(app)/(attender)/my-events.tsx` (title "My Events"), `app/(app)/(hoster)/index.tsx` (title "Overview"), `app/(app)/(hoster)/events.tsx` (title "Events"), `app/(app)/(hoster)/venue.tsx` (title "Venue"):

```tsx
import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Placeholder() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Feed</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810' },
})
```

(Adjust the component name and `<Text>` content per file: `Feed`, `MyEvents`, `Overview`, `HosterEvents`, `VenuePlaceholder`.)

- [ ] **Step 7: Regenerate typed routes and typecheck**

Run: `npx expo start` — wait for "Waiting on http://localhost:8081", then Ctrl+C.
Run: `npx tsc --noEmit`
Expected: no errors. (The `/(app)/venue-setup` and `create-event` hrefs don't exist yet — they are referenced only from files created in Tasks 8/11, not yet. The hoster layout references `/(app)/venue-setup`, which IS referenced now — so create the two stub route files in the next step BEFORE typechecking if tsc complains.)

- [ ] **Step 8: Create stub route files for `venue-setup` and `create-event` so hrefs typecheck**

`app/(app)/venue-setup.tsx`:

```tsx
import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function VenueSetup() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Venue setup</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810' },
})
```

`app/(app)/create-event.tsx`: same pattern, component `CreateEvent`, text "Create event".

Re-run: `npx expo start` (10s, Ctrl+C), then `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Manual smoke test in Expo Go**

Run: `npx expo start --clear`, open on device.
Expected: attender account lands on tab bar with Feed/My Events/Profile; hoster account is redirected to the "Venue setup" stub (no venue doc exists yet). Sign out works from Profile.

- [ ] **Step 10: Run full suite and commit**

Run: `npx jest`
Expected: all pass.

```bash
git add "app/(app)"
git commit -m "feat: role-based tab navigation with venue gate and profile screen"
```

---

### Task 8: Venue form, venue-setup gate screen, and venue edit tab

**Files:**
- Create: `components/VenueForm.tsx`
- Modify: `app/(app)/venue-setup.tsx` (replace stub)
- Modify: `app/(app)/(hoster)/venue.tsx` (replace placeholder)

- [ ] **Step 1: Create `components/VenueForm.tsx` (shared by setup gate and edit tab)**

```tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FormInput } from './FormInput'
import { AuthButton } from './AuthButton'
import { BOROUGHS } from '../constants/categories'
import { Venue } from '../types/models'

interface VenueFormErrors {
  name?: string
  borough?: string
  neighborhood?: string
  description?: string
}

interface VenueFormProps {
  initial?: Venue
  submitLabel: string
  onSubmit: (venue: Venue) => Promise<void>
}

export function VenueForm({ initial, submitLabel, onSubmit }: VenueFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [borough, setBorough] = useState(initial?.borough ?? '')
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<VenueFormErrors>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    const newErrors: VenueFormErrors = {}
    if (!name.trim()) newErrors.name = 'Venue name is required.'
    if (!borough) newErrors.borough = 'Pick a borough.'
    if (!neighborhood.trim()) newErrors.neighborhood = 'Neighborhood is required.'
    if (!description.trim()) newErrors.description = 'A short description is required.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        borough,
        neighborhood: neighborhood.trim(),
        description: description.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View>
      <FormInput label="Venue name" value={name} onChangeText={setName} error={errors.name} placeholder="Clay Studio BK" />
      <Text style={styles.label}>Borough</Text>
      <View style={styles.chipRow}>
        {BOROUGHS.map((b) => (
          <TouchableOpacity
            key={b}
            onPress={() => setBorough(b)}
            style={[styles.chip, borough === b && styles.chipActive]}
          >
            <Text style={[styles.chipText, borough === b && styles.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.borough ? <Text style={styles.errorText}>{errors.borough}</Text> : null}
      <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} error={errors.neighborhood} placeholder="Williamsburg" />
      <FormInput label="About your space" value={description} onChangeText={setDescription} error={errors.description} placeholder="A cozy ceramics studio open to the community" />
      <AuthButton label={submitLabel} onPress={handleSubmit} variant="primary" loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  chipTextActive: { color: 'white' },
  errorText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginBottom: 8 },
})
```

Note: check `components/FormInput.tsx`'s actual props before using — if its error/placeholder prop names differ, match them.

- [ ] **Step 2: Replace `app/(app)/venue-setup.tsx`**

```tsx
import React, { useState } from 'react'
import { Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { saveVenue } from '../../services/venues'
import { VenueForm } from '../../components/VenueForm'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { Venue } from '../../types/models'

export default function VenueSetup() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)
  const [error, setError] = useState('')

  if (loading || venueLoading) return <LoadingView />
  if (role !== 'hoster') return <Redirect href="/(app)" />
  if (venue) return <Redirect href="/(app)/(hoster)" />

  const handleSubmit = async (data: Venue) => {
    setError('')
    try {
      await saveVenue(user!.uid, data)
      // useVenue's snapshot fires -> the venue check above redirects automatically.
    } catch {
      setError("Couldn't save your venue. Check your connection and try again.")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your venue</Text>
        <Text style={styles.subtitle}>This is how your events appear to the community.</Text>
        {error ? <Banner message={error} /> : null}
        <VenueForm submitLabel="Save and continue" onSubmit={handleSubmit} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', marginBottom: 24 },
})
```

- [ ] **Step 3: Replace `app/(app)/(hoster)/venue.tsx` (edit tab)**

```tsx
import React, { useState } from 'react'
import { Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { saveVenue } from '../../../services/venues'
import { VenueForm } from '../../../components/VenueForm'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { Venue } from '../../../types/models'

export default function VenueTab() {
  const { user } = useAuth()
  const { venue, loading } = useVenue(user?.uid)
  const [banner, setBanner] = useState<{ message: string; tone: 'error' | 'success' } | null>(null)

  if (loading || !venue) return <LoadingView />

  const handleSubmit = async (data: Venue) => {
    setBanner(null)
    try {
      await saveVenue(user!.uid, data)
      setBanner({ message: 'Venue updated.', tone: 'success' })
    } catch {
      setBanner({ message: "Couldn't save changes. Try again.", tone: 'error' })
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your venue</Text>
        {banner ? <Banner message={banner.message} tone={banner.tone} /> : null}
        <VenueForm initial={venue} submitLabel="Save changes" onSubmit={handleSubmit} />
        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 24, letterSpacing: -0.5 },
  signOutButton: { marginTop: 24, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
```

The hoster signs out here (the attender signs out from their Profile tab).

Note: editing only updates the `venues/{uid}` doc — existing event cards keep the old denormalized `venueName` (documented spec trade-off).

- [ ] **Step 4: Typecheck, manual test, commit**

Run: `npx tsc --noEmit` — expected: no errors.
Manual: hoster account → venue setup form appears → fill and save → lands on hoster tabs; Venue tab shows saved values; edit + save shows "Venue updated."

```bash
git add components/VenueForm.tsx "app/(app)/venue-setup.tsx" "app/(app)/(hoster)/venue.tsx"
git commit -m "feat: venue setup gate and venue edit tab"
```

---

### Task 9: Create-event screen

**Files:**
- Modify: `app/(app)/create-event.tsx` (replace stub)

- [ ] **Step 1: Replace `app/(app)/create-event.tsx`**

```tsx
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { createEvent } from '../../services/events'
import { validateEventForm, EventFormErrors } from '../../utils/eventValidation'
import { formatEventDate } from '../../utils/eventHelpers'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { AgeRequirement, EventCategory } from '../../types/models'

function defaultStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(19, 0, 0, 0)
  return d
}

export default function CreateEvent() {
  const router = useRouter()
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EventCategory | ''>('')
  const [startsAt, setStartsAt] = useState<Date>(defaultStart)
  const [capacity, setCapacity] = useState('')
  const [ageRequirement, setAgeRequirement] = useState<AgeRequirement>('18+')
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [banner, setBanner] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading || venueLoading) return <LoadingView />
  if (role !== 'hoster' || !venue) return <Redirect href="/(app)" />

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    const mode = pickerMode
    setPickerMode(null)
    if (!selected || !mode) return
    setStartsAt((prev) => {
      const next = new Date(prev)
      if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      return next
    })
  }

  const handleSubmit = async () => {
    const formErrors = validateEventForm({ title, description, category, startsAt, capacity })
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }
    setErrors({})
    setBanner('')
    setSaving(true)
    try {
      await createEvent(user!.uid, venue, {
        title,
        description,
        category: category as EventCategory,
        startsAt,
        capacity: Number(capacity),
        ageRequirement,
      })
      router.back()
    } catch {
      setBanner("Couldn't create the event. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create an event</Text>
        {banner ? <Banner message={banner} /> : null}

        <FormInput label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ceramics Night" />
        <FormInput label="Description" value={description} onChangeText={setDescription} error={errors.description} placeholder="What to expect, what to bring" />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {EVENT_CATEGORIES.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

        <Text style={styles.label}>Date & time</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => setPickerMode('date')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{formatEventDate(startsAt).split(' · ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPickerMode('time')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{formatEventDate(startsAt).split(' · ')[1]}</Text>
          </TouchableOpacity>
        </View>
        {errors.startsAt ? <Text style={styles.errorText}>{errors.startsAt}</Text> : null}
        {pickerMode ? (
          <DateTimePicker
            value={startsAt}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
          />
        ) : null}

        <FormInput label="Capacity" value={capacity} onChangeText={setCapacity} error={errors.capacity} keyboardType="number-pad" placeholder="12" />

        <Text style={styles.label}>Age requirement</Text>
        <View style={styles.chipRow}>
          {(['18+', '21+'] as AgeRequirement[]).map((a) => (
            <TouchableOpacity key={a} onPress={() => setAgeRequirement(a)} style={[styles.chip, ageRequirement === a && styles.chipActive]}>
              <Text style={[styles.chipText, ageRequirement === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.submit}>
          <AuthButton label="Publish event" onPress={handleSubmit} variant="primary" loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 24, paddingBottom: 40 },
  back: { marginBottom: 24 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 24, letterSpacing: -0.5 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  chipTextActive: { color: 'white' },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateButton: { flex: 1, borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: 'white' },
  dateButtonText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810' },
  errorText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginBottom: 8 },
  submit: { marginTop: 8 },
})
```

- [ ] **Step 2: Typecheck and manual test**

Run: `npx tsc --noEmit` — expected: no errors.
Manual: from hoster account, open create-event (navigate manually for now via deep link or wait for Task 11's button), fill the form, publish — check Firestore console shows the event doc with `registeredCount: 0` and denormalized `venueName`.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/create-event.tsx"
git commit -m "feat: create-event form with validation and date/time pickers"
```

---

### Task 10: Attender feed and event detail (both modes)

**Files:**
- Modify: `app/(app)/(attender)/index.tsx` (replace placeholder)
- Create: `app/(app)/event/[id].tsx`

- [ ] **Step 1: Replace `app/(app)/(attender)/index.tsx` with the real feed**

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { CommunityEvent } from '../../../types/models'
import { subscribeUpcomingEvents } from '../../../services/events'
import { CategoryTabs, CategoryFilter } from '../../../components/CategoryTabs'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'

export default function Feed() {
  const router = useRouter()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')

  useEffect(
    () => subscribeUpcomingEvents(setEvents, () => setError("Couldn't load events. Check your connection.")),
    []
  )

  const visible = useMemo(() => {
    if (!events) return []
    const term = search.trim().toLowerCase()
    return events.filter(
      (e) =>
        (category === 'All' || e.category === category) &&
        (!term ||
          e.title.toLowerCase().includes(term) ||
          e.venueName.toLowerCase().includes(term) ||
          e.neighborhood.toLowerCase().includes(term))
    )
  }, [events, search, category])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TextInput
          style={styles.search}
          placeholder="Search events, venues, neighborhoods"
          placeholderTextColor="#8C7B70"
          value={search}
          onChangeText={setSearch}
        />
        <CategoryTabs selected={category} onSelect={setCategory} />
        {error ? <Banner message={error} /> : null}
      </View>
      {!events && !error ? (
        <LoadingView />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              emoji="🗓️"
              title="No events yet"
              body="New events appear here in real time — check back soon."
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 12, letterSpacing: -0.5 },
  search: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810' },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
```

- [ ] **Step 2: Create `app/(app)/event/[id].tsx` (attender register mode + hoster owner mode)**

```tsx
import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import {
  subscribeEvent,
  subscribeIsRegistered,
  subscribeRegistrations,
  registerForEvent,
  cancelRegistration,
  deleteEventWithRegistrations,
} from '../../../services/events'
import { formatEventDate, spotsLeftText } from '../../../utils/eventHelpers'
import { CATEGORY_COLORS } from '../../../constants/categories'
import { AuthButton } from '../../../components/AuthButton'
import { Banner } from '../../../components/Banner'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent, Registration } from '../../../types/models'

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  // undefined = loading, null = not found / cancelled
  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [isRegistered, setIsRegistered] = useState(false)
  const [attendees, setAttendees] = useState<Registration[]>([])
  const [banner, setBanner] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = !!user && !!event && event.venueId === user.uid

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setBanner("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id || !user || isOwner) return
    return subscribeIsRegistered(id, user.uid, setIsRegistered)
  }, [id, user, isOwner])

  useEffect(() => {
    if (!id || !isOwner) return
    return subscribeRegistrations(id, setAttendees, () => setBanner("Couldn't load attendees."))
  }, [id, isOwner])

  if (event === undefined) return <LoadingView />

  if (event === null) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState emoji="🫥" title="Event not found" body="This event may have been cancelled by the venue." />
        <TouchableOpacity onPress={() => router.back()} style={styles.backCenter}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  const handleRegister = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    setSuccess('')
    try {
      await registerForEvent(event.id, user.uid, user.displayName ?? 'Member')
      setSuccess("You're in! See you there.")
    } catch {
      setBanner('Registration failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelRegistration = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    setSuccess('')
    try {
      await cancelRegistration(event.id, user.uid)
    } catch {
      setBanner("Couldn't cancel your registration. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel this event?',
      'This removes the event and all registrations. This cannot be undone.',
      [
        { text: 'Keep event', style: 'cancel' },
        {
          text: 'Cancel event',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventWithRegistrations(event.id)
              router.back()
            } catch {
              setBanner("Couldn't cancel the event. Try again.")
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <View style={[styles.categoryChip, { backgroundColor: CATEGORY_COLORS[event.category] }]}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          {event.ageRequirement === '21+' ? <Text style={styles.ageBadge}>21+</Text> : null}
        </View>

        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.venue}>{event.venueName} · {event.neighborhood}</Text>
        <Text style={styles.date}>{formatEventDate(startsAt)}</Text>
        <Text style={styles.spots}>{spotsLeftText(event.capacity, event.registeredCount)} · Free</Text>
        <Text style={styles.description}>{event.description}</Text>

        {banner ? <Banner message={banner} /> : null}
        {success ? <Banner message={success} tone="success" /> : null}

        {isOwner ? (
          <View>
            <Text style={styles.sectionTitle}>Registered ({attendees.length})</Text>
            {attendees.length === 0 ? (
              <Text style={styles.muted}>No one has registered yet.</Text>
            ) : (
              <FlatList
                data={attendees}
                keyExtractor={(a) => a.uid}
                scrollEnabled={false}
                renderItem={({ item }) => <Text style={styles.attendee}>{item.displayName}</Text>}
              />
            )}
            <View style={styles.ownerActions}>
              <TouchableOpacity onPress={handleCancelEvent} style={styles.cancelEventButton}>
                <Text style={styles.cancelEventText}>Cancel event</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isRegistered ? (
          <AuthButton label="Cancel registration" onPress={handleCancelRegistration} variant="primary" loading={busy} />
        ) : soldOut ? (
          <View style={styles.soldOutBox}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        ) : (
          <AuthButton label="Register — Free" onPress={handleRegister} variant="primary" loading={busy} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 12, paddingBottom: 40 },
  back: { marginBottom: 20 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  categoryChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
  ageBadge: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#6B5B95' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: '#2C1810', marginBottom: 6, letterSpacing: -0.5 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#8C7B70', marginBottom: 4 },
  date: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 4 },
  spots: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#5B8C5A', marginBottom: 16 },
  description: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#2C1810', lineHeight: 22, marginBottom: 24 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12 },
  muted: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#8C7B70' },
  attendee: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(242,197,160,0.4)' },
  ownerActions: { marginTop: 24 },
  cancelEventButton: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  cancelEventText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#dc2626' },
  soldOutBox: { backgroundColor: 'rgba(140,123,112,0.15)', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  soldOutText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#8C7B70' },
})
```

- [ ] **Step 3: Regenerate typed routes, typecheck, run tests**

Run: `npx expo start` (10s, Ctrl+C), then `npx tsc --noEmit && npx jest`
Expected: clean typecheck, all tests pass.

- [ ] **Step 4: Manual test on device**

Attender account: feed shows the event created in Task 9 → tap → detail → Register → "You're in!", count updates → Cancel registration works → register again for the next task.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/(attender)/index.tsx" "app/(app)/event"
git commit -m "feat: live attender feed and event detail with registration"
```

---

### Task 11: Hoster overview and events tabs

**Files:**
- Modify: `app/(app)/(hoster)/index.tsx` (replace placeholder)
- Modify: `app/(app)/(hoster)/events.tsx` (replace placeholder)

- [ ] **Step 1: Replace `app/(app)/(hoster)/index.tsx` (Overview)**

```tsx
import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { AuthButton } from '../../../components/AuthButton'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'

export default function Overview() {
  const router = useRouter()
  const { user } = useAuth()
  const { venue } = useVenue(user?.uid)
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeVenueEvents(user.uid, setEvents, () => setError("Couldn't load your events."))
  }, [user])

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const nextEvent = upcoming[0]
  const totalRegistrations = (events ?? []).reduce((sum, e) => sum + e.registeredCount, 0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{venue?.name ?? 'Your venue'}</Text>
        {error ? <Banner message={error} /> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{events?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Events created</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalRegistrations}</Text>
            <Text style={styles.statLabel}>Total registrations</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Next event</Text>
        {nextEvent ? (
          <EventCard event={nextEvent} onPress={() => router.push(`/(app)/event/${nextEvent.id}`)} />
        ) : (
          <Text style={styles.muted}>Nothing scheduled — create your next event.</Text>
        )}

        <View style={styles.cta}>
          <AuthButton label="Create event" onPress={() => router.push('/(app)/create-event')} variant="primary" loading={false} />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 20, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)' },
  statNumber: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#C4614A' },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70', marginTop: 4 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12 },
  muted: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#8C7B70', marginBottom: 12 },
  cta: { marginTop: 'auto', marginBottom: 24 },
})
```

- [ ] **Step 2: Replace `app/(app)/(hoster)/events.tsx`**

```tsx
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'

export default function HosterEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeVenueEvents(user.uid, setEvents, () => setError("Couldn't load your events."))
  }, [user])

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const past = (events ?? []).filter((e) => e.startsAt.toMillis() < now).reverse()
  const ordered = [...upcoming, ...past]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Your events</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/create-event')} style={styles.createButton}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>
      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}
      <FlatList
        data={ordered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="✨"
            title="No events yet"
            body="Create your first event and it appears in the community feed instantly."
            actionLabel="Create event"
            onAction={() => router.push('/(app)/create-event')}
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, marginBottom: 16 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5 },
  createButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { paddingHorizontal: 24 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
```

- [ ] **Step 3: Typecheck, manual test, commit**

Run: `npx tsc --noEmit` — expected: no errors.
Manual: hoster overview shows venue name, stats, next event; Events tab lists events; + button opens create-event; owner taps an event → sees attendee names from Task 10's registration.

```bash
git add "app/(app)/(hoster)/index.tsx" "app/(app)/(hoster)/events.tsx"
git commit -m "feat: hoster overview and events management tabs"
```

---

### Task 12: Attender My Events tab

**Files:**
- Modify: `app/(app)/(attender)/my-events.tsx` (replace placeholder)

- [ ] **Step 1: Replace `app/(app)/(attender)/my-events.tsx`**

```tsx
import React, { useCallback, useState } from 'react'
import { View, Text, SectionList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { getMyRegisteredEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'

export default function MyEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try {
      setEvents(await getMyRegisteredEvents(user.uid))
      setError('')
    } catch {
      setError("Couldn't load your events. Pull down to retry.")
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const past = (events ?? []).filter((e) => e.startsAt.toMillis() < now).reverse()
  const sections = [
    { title: 'Upcoming', data: upcoming },
    { title: 'Past', data: past },
  ].filter((s) => s.data.length > 0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>My Events</Text>
      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
        )}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={
          <EmptyState
            emoji="🎟️"
            title="No events yet"
            body="Events you register for show up here."
            actionLabel="Browse events"
            onAction={() => router.push('/(app)/(attender)')}
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 12, marginBottom: 16 },
  bannerWrap: { paddingHorizontal: 24 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12, marginTop: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
```

- [ ] **Step 2: Typecheck, run full suite, manual test, commit**

Run: `npx tsc --noEmit && npx jest` — expected: clean, all pass.
Manual: register for an event in the feed → My Events shows it under Upcoming; cancel the event from the hoster account → revisit My Events → the entry disappears (pruned, no crash).

```bash
git add "app/(app)/(attender)/my-events.tsx"
git commit -m "feat: attender My Events tab with cancelled-event pruning"
```

---

### Task 13: Firestore security rules

**Files:**
- Create: `firestore.rules`

- [ ] **Step 1: Create `firestore.rules`**

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isEventOwner(eventId) {
      return get(/databases/$(database)/documents/events/$(eventId)).data.venueId == request.auth.uid;
    }

    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }

    match /venues/{uid} {
      allow read: if signedIn();
      allow create, update: if signedIn() && request.auth.uid == uid;
    }

    match /events/{eventId} {
      allow read: if signedIn();
      allow create: if signedIn()
        && request.resource.data.venueId == request.auth.uid
        && exists(/databases/$(database)/documents/venues/$(request.auth.uid));
      // Owner can update anything; attenders may only touch registeredCount
      // (their registration batch increments it).
      allow update: if signedIn() && (
        resource.data.venueId == request.auth.uid ||
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['registeredCount'])
      );
      allow delete: if signedIn() && resource.data.venueId == request.auth.uid;

      match /registrations/{uid} {
        allow read: if signedIn() && (request.auth.uid == uid || isEventOwner(eventId));
        allow create: if signedIn() && request.auth.uid == uid;
        // Registrant cancels their own; the venue owner deletes all when cancelling the event.
        allow delete: if signedIn() && (request.auth.uid == uid || isEventOwner(eventId));
      }
    }
  }
}
```

- [ ] **Step 2: Deploy the rules (manual console step — no Firebase CLI is configured)**

1. Open https://console.firebase.google.com → the-third-space project
2. Firestore Database → Rules tab
3. Replace the contents with `firestore.rules` exactly → **Publish**

- [ ] **Step 3: Verify rules didn't break the app**

Manual: re-run the loop — attender can load the feed and register; hoster sees attendees and can cancel an event; attempting nothing else should error. If registration fails with "Registration failed. Try again.", the rules `registeredCount` clause is wrong — re-check Step 1 was pasted exactly.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for role dashboards"
```

---

### Task 14: Final verification

- [ ] **Step 1: Full test suite**

Run: `npx jest`
Expected: all suites pass (existing 16 tests + ~19 new).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual end-to-end loop on device (Expo Go)**

1. Sign up a fresh **hoster** account → role select → venue setup gate appears → save venue → lands on Overview
2. Create event (validation errors fire on empty submit; then fill correctly) → appears in Events tab
3. Sign out → sign in as **attender** → feed shows the event with correct card details (category color, venue · neighborhood, date, Free, 0 going)
4. Category tabs filter; search by venue name finds it
5. Open detail → Register → "You're in!" → count shows 1 going
6. My Events shows it under Upcoming
7. Sign back in as hoster → event detail shows the attender's name under Registered (1)
8. Cancel the event → confirm → it disappears from hoster Events
9. Sign in as attender → feed no longer shows it; My Events no longer shows it
10. Profile tab → sign out works

- [ ] **Step 4: Commit any straggler fixes**

```bash
git add -A
git commit -m "fix: polish from end-to-end device verification"
```

(Skip if nothing changed.)
