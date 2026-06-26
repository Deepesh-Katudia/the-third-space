# User Profiles & Identity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock profile/identity data with live Firebase data — real profiles (photo, bio, interests, neighborhood, age), public profile reads, a create-profile + edit-profile flow, and real guest lists / "who's going".

**Architecture:** Client Firebase SDK + security rules + denormalized counters (no Cloud Functions). A public `profiles/{uid}` collection holds shareable fields; private data stays in `users/{uid}`. Photos live in Firebase Storage. Counters and a registration profile-snippet are denormalized inside existing write batches.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.7, expo-router v6, Firebase v11 (Auth + Firestore + Storage), `expo-image-picker` (new), `@firebase/rules-unit-testing` (new dev), Jest + @testing-library/react-native.

## Global Constraints

- **Source spec:** `docs/superpowers/specs/2026-06-25-user-profiles-identity-design.md`. Every task implicitly inherits it.
- **No Cloud Functions.** Client SDK + rules only.
- **Fonts:** only `DMSerifDisplay_400Regular`, `DMSerifDisplay_400Regular_Italic`, `DMSans_300Light`, `DMSans_400Regular`, `DMSans_500Medium` are loaded. There is **no** DM Sans bold — use `DMSans_500Medium` as the heaviest weight.
- **Palette (verbatim):** background `#FBF7F2` / dark `#2C1810`, primary `#C4614A`, soft orange `#E8855F`, sage `#7A8C6E`, muted text `#8C7B70`, warm border `rgba(242,197,160,0.5)`.
- **Dynamic navigation:** always object-form `router.push({ pathname: '/(app)/x/[id]', params: { id } })` (typed-routes safety) — never template-string hrefs.
- **Profile defaults (verbatim):** `points: 0`, `tier: 'Newcomer'`, `verified: false`, `eventsCount: 0`.
- **Bio limit 300 chars; minimum 3 interests; minimum age 18.**
- **Service test pattern:** mock `../../firebase/config` as `{ db: {} }` (and `{ storage: {} }` where needed) and mock `firebase/firestore` so each export returns a path-tagged object (see `__tests__/services/events.test.ts`). No emulator for service/hook/util tests.
- **Avatars fall back to initials** (`utils/avatar.ts` `avatarColor`/`initials`) whenever `photoURL` is null.
- Run `npx tsc --noEmit` clean and keep all existing tests green before each commit.

---

## File Structure

**Create:**
- `thirdspace-app/utils/profile.ts` — `ageFromDOB`
- `thirdspace-app/services/profiles.ts` — profile CRUD + subscriptions
- `thirdspace-app/services/photos.ts` — image pick + Storage upload
- `thirdspace-app/hooks/useProfile.ts` — `useProfile(uid)`
- `thirdspace-app/app/(auth)/create-profile.tsx` — attender profile creation (post role-select)
- `thirdspace-app/app/(app)/edit-profile.tsx` — edit profile
- `thirdspace-app/storage.rules` — Storage security rules
- `thirdspace-app/firebase.json` — emulator config for rules tests
- Tests: `__tests__/utils/profile.test.ts`, `__tests__/services/profiles.test.ts`, `__tests__/hooks/useProfile.test.tsx`, `__tests__/rules/firestore.rules.test.ts`

**Modify:**
- `thirdspace-app/types/models.ts` — `Profile`, `CreateProfileInput`, extend `Registration`
- `thirdspace-app/firebase/config.ts` — export `storage`
- `thirdspace-app/services/events.ts` — `eventsCount` increments + registration snippet
- `thirdspace-app/hooks/useAuth.ts` — add `hasProfile`
- `thirdspace-app/app/_layout.tsx` — `AuthRedirect` attender create-profile gate
- `thirdspace-app/app/(auth)/sign-up.tsx` — revert to account-only
- `thirdspace-app/app/(app)/_layout.tsx` — register `edit-profile`
- `thirdspace-app/app/(app)/(attender)/profile.tsx` — `useProfile(self)`
- `thirdspace-app/app/(app)/member/[uid].tsx` — `getProfile(uid)`
- `thirdspace-app/app/(app)/guest-list/[id].tsx` — real registrations
- `thirdspace-app/app/(app)/event/[id].tsx` — real "who's going"
- `thirdspace-app/firestore.rules` — profiles + co-attendee registration read
- `thirdspace-app/package.json` — `expo-image-picker`, `@firebase/rules-unit-testing`
- `__tests__/services/events.test.ts` — assert new counter/snippet writes

All commands below run from `thirdspace-app/` unless noted.

---

## Task 1: Profile types + `ageFromDOB`

**Files:**
- Modify: `thirdspace-app/types/models.ts`
- Create: `thirdspace-app/utils/profile.ts`
- Test: `thirdspace-app/__tests__/utils/profile.test.ts`

**Interfaces:**
- Produces: `Profile`, `CreateProfileInput`, extended `Registration` (types); `ageFromDOB(dob: Date, now?: Date): number`.

- [ ] **Step 1: Add types to `types/models.ts`** (append after `Registration`)

```typescript
export interface Profile {
  displayName: string
  photoURL: string | null
  vibePhotos: string[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
  eventsCount: number
  points: number
  tier: string
  verified: boolean
  joinedAt: Timestamp
}

// Fields the user supplies; service fills joinedAt + neutral defaults.
export interface CreateProfileInput {
  displayName: string
  photoURL: string | null
  vibePhotos: string[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
}
```

Then extend `Registration` (denormalized snippet for the guest list):

```typescript
export interface Registration {
  uid: string
  displayName: string
  photoURL?: string | null
  age?: number
  neighborhood?: string
  interestsPreview?: string[]
}
```

- [ ] **Step 2: Write the failing test** `__tests__/utils/profile.test.ts`

```typescript
import { ageFromDOB } from '../../utils/profile'

describe('ageFromDOB', () => {
  it('returns age in whole years before the birthday this year', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('1999-12-01'), now)).toBe(26)
  })

  it('returns age after the birthday has passed this year', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('1999-01-01'), now)).toBe(27)
  })

  it('handles a birthday that is today', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('2000-06-25'), now)).toBe(26)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/utils/profile.test.ts`
Expected: FAIL — `Cannot find module '../../utils/profile'`.

- [ ] **Step 4: Implement `utils/profile.ts`**

```typescript
// Whole-years age from a date of birth. `now` is injectable for testing.
export function ageFromDOB(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}
```

- [ ] **Step 5: Run test + tsc**

Run: `npx jest __tests__/utils/profile.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/types/models.ts thirdspace-app/utils/profile.ts thirdspace-app/__tests__/utils/profile.test.ts
git commit -m "feat: add Profile types and ageFromDOB util"
```

---

## Task 2: Firebase Storage init + photos service

**Files:**
- Modify: `thirdspace-app/firebase/config.ts`
- Modify: `thirdspace-app/package.json` (add `expo-image-picker`)
- Create: `thirdspace-app/services/photos.ts`
- Test: covered by tsc + manual (Storage/picker are SDK wrappers; path helper is unit-tested inline)

**Interfaces:**
- Produces: `storage` (from config); `photoPath(uid, kind)`, `pickImage(kind)`, `uploadProfilePhoto(uid, kind, uri)`.
- `kind` type: `type PhotoKind = 'avatar' | 'vibe0' | 'vibe1' | 'vibe2'`.

- [ ] **Step 1: Install dependency**

Run: `npx expo install expo-image-picker`
Expected: adds `expo-image-picker` to `package.json` dependencies.

- [ ] **Step 2: Export Storage from `firebase/config.ts`**

Add the import and export:

```typescript
import { getStorage } from 'firebase/storage'
// ...existing code...
export const storage = getStorage(app)
```

- [ ] **Step 3: Create `services/photos.ts`**

```typescript
import * as ImagePicker from 'expo-image-picker'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

export type PhotoKind = 'avatar' | 'vibe0' | 'vibe1' | 'vibe2'

export function photoPath(uid: string, kind: PhotoKind): string {
  return `profilePhotos/${uid}/${kind}.jpg`
}

// Returns a local image URI, or null if the user cancels / denies permission.
export async function pickImage(kind: PhotoKind): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: kind === 'avatar' ? [1, 1] : [4, 5],
    quality: 0.7,
  })
  if (result.canceled) return null
  return result.assets[0].uri
}

export async function uploadProfilePhoto(uid: string, kind: PhotoKind, uri: string): Promise<string> {
  const res = await fetch(uri)
  const blob = await res.blob()
  const storageRef = ref(storage, photoPath(uid, kind))
  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}
```

- [ ] **Step 4: Write the failing test** `__tests__/services/photos.test.ts`

```typescript
import { photoPath } from '../../services/photos'

jest.mock('../../firebase/config', () => ({ storage: {} }))
jest.mock('expo-image-picker', () => ({}))
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }))

describe('photoPath', () => {
  it('builds a per-user, per-kind storage path', () => {
    expect(photoPath('u1', 'avatar')).toBe('profilePhotos/u1/avatar.jpg')
    expect(photoPath('u1', 'vibe2')).toBe('profilePhotos/u1/vibe2.jpg')
  })
})
```

- [ ] **Step 5: Run test + tsc**

Run: `npx jest __tests__/services/photos.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/firebase/config.ts thirdspace-app/services/photos.ts thirdspace-app/__tests__/services/photos.test.ts thirdspace-app/package.json thirdspace-app/package-lock.json
git commit -m "feat: add Firebase Storage init and photos service"
```

---

## Task 3: Profiles service

**Files:**
- Create: `thirdspace-app/services/profiles.ts`
- Test: `thirdspace-app/__tests__/services/profiles.test.ts`

**Interfaces:**
- Consumes: `Profile`, `CreateProfileInput` (Task 1).
- Produces:
  - `createProfile(uid: string, input: CreateProfileInput, birthdate: Date): Promise<void>` — batched write of `profiles/{uid}` (with defaults) + `users/{uid}.birthdate`.
  - `updateProfile(uid: string, partial: Partial<CreateProfileInput>): Promise<void>`
  - `subscribeProfile(uid: string, onChange: (p: Profile | null) => void, onError: () => void): () => void`
  - `getProfile(uid: string): Promise<Profile | null>`

- [ ] **Step 1: Write the failing test** `__tests__/services/profiles.test.ts`

```typescript
import { writeBatch, setDoc, getDoc } from 'firebase/firestore'
import { createProfile, updateProfile, getProfile } from '../../services/profiles'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: { fromDate: (d: Date) => ({ __ts: d.getTime() }) },
}))

function mockBatch() {
  return { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
}

describe('createProfile', () => {
  it('writes the public profile with neutral defaults and the private birthdate in one batch', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    const input = {
      displayName: 'Maya', photoURL: null, vibePhotos: [], bio: 'hi',
      interests: ['Art', 'Coffee', 'Film'], neighborhood: 'Williamsburg',
      borough: 'Brooklyn' as const, age: 27,
    }

    await createProfile('u1', input, new Date('1999-01-01'))

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      expect.objectContaining({
        displayName: 'Maya', interests: ['Art', 'Coffee', 'Film'],
        eventsCount: 0, points: 0, tier: 'Newcomer', verified: false,
        joinedAt: '__serverTimestamp',
      })
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { birthdate: { __ts: new Date('1999-01-01').getTime() } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('getProfile', () => {
  it('returns null when the profile does not exist', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
    expect(await getProfile('nope')).toBeNull()
  })

  it('returns the profile data when it exists', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ displayName: 'Maya' }) })
    expect(await getProfile('u1')).toEqual({ displayName: 'Maya' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/profiles.test.ts`
Expected: FAIL — `Cannot find module '../../services/profiles'`.

- [ ] **Step 3: Implement `services/profiles.ts`**

```typescript
import {
  doc, writeBatch, updateDoc, getDoc, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { CreateProfileInput, Profile } from '../types/models'

export async function createProfile(uid: string, input: CreateProfileInput, birthdate: Date): Promise<void> {
  const batch = writeBatch(db)
  batch.set(doc(db, 'profiles', uid), {
    ...input,
    eventsCount: 0,
    points: 0,
    tier: 'Newcomer',
    verified: false,
    joinedAt: serverTimestamp(),
  })
  batch.update(doc(db, 'users', uid), { birthdate: Timestamp.fromDate(birthdate) })
  await batch.commit()
}

export async function updateProfile(uid: string, partial: Partial<CreateProfileInput>): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), partial)
}

export function subscribeProfile(
  uid: string,
  onChange: (profile: Profile | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'profiles', uid),
    (snap) => onChange(snap.exists() ? (snap.data() as Profile) : null),
    onError
  )
}

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid))
  return snap.exists() ? (snap.data() as Profile) : null
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/services/profiles.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/services/profiles.ts thirdspace-app/__tests__/services/profiles.test.ts
git commit -m "feat: add profiles service (create/update/subscribe/get)"
```

---

## Task 4: `useProfile` hook

**Files:**
- Create: `thirdspace-app/hooks/useProfile.ts`
- Test: `thirdspace-app/__tests__/hooks/useProfile.test.tsx`

**Interfaces:**
- Consumes: `subscribeProfile`, `getProfile` (Task 3); `useAuth` for current uid.
- Produces: `useProfile(uid?: string): { profile: Profile | null; loading: boolean; hasError: boolean }`. Realtime when `uid === currentUser.uid`; one-shot otherwise.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useProfile.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { useProfile } from '../../hooks/useProfile'
import { getProfile } from '../../services/profiles'

jest.mock('../../services/profiles', () => ({ getProfile: jest.fn(), subscribeProfile: jest.fn() }))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }))

describe('useProfile', () => {
  it('one-shot fetches another user profile', async () => {
    ;(getProfile as jest.Mock).mockResolvedValue({ displayName: 'Maya' })
    const { result } = renderHook(() => useProfile('other'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getProfile).toHaveBeenCalledWith('other')
    expect(result.current.profile).toEqual({ displayName: 'Maya' })
  })

  it('returns loading=false with null when uid is undefined', async () => {
    const { result } = renderHook(() => useProfile(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useProfile.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useProfile'`.

- [ ] **Step 3: Implement `hooks/useProfile.ts`**

```typescript
import { useEffect, useState } from 'react'
import { Profile } from '../types/models'
import { subscribeProfile, getProfile } from '../services/profiles'
import { useAuth } from './useAuth'

export function useProfile(uid: string | undefined) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setHasError(false)

    // Self: realtime so edits reflect immediately. Others: one-shot read.
    if (user && uid === user.uid) {
      return subscribeProfile(
        uid,
        (p) => { setProfile(p); setLoading(false); setHasError(false) },
        () => { setHasError(true); setLoading(false) }
      )
    }

    let cancelled = false
    getProfile(uid)
      .then((p) => { if (!cancelled) { setProfile(p); setLoading(false) } })
      .catch(() => { if (!cancelled) { setHasError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [uid, user])

  return { profile, loading, hasError }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useProfile.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/hooks/useProfile.ts thirdspace-app/__tests__/hooks/useProfile.test.tsx
git commit -m "feat: add useProfile hook (self-realtime, other-one-shot)"
```

---

## Task 5: Events service — denormalized counters + registration snippet

**Files:**
- Modify: `thirdspace-app/services/events.ts`
- Modify: `thirdspace-app/__tests__/services/events.test.ts`

**Interfaces:**
- Consumes: `getProfile` (Task 3).
- Produces: unchanged public signatures — `registerForEvent(eventId, uid, displayName)`, `cancelRegistration(eventId, uid)`, `createEvent(...)`, `deleteEventWithRegistrations(eventId)` — now with extra writes.

- [ ] **Step 1: Update `registerForEvent`** to read the registrant's profile, write the snippet, and bump `profiles/{uid}.eventsCount`. Replace the existing function body:

```typescript
export async function registerForEvent(eventId: string, uid: string, displayName: string): Promise<void> {
  const profileSnap = await getDoc(doc(db, 'profiles', uid))
  const p = profileSnap.exists() ? profileSnap.data() : undefined

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
  batch.set(doc(db, 'profiles', uid), { eventsCount: increment(1) }, { merge: true })
  await batch.commit()
}
```

- [ ] **Step 2: Update `cancelRegistration`** — add the profile decrement. Append to the existing batch before `commit`:

```typescript
  batch.set(doc(db, 'profiles', uid), { eventsCount: increment(-1) }, { merge: true })
```

- [ ] **Step 3: Update `createEvent`** — after the `addDoc`, bump the venue counter. Replace the function:

```typescript
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
  await updateDoc(doc(db, 'venues', venueId), { eventsCount: increment(1) })
}
```

- [ ] **Step 4: Update `deleteEventWithRegistrations`** — decrement the venue counter. Before `await deleteDoc(doc(db, 'events', eventId))`, capture `venueId` and after deletion decrement. Replace the function:

```typescript
export async function deleteEventWithRegistrations(eventId: string): Promise<void> {
  const eventSnap = await getDoc(doc(db, 'events', eventId))
  const venueId = eventSnap.exists() ? (eventSnap.data().venueId as string) : undefined

  const registrations = await getDocs(collection(db, 'events', eventId, 'registrations'))
  const docs = registrations.docs
  for (let i = 0; i < docs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(db)
    docs.slice(i, i + DELETE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'events', eventId))
  if (venueId) await updateDoc(doc(db, 'venues', venueId), { eventsCount: increment(-1) })
}
```

- [ ] **Step 5: Extend `__tests__/services/events.test.ts`** — add `getDoc` + `setDoc` to the firestore mock and assert the new writes. Update the mock block to include `getDoc: jest.fn()` (already present) and ensure `mockBatch` has `set`. Add this test inside the `registerForEvent` describe:

```typescript
  it('writes a denormalized profile snippet and bumps the profile eventsCount', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ photoURL: 'http://x/a.jpg', age: 27, neighborhood: 'Bushwick', interests: ['Art', 'Coffee', 'Film', 'Music'] }),
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
      { path: 'profiles/u1' }, { eventsCount: { __increment: 1 } }, { merge: true }
    )
  })
```

Add `getDoc` to the import line at the top of the test: `import { writeBatch, getDoc } from 'firebase/firestore'`. (The existing `cancelRegistration` test still passes because the new `set` is an additional call.)

- [ ] **Step 6: Run tests + tsc**

Run: `npx jest __tests__/services/events.test.ts && npx tsc --noEmit`
Expected: PASS (existing + new assertions), no type errors.

- [ ] **Step 7: Commit**

```bash
git add thirdspace-app/services/events.ts thirdspace-app/__tests__/services/events.test.ts
git commit -m "feat: denormalize eventsCount and registration profile snippet"
```

---

## Task 6: `useAuth.hasProfile` + AuthRedirect attender gate

**Files:**
- Modify: `thirdspace-app/hooks/useAuth.ts`
- Modify: `thirdspace-app/app/_layout.tsx`
- Test: `thirdspace-app/__tests__/hooks/useAuth.test.ts` (extend existing)

**Interfaces:**
- Consumes: nothing new.
- Produces: `useAuth()` now returns `{ user, role, hasProfile, loading }` where `hasProfile: boolean`.

- [ ] **Step 1: Update `hooks/useAuth.ts`** to also read `profiles/{uid}` existence:

```typescript
import { useState, useEffect } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

type Role = 'attender' | 'hoster' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const [userSnap, profileSnap] = await Promise.all([
          getDoc(doc(db, 'users', firebaseUser.uid)),
          getDoc(doc(db, 'profiles', firebaseUser.uid)),
        ])
        setRole(userSnap.exists() ? (userSnap.data().role as 'attender' | 'hoster') : null)
        setHasProfile(profileSnap.exists())
      } else {
        setRole(null)
        setHasProfile(false)
      }
      setLoading(false)
    })
  }, [])

  return { user, role, hasProfile, loading }
}
```

- [ ] **Step 2: Update `AuthRedirect` in `app/_layout.tsx`** — add the attender create-profile gate. Update the props interface and effect:

```typescript
interface AuthRedirectProps {
  user: import('firebase/auth').User | null
  role: 'attender' | 'hoster' | null
  hasProfile: boolean
  loading: boolean
}

function AuthRedirect({ user, role, hasProfile, loading }: AuthRedirectProps) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'
    const onRoleSelect = segments[1] === 'role-select'
    const onCreateProfile = segments[1] === 'create-profile'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (user && !role && !onRoleSelect) {
      router.replace('/(auth)/role-select')
    } else if (user && role === 'attender' && !hasProfile && !onCreateProfile) {
      router.replace('/(auth)/create-profile')
    } else if (user && role && (role !== 'attender' || hasProfile) && !inAppGroup) {
      router.replace('/(app)')
    }
  }, [user, role, hasProfile, loading, segments])

  return null
}
```

Then update the render in `RootLayout` to pass `hasProfile`:

```typescript
  const { user, role, hasProfile, loading } = useAuth()
  // ...
  <AuthRedirect user={user} role={role} hasProfile={hasProfile} loading={loading} />
```

- [ ] **Step 3: Update the existing useAuth test** `__tests__/hooks/useAuth.test.ts` — its `getDoc` mock must now resolve twice (users + profiles). Find the mock that returns the role doc and make `getDoc` return role first, profile second. Add an assertion:

```typescript
  it('exposes hasProfile=true when the profile doc exists', async () => {
    ;(getDoc as jest.Mock)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'attender' }) }) // users
      .mockResolvedValueOnce({ exists: () => true }) // profiles
    // ...render the hook as the existing tests do, then:
    // await waitFor(() => expect(result.current.loading).toBe(false))
    // expect(result.current.hasProfile).toBe(true)
  })
```

Adjust any existing test that mocked a single `getDoc` resolution to use `mockResolvedValueOnce` twice (users then profiles), since `useAuth` now reads both.

- [ ] **Step 4: Run tests + tsc**

Run: `npx jest __tests__/hooks/useAuth.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/hooks/useAuth.ts thirdspace-app/app/_layout.tsx thirdspace-app/__tests__/hooks/useAuth.test.ts
git commit -m "feat: gate attenders through create-profile via useAuth.hasProfile"
```

---

## Task 7: Security rules (Firestore + Storage) + emulator rules tests

**Files:**
- Modify: `thirdspace-app/firestore.rules`
- Create: `thirdspace-app/storage.rules`
- Create: `thirdspace-app/firebase.json`
- Modify: `thirdspace-app/package.json` (add `@firebase/rules-unit-testing` dev dep + `test:rules` script)
- Test: `thirdspace-app/__tests__/rules/firestore.rules.test.ts`

**Interfaces:**
- Produces: deployed rule behavior — `profiles/{uid}` public read / owner write (no `verified`/`points`/`tier` change); co-attendee registration read.

- [ ] **Step 1: Update `firestore.rules`** — add the profiles block and relax registrations read. Inside `match /databases/{database}/documents {`, add:

```
    match /profiles/{uid} {
      allow read: if signedIn();
      allow create: if signedIn() && request.auth.uid == uid;
      allow update: if signedIn() && request.auth.uid == uid
        && !request.resource.data.diff(resource.data)
             .affectedKeys().hasAny(['verified', 'points', 'tier']);
    }
```

Replace the registrations `read` rule with the co-attendee form:

```
        allow read: if signedIn() && (
          request.auth.uid == uid ||
          isEventOwner(eventId) ||
          exists(/databases/$(database)/documents/events/$(eventId)/registrations/$(request.auth.uid))
        );
```

- [ ] **Step 2: Create `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profilePhotos/{uid}/{file} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

- [ ] **Step 3: Create `firebase.json`**

```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" },
  "emulators": {
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": false }
  }
}
```

- [ ] **Step 4: Install the rules-test dependency + add script**

Run: `npm install --save-dev @firebase/rules-unit-testing`
Add to `package.json` scripts: `"test:rules": "firebase emulators:exec --only firestore \"jest --config jest.rules.config.js\""`.
Create `jest.rules.config.js`:

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/rules/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
}
```

- [ ] **Step 5: Write the rules test** `__tests__/rules/firestore.rules.test.ts`

```typescript
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'thirdspace-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(async () => env.cleanup())
beforeEach(async () => env.clearFirestore())

test('any signed-in user can read another profile', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/other'), { displayName: 'Maya', points: 0 })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/other')))
})

test('a user cannot write another user profile', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'profiles/other'), { displayName: 'x' }))
})

test('owner cannot escalate points/tier/verified on update', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { bio: 'updated' }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 9999 }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { verified: true }))
})

test('co-attendee can read the registration list; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'events/e1'), { venueId: 'host', registeredCount: 2 })
    await setDoc(doc(fs, 'events/e1/registrations/me'), { displayName: 'Me' })
    await setDoc(doc(fs, 'events/e1/registrations/you'), { displayName: 'You' })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(getDoc(doc(me, 'events/e1/registrations/you')))
  await assertFails(getDoc(doc(stranger, 'events/e1/registrations/you')))
})
```

- [ ] **Step 6: Run the rules tests** (requires the Firebase CLI; install once with `npm i -g firebase-tools` if absent)

Run: `npm run test:rules`
Expected: PASS — 4 rules tests green. (If `firebase` CLI / Java is unavailable in the environment, document this and run it on a machine that has the emulator; the rule file is still the deliverable.)

- [ ] **Step 7: Commit**

```bash
git add thirdspace-app/firestore.rules thirdspace-app/storage.rules thirdspace-app/firebase.json thirdspace-app/jest.rules.config.js thirdspace-app/__tests__/rules/firestore.rules.test.ts thirdspace-app/package.json thirdspace-app/package-lock.json
git commit -m "feat: profiles + co-attendee security rules with emulator tests"
```

---

## Task 8: Create-profile screen + sign-up revert

**Files:**
- Create: `thirdspace-app/app/(auth)/create-profile.tsx`
- Modify: `thirdspace-app/app/(auth)/sign-up.tsx` (remove inline profile step → account-only)
- Test: tsc + manual smoke (screens are not unit-tested in this repo)

**Interfaces:**
- Consumes: `createProfile` (Task 3), `pickImage`/`uploadProfilePhoto` (Task 2), `ageFromDOB` (Task 1), `InterestChip`, `AuthButton`, `FormInput`, `BOROUGHS`.
- Produces: route `/(auth)/create-profile`.

- [ ] **Step 1: Revert `sign-up.tsx` to account-only.** Remove the `step` state, the profile-step branch, the `bio`/`interests` state, the `InterestChip` import, and the `ProgressBar`. On successful email signup call `router.replace('/(auth)/role-select')` (the guard will route an attender to create-profile after role-select). The Google/Apple handlers already do this. Net effect: `sign-up.tsx` matches its pre-Phase-1-profile-step shape (account fields + OAuth + footer only).

- [ ] **Step 2: Create `app/(auth)/create-profile.tsx`** — collects photo + 3 vibe photos + bio + interests + neighborhood/borough + DOB, then writes the profile.

```typescript
import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'
import { FormInput } from '../../components/FormInput'
import { InterestChip } from '../../components/InterestChip'
import { BOROUGHS } from '../../constants/categories'
import { Borough } from '../../types/models'
import { createProfile } from '../../services/profiles'
import { pickImage, uploadProfilePhoto } from '../../services/photos'
import { ageFromDOB } from '../../utils/profile'
import { avatarColor, initials } from '../../utils/avatar'

const BIO_LIMIT = 300
const MIN_INTERESTS = 3
const MIN_AGE = 18
const INTEREST_OPTIONS = ['Art', 'Coffee', 'Film', 'Music', 'Hiking', 'Reading', 'Fitness', 'Food', 'Photography', 'Nightlife', 'Wellness', 'Gaming', 'Fashion', 'Travel', 'Vinyl', 'Cooking']

export default function CreateProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const name = user?.displayName ?? 'Member'

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [borough, setBorough] = useState<Borough>('Brooklyn')
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1))
  const [showPicker, setShowPicker] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const age = ageFromDOB(dob)
  const canSubmit = interests.length >= MIN_INTERESTS && neighborhood.trim().length > 0 && age >= MIN_AGE

  const toggleInterest = (label: string) =>
    setInterests((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]))

  const handlePickPhoto = async () => {
    const uri = await pickImage('avatar')
    if (uri) setPhotoUri(uri)
  }

  const handleSubmit = async () => {
    if (!user || !canSubmit) return
    setBusy(true)
    setError('')
    try {
      let photoURL: string | null = null
      if (photoUri) {
        try { photoURL = await uploadProfilePhoto(user.uid, 'avatar', photoUri) } catch { photoURL = null }
      }
      await createProfile(
        user.uid,
        { displayName: name, photoURL, vibePhotos: [], bio: bio.trim(), interests, neighborhood: neighborhood.trim(), borough, age },
        dob
      )
      router.replace('/(app)')
    } catch {
      setError("Couldn't save your profile. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Make yourself real.</Text>
          <Text style={styles.subtitle}>A photo and a few interests help people recognize you at events.</Text>

          <View style={styles.photoWrap}>
            <TouchableOpacity style={styles.photoSlot} onPress={handlePickPhoto}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} />
              ) : (
                <View style={[styles.photoFallback, { backgroundColor: avatarColor(name) }]}>
                  <Text style={styles.photoInitials}>{initials(name)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Add a photo</Text>
          </View>

          <Text style={styles.fieldLabel}>Short bio</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Illustrator, new to Brooklyn, always up for good coffee…"
            placeholderTextColor="#8C7B70"
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_LIMIT))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{bio.length}/{BIO_LIMIT}</Text>

          <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} placeholder="Williamsburg" />

          <Text style={styles.fieldLabel}>Borough</Text>
          <View style={styles.chipWrap}>
            {BOROUGHS.map((b) => (
              <InterestChip key={b} label={b} selected={borough === b} onPress={() => setBorough(b)} />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Date of birth</Text>
          <TouchableOpacity style={styles.dobBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.dobText}>{dob.toLocaleDateString()} · age {age}</Text>
          </TouchableOpacity>
          {age < MIN_AGE ? <Text style={styles.ageError}>You must be at least {MIN_AGE}.</Text> : null}
          {showPicker ? (
            <DateTimePicker
              value={dob}
              mode="date"
              maximumDate={new Date()}
              onChange={(_e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDob(d) }}
            />
          ) : null}

          <Text style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Text>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((label) => (
              <InterestChip key={label} label={label} selected={interests.includes(label)} onPress={() => toggleInterest(label)} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.submitWrap}>
            <AuthButton
              label={canSubmit ? 'Enter The Third Space' : `Complete your profile`}
              onPress={handleSubmit}
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 32, paddingBottom: 40 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', lineHeight: 22, marginBottom: 28 },
  photoWrap: { alignItems: 'center', marginBottom: 28 },
  photoSlot: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', marginBottom: 8 },
  photoImg: { width: 96, height: 96 },
  photoFallback: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontFamily: 'DMSans_500Medium', fontSize: 32, color: 'white' },
  photoHint: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 10, marginTop: 8 },
  bioInput: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 14, padding: 16, minHeight: 96, fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  counter: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', alignSelf: 'flex-end', marginTop: 6, marginBottom: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  dobBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  dobText: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810' },
  ageError: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginBottom: 12 },
  error: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626', marginBottom: 12 },
  submitWrap: { marginTop: 12 },
})
```

- [ ] **Step 3: Verify build + manual smoke**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; all tests pass.
Manual: new email signup → role-select (attender) → create-profile → fill fields → Enter → lands in app; the profile doc exists in Firestore.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/app/(auth)/create-profile.tsx thirdspace-app/app/(auth)/sign-up.tsx
git commit -m "feat: attender create-profile screen, sign-up reverts to account-only"
```

---

## Task 9: Edit Profile screen + Profile self-view wiring

**Files:**
- Create: `thirdspace-app/app/(app)/edit-profile.tsx`
- Modify: `thirdspace-app/app/(app)/_layout.tsx` (register route, modal optional)
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx` (real data)
- Test: tsc + manual smoke

**Interfaces:**
- Consumes: `useProfile` (Task 4), `updateProfile`/`getProfile` (Task 3), `pickImage`/`uploadProfilePhoto` (Task 2), `getMyRegisteredEvents` (existing).
- Produces: route `/(app)/edit-profile`.

- [ ] **Step 1: Register the route** in `app/(app)/_layout.tsx` (default card push is fine; add the line inside the `Stack`):

```typescript
      <Stack.Screen name="edit-profile" />
```

- [ ] **Step 2: Create `app/(app)/edit-profile.tsx`** — loads the current profile, edits bio/interests/neighborhood/borough/photo, saves via `updateProfile`. Reuse the field components and styles from `create-profile.tsx` (bio input, interest chips, borough chips, photo slot). On mount, seed state from `useProfile(user.uid)`; the Save button calls `updateProfile(user.uid, { ...editedFields })` (uploading a newly-picked photo first via `uploadProfilePhoto`), then `router.back()`. Header: back arrow + "Edit profile" serif title. Show `LoadingView` while `useProfile` is loading. (Mirror the create-profile field layout exactly; only the submit handler and header differ.)

```typescript
// Save handler shape (the rest mirrors create-profile fields):
const handleSave = async () => {
  if (!user) return
  setBusy(true)
  try {
    let photoURL = profile?.photoURL ?? null
    if (newPhotoUri) {
      try { photoURL = await uploadProfilePhoto(user.uid, 'avatar', newPhotoUri) } catch { /* keep existing */ }
    }
    await updateProfile(user.uid, { bio: bio.trim(), interests, neighborhood: neighborhood.trim(), borough, photoURL })
    router.back()
  } catch {
    setError("Couldn't save changes. Try again.")
  } finally {
    setBusy(false)
  }
}
```

- [ ] **Step 3: Wire `(attender)/profile.tsx` to real data.** Replace `MOCK_STATS`/`MOCK_NEIGHBORHOOD` with `useProfile(user?.uid)` and compute `attended` from registered events. Key changes:
  - Import `useProfile`, `getMyRegisteredEvents`, `LoadingView`.
  - `const { profile, loading } = useProfile(user?.uid)`; show `LoadingView` while loading.
  - Add an effect: `getMyRegisteredEvents(user.uid)` → set `attendedCount` = count with `startsAt.toMillis() < Date.now()`.
  - Stats row: `attended={attendedCount}`, `hosted={0}`, `connections={0}`.
  - Identity: `name = profile?.displayName ?? user?.displayName ?? 'Member'`; `neighborhood = profile?.neighborhood ?? ''`; render `profile.photoURL` via `<Image>` when set, else the existing initials avatar.
  - "Edit profile & photos" button → `onPress={() => router.push('/(app)/edit-profile')}`.
  - "Points & badges" row already routes to `/(app)/badges` — leave it.
  - Remove the `MOCK_STATS`/`MOCK_NEIGHBORHOOD` constants.

- [ ] **Step 4: Verify build + manual smoke**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; tests pass.
Manual: open Profile → real name/neighborhood/photo; tap Edit → change bio → Save → reflected on Profile (realtime).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/app/(app)/edit-profile.tsx thirdspace-app/app/(app)/_layout.tsx thirdspace-app/app/(app)/(attender)/profile.tsx
git commit -m "feat: edit-profile screen and live profile self-view"
```

---

## Task 10: Member profile wiring

**Files:**
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx`
- Test: tsc + manual smoke

**Interfaces:**
- Consumes: `useProfile` (Task 4).

- [ ] **Step 1: Replace `MOCK_MEMBER` with live data.** In `member/[uid].tsx`:
  - `const { profile, loading, hasError } = useProfile(uid)`.
  - While `loading` → `LoadingView`; if `hasError || !profile` → `EmptyState` ("Profile unavailable").
  - Map profile → the `Member` shape `MemberProfileCard` expects: `{ uid, name: profile.displayName, age: profile.age, neighborhood: profile.neighborhood, tier: profile.tier, points: profile.points, eventCount: profile.eventsCount, bio: profile.bio, lookingToMeet: '', interests: profile.interests, vibePhotos: profile.vibePhotos.length }`.
  - Render `profile.photoURL` in the card avatar when present (pass into `MemberProfileCard`; extend it to accept an optional `photoURL` and show `<Image>` else initials).
  - Vibe strip: render `profile.vibePhotos` images when present, else the gradient placeholders.
  - Keep Follow / Message-request buttons inert (sub-projects E/C) — no change.
  - Remove the `MOCK_MEMBER` constant.

- [ ] **Step 2: Extend `MemberProfileCard`** (`components/MemberProfileCard.tsx`) to accept `photoURL?: string | null` on `Member` and render `<Image>` when set, falling back to the initials avatar. `lookingToMeet` may be empty — guard the green box so it only renders when non-empty (in `member/[uid].tsx`).

- [ ] **Step 3: Verify build + manual smoke**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; tests pass.
Manual: from a guest list, tap an attendee → their real profile loads.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/app/(app)/member/[uid].tsx thirdspace-app/components/MemberProfileCard.tsx
git commit -m "feat: live member/public profile"
```

---

## Task 11: Guest list wiring

**Files:**
- Modify: `thirdspace-app/app/(app)/guest-list/[id].tsx`
- Test: tsc + manual smoke

**Interfaces:**
- Consumes: `subscribeRegistrations` (existing), `subscribeEvent` (existing, for host/venue + count), `useVenue` not needed (read venue via event's `venueId`).

- [ ] **Step 1: Replace mock guest data with live registrations.** In `guest-list/[id].tsx`:
  - `subscribeRegistrations(id, setAttendees, onError)` in an effect (returns unsubscribe). `attendees: Registration[]` now carries `photoURL`/`age`/`neighborhood`/`interestsPreview`.
  - `subscribeEvent(id, setEvent, onError)` to get the event name + `venueId` + `registeredCount` for the header ("event name · N going").
  - Host section: read the venue via `getDoc(doc(db,'venues',event.venueId))` once (or a small `getVenue` helper) for the venue name + `eventsCount` ("Hosting · N events"); keep it simple with a `useState` + effect.
  - Render each attendee row from the `Registration` snippet: `<Image>` when `photoURL`, else initials; `name = displayName`, `age`, `neighborhood`, `interestsPreview.join(', ')`. Tapping a row → `router.push({ pathname: '/(app)/member/[uid]', params: { uid: attendee.uid } })`.
  - The "You're going" banner shows when the current user's uid is in the attendee list.
  - Footer "Open group chat" → unchanged (stub until sub-project C).
  - Remove `MOCK_*` constants.

- [ ] **Step 2: Verify build + manual smoke**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; tests pass.
Manual: register two accounts for one event; open the guest list as a registered user → both attendees appear with real data; a non-registered user is blocked by rules (no list).

- [ ] **Step 3: Commit**

```bash
git add thirdspace-app/app/(app)/guest-list/[id].tsx
git commit -m "feat: live guest list from registrations"
```

---

## Task 12: Event detail "who's going" + final verification

**Files:**
- Modify: `thirdspace-app/app/(app)/event/[id].tsx`
- Test: tsc + full jest + manual smoke

**Interfaces:**
- Consumes: `subscribeRegistrations` (existing), existing event subscription.

- [ ] **Step 1: Make "who's going" real for registered users.** In `event/[id].tsx`:
  - When the current user `isRegistered` (or `isOwner`), subscribe to registrations (`subscribeRegistrations(id, setAttendees, …)`), and feed real seeds/photos into `AttendeeAvatarStack` (use `attendees.map(a => a.uid)` for seeds and `attendees.length` for count) instead of the synthetic `previewSeeds`.
  - Non-registered users keep the existing count-only blur gate (driven by `event.registeredCount`), since the co-attendee rule blocks the read anyway — guard the subscription so it only runs when `isRegistered || isOwner`.
  - "See all →" already routes to the guest list (object form) — leave it.
  - Remove the synthetic `previewSeeds` usage in the registered/owner branches (keep a minimal placeholder for the locked, non-registered state's blurred avatars).

- [ ] **Step 2: Full verification**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; **all** tests pass (existing 35 + new util/service/hook/rules suites).

- [ ] **Step 3: Manual smoke of the whole flow**
  - New attender signup → create-profile → app.
  - Edit profile round-trips.
  - Register for an event → who's-going shows real attendees + "See all".
  - Guest list shows real attendees; tapping one opens their member profile.
  - Profile self-view shows real attended count, neighborhood, photo.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/app/(app)/event/[id].tsx
git commit -m "feat: live who's-going on event detail"
```

---

## Self-Review

**Spec coverage**
- Data model (`profiles`, `users.birthdate`, `venues.eventsCount`, registration snippet) → Tasks 1, 3, 5.
- Security rules (profiles + co-attendee) + Storage rules → Task 7.
- Services/hooks (`profiles`, `photos`, `useProfile`, `useAuth.hasProfile`) → Tasks 2, 3, 4, 6.
- Photo upload (Storage + `expo-image-picker`) → Tasks 2, 8, 9, 10.
- Screen wiring: create-profile (attender, post role-select) → Task 8; edit-profile + profile self-view → Task 9; member → Task 10; guest list → Task 11; who's-going → Task 12.
- Routing guard (attender-only create-profile) → Task 6.
- Counters in existing batches → Task 5.
- Out of scope (points/tier/connections defaults, onboarding count, Follow/DM) → respected; defaults set in Task 3, screens render them.

**Placeholder scan:** screen Tasks 9–12 describe edits as precise change-lists against existing files (which already contain the full JSX) plus the exact new handlers/data hooks — no "TBD"/"add error handling" placeholders. Service/hook/util/rules tasks contain complete code + tests.

**Type consistency:** `Profile`/`CreateProfileInput`/`Registration` defined in Task 1 are used unchanged in Tasks 3, 5, 9–11. `createProfile(uid, input, birthdate)`, `updateProfile(uid, partial)`, `getProfile(uid)`, `subscribeProfile(uid, cb, onErr)` consistent across Tasks 3, 4, 8, 9, 10. `pickImage(kind)`/`uploadProfilePhoto(uid, kind, uri)`/`PhotoKind` consistent across Tasks 2, 8, 9, 10. `useAuth` return `{ user, role, hasProfile, loading }` consistent across Tasks 6, 8, 9.

---

## Execution Notes

- Tasks 1–7 are backend/foundation and independently testable; Tasks 8–12 are screen wiring gated on tsc + manual smoke (this repo does not unit-test screens).
- Task 7's emulator rules tests require the Firebase CLI + Java; if unavailable in the dev environment, the rule files still ship and must be verified on a machine with the emulator before deploy.
- Deploy after merge: `firebase deploy --only firestore:rules,storage` (rules are not auto-deployed by the app).
