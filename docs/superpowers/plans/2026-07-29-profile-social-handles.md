# Profile Social Handles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member add Instagram, TikTok and X handles to their profile, visible only to their mutual follows, tappable to open that profile.

**Architecture:** Handles live in a `profiles/{uid}/private/socials` document, **not** on the profile document — `firestore.rules:61` grants `allow read: if signedIn()` on `profiles/{uid}`, so a handle stored there could not be restricted to connections by anything except cosmetic UI. A mutual follow is two `follows/{follower}_{target}` edge docs, so the rule proves it with two `exists()` calls. The screen never re-decides visibility: it subscribes and renders whatever the rules let through, so the gate lives in exactly one place.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, expo-router v6, Firebase v11 Firestore, Jest via jest-expo, `@testing-library/react-native`, `@firebase/rules-unit-testing`.

**Spec:** `docs/superpowers/specs/2026-07-29-profile-social-handles-design.md`

## Global Constraints

- **Run every command from `thirdspace-app/`.**
- **Every task ends green:** `npx tsc --noEmit` and `npx jest` both pass before committing.
- **No literal hex under `app/` or `components/`.** `__tests__/constants/tokens.test.ts` has an empty allowlist. Colors come from `constants/design.ts`.
- **`jest.mock` factories may only reference variables whose names begin with `mock`.** Jest hoists the factory above surrounding declarations. `const back = jest.fn()` referenced inside a factory fails; `const mockBack = jest.fn()` works. See `__tests__/components/ui/BackButton.test.tsx`.
- **Commit style:** conventional commits. **No `Co-Authored-By` trailer** — attribution is disabled globally for this repo.
- **Handles are stored WITHOUT a leading `@`, lowercased.** An absent key means "not set". Never store an empty string.
- **Rules tests need the Firestore emulator** (`npm run test:rules`, requires Firebase CLI + Java). They are NOT part of `npx jest`.
- **This is an enhancement, never a blocker.** No failure path — denied read, failed link open, missing doc — may throw, block render, or show an error banner on a profile.
- **Attender-only.** Do not touch the hoster screens.

---

## File Structure

**New files**

| File | Responsibility |
|------|----------------|
| `utils/socials.ts` | Pure: platform table, `normalizeHandle`, `isValidHandle`, `socialUrl`, `hasAnyHandle` |
| `hooks/useSocials.ts` | Subscribe to the socials doc; translate `permission-denied` into "not visible" |
| `components/SocialChips.tsx` | Presentational chip row |
| `__tests__/utils/socials.test.ts` | |
| `__tests__/hooks/useSocials.test.tsx` | |
| `__tests__/components/SocialChips.test.tsx` | |

**Modified files**

| File | Change |
|------|--------|
| `types/models.ts` | `SocialPlatform`, `SocialHandles` |
| `services/profiles.ts` | `setSocials`, `subscribeSocials` |
| `firestore.rules` | `profiles/{uid}/private/socials` read + write rules |
| `__tests__/rules/firestore.rules.test.ts` | six gate cases |
| `app/(app)/edit-profile.tsx` | three inputs + validation + save |
| `app/(app)/member/[uid].tsx` | Socials section |
| `app/(app)/(attender)/profile.tsx` | own handles |
| `docs/CODEMAPS/thirdspace-codemap.md` | collections table + invariants |

---

## Task 1: The pure socials module

Everything downstream — validation, chips, URLs, the edit form — reads from one platform table, so the form and the display cannot drift apart.

**Files:**
- Modify: `thirdspace-app/types/models.ts` (append after the `Follow` block, around line 120)
- Create: `thirdspace-app/utils/socials.ts`
- Create: `thirdspace-app/__tests__/utils/socials.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `SocialPlatform = 'instagram' | 'tiktok' | 'x'`; `SocialHandles = Partial<Record<SocialPlatform, string>>`; `SOCIAL_PLATFORMS: SocialPlatformSpec[]`; `normalizeHandle(raw: string): string`; `isValidHandle(platform: SocialPlatform, handle: string): boolean`; `socialUrl(platform: SocialPlatform, handle: string): string`; `hasAnyHandle(handles: SocialHandles): boolean`.

- [ ] **Step 1: Add the types**

In `types/models.ts`, append after the `Follow` interface:

```ts
// ── Social handles ────────────────────────────────────────────────────────
// Stored at profiles/{uid}/private/socials, NOT on the profile document.
// profiles/{uid} is `allow read: if signedIn()`, so a handle kept there would be
// readable by every signed-in member and "connections only" could not hold.
export type SocialPlatform = 'instagram' | 'tiktok' | 'x'

/** Handles are stored WITHOUT a leading '@', lowercased. An absent key means not set. */
export type SocialHandles = Partial<Record<SocialPlatform, string>>
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/utils/socials.test.ts`:

```ts
import { normalizeHandle, isValidHandle, socialUrl, hasAnyHandle, SOCIAL_PLATFORMS } from '../../utils/socials'

describe('normalizeHandle', () => {
  it('strips a leading @', () => {
    expect(normalizeHandle('@maya')).toBe('maya')
  })

  it('strips repeated @ and surrounding whitespace', () => {
    expect(normalizeHandle('  @@maya  ')).toBe('maya')
  })

  it('lowercases, because handles are case-insensitive on all three platforms', () => {
    expect(normalizeHandle('MayaCodes')).toBe('mayacodes')
  })

  it('accepts a pasted profile URL, which is what people actually do', () => {
    expect(normalizeHandle('https://instagram.com/maya')).toBe('maya')
    expect(normalizeHandle('https://www.instagram.com/maya/')).toBe('maya')
    expect(normalizeHandle('instagram.com/maya')).toBe('maya')
  })

  it('accepts a pasted TikTok URL, where the @ is part of the path', () => {
    expect(normalizeHandle('https://tiktok.com/@maya')).toBe('maya')
  })

  it('accepts a twitter.com URL as well as x.com', () => {
    expect(normalizeHandle('https://twitter.com/maya')).toBe('maya')
    expect(normalizeHandle('https://x.com/maya')).toBe('maya')
  })

  it('returns empty for empty input', () => {
    expect(normalizeHandle('   ')).toBe('')
  })
})

describe('isValidHandle', () => {
  it('accepts ordinary handles on every platform', () => {
    expect(isValidHandle('instagram', 'maya.codes')).toBe(true)
    expect(isValidHandle('tiktok', 'maya_codes')).toBe(true)
    expect(isValidHandle('x', 'maya_codes')).toBe(true)
  })

  it('rejects characters the platform does not allow', () => {
    expect(isValidHandle('instagram', 'maya codes')).toBe(false)
    expect(isValidHandle('x', 'maya.codes')).toBe(false) // X allows no dots
    expect(isValidHandle('instagram', 'maya@codes')).toBe(false)
  })

  it('enforces each platform length limit at the boundary', () => {
    expect(isValidHandle('x', 'a'.repeat(15))).toBe(true)
    expect(isValidHandle('x', 'a'.repeat(16))).toBe(false)
    expect(isValidHandle('instagram', 'a'.repeat(30))).toBe(true)
    expect(isValidHandle('instagram', 'a'.repeat(31))).toBe(false)
    expect(isValidHandle('tiktok', 'a')).toBe(false) // TikTok minimum is 2
    expect(isValidHandle('tiktok', 'ab')).toBe(true)
    expect(isValidHandle('tiktok', 'a'.repeat(25))).toBe(false)
  })

  it('rejects empty', () => {
    expect(isValidHandle('instagram', '')).toBe(false)
  })
})

describe('socialUrl', () => {
  it('builds the public https URL for each platform', () => {
    expect(socialUrl('instagram', 'maya')).toBe('https://instagram.com/maya')
    expect(socialUrl('tiktok', 'maya')).toBe('https://tiktok.com/@maya')
    expect(socialUrl('x', 'maya')).toBe('https://x.com/maya')
  })
})

describe('hasAnyHandle', () => {
  it('is false for an empty object and for blank values', () => {
    expect(hasAnyHandle({})).toBe(false)
    expect(hasAnyHandle({ instagram: '' })).toBe(false)
  })

  it('is true when at least one handle is set', () => {
    expect(hasAnyHandle({ tiktok: 'maya' })).toBe(true)
  })
})

describe('SOCIAL_PLATFORMS', () => {
  it('is the single ordered source both the form and the chips read', () => {
    expect(SOCIAL_PLATFORMS.map((p) => p.id)).toEqual(['instagram', 'tiktok', 'x'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest __tests__/utils/socials.test.ts`
Expected: FAIL — `Cannot find module '../../utils/socials'`.

- [ ] **Step 4: Implement the module**

Create `utils/socials.ts`:

```ts
import { SocialHandles, SocialPlatform } from '../types/models'

export interface SocialPlatformSpec {
  id: SocialPlatform
  label: string
  /** Public profile URL. Universal links hand off to the native app when installed. */
  urlPrefix: string
  /** Tested against an already-normalized (lowercased, bare) handle. */
  pattern: RegExp
}

/**
 * Ordered, and the single source both the edit form and the chip row read — so the
 * two cannot drift out of sync as platforms are added or removed.
 */
export const SOCIAL_PLATFORMS: SocialPlatformSpec[] = [
  { id: 'instagram', label: 'Instagram', urlPrefix: 'https://instagram.com/', pattern: /^[a-z0-9._]{1,30}$/ },
  { id: 'tiktok', label: 'TikTok', urlPrefix: 'https://tiktok.com/@', pattern: /^[a-z0-9._]{2,24}$/ },
  { id: 'x', label: 'X', urlPrefix: 'https://x.com/', pattern: /^[a-z0-9_]{1,15}$/ },
]

const HOST_PREFIX = /^(https?:\/\/)?(www\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com)\//i

function specFor(platform: SocialPlatform): SocialPlatformSpec | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === platform)
}

/**
 * Absorbs what people actually paste — '@handle', a full profile URL, stray
 * whitespace, mixed case — and returns the bare handle. Rejecting a pasted URL
 * would be technically correct and practically hostile.
 */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(HOST_PREFIX, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase()
}

export function isValidHandle(platform: SocialPlatform, handle: string): boolean {
  const spec = specFor(platform)
  return spec ? spec.pattern.test(handle) : false
}

export function socialUrl(platform: SocialPlatform, handle: string): string {
  const spec = specFor(platform)
  return spec ? `${spec.urlPrefix}${handle}` : ''
}

/** Whether there is anything worth rendering a Socials section for. */
export function hasAnyHandle(handles: SocialHandles): boolean {
  return SOCIAL_PLATFORMS.some((p) => Boolean(handles[p.id]))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/utils/socials.test.ts`
Expected: PASS

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit
git add types/models.ts utils/socials.ts __tests__/utils/socials.test.ts
git commit -F - <<'MSG'
feat: add pure socials module for handle normalize/validate/url

One ordered platform table drives validation, the edit form and the chip row,
so they cannot drift. normalizeHandle absorbs a pasted profile URL and a
leading @ rather than rejecting them - that is what people actually paste.
MSG
```

---

## Task 2: Read and write the socials document

**Files:**
- Modify: `thirdspace-app/services/profiles.ts:1-6` (imports) and append at end of file

**Interfaces:**
- Consumes: `SocialHandles` from Task 1.
- Produces: `setSocials(uid: string, handles: SocialHandles): Promise<void>`; `subscribeSocials(uid: string, onChange: (handles: SocialHandles) => void, onError: (code: string) => void): () => void`. Task 4's hook consumes both.

- [ ] **Step 1: Add `setDoc` to the imports**

In `services/profiles.ts`, line 1-3, add `setDoc` to the `firebase/firestore` import list:

```ts
import {
  doc, collection, writeBatch, updateDoc, setDoc, getDoc, onSnapshot, serverTimestamp, increment, Timestamp,
} from 'firebase/firestore'
```

and add `SocialHandles` to the models import on line 5:

```ts
import { CreateProfileInput, Profile, Reward, SocialHandles } from '../types/models'
```

- [ ] **Step 2: Append the two functions**

At the end of `services/profiles.ts`:

```ts
// ── Social handles ────────────────────────────────────────────────────────
// A subcollection doc, not a profile field: profiles/{uid} is readable by every
// signed-in member, so "connections only" is only enforceable off that document.
const socialsDoc = (uid: string) => doc(db, 'profiles', uid, 'private', 'socials')

/**
 * Full overwrite, NOT a merge. The edit form always submits the complete set, so
 * an absent key is exactly how a member clears a handle they removed. A merge
 * would make removal impossible.
 */
export async function setSocials(uid: string, handles: SocialHandles): Promise<void> {
  await setDoc(socialsDoc(uid), handles)
}

/**
 * onError receives the Firestore error code. 'permission-denied' means the viewer
 * is neither the owner nor a mutual follow — the rules working as designed, not a
 * failure. The caller is responsible for telling the two apart.
 */
export function subscribeSocials(
  uid: string,
  onChange: (handles: SocialHandles) => void,
  onError: (code: string) => void
): () => void {
  return onSnapshot(
    socialsDoc(uid),
    (snap) => onChange(snap.exists() ? (snap.data() as SocialHandles) : {}),
    (err) => onError(err.code)
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Run the existing profiles service tests**

Run: `npx jest __tests__/services/profiles.test.ts`
Expected: PASS — the additions must not disturb the existing mocks.

- [ ] **Step 5: Commit**

```bash
git add services/profiles.ts
git commit -F - <<'MSG'
feat: add setSocials and subscribeSocials against the private subcollection

setSocials overwrites rather than merges: the form submits the whole set, so
an absent key is how a member removes a handle. subscribeSocials surfaces the
error code so the caller can tell a permission-denied read (not a connection -
normal) from a real failure.
MSG
```

---

## Task 3: The mutual-follow security rule

This is the task that makes the feature's privacy claim real rather than cosmetic. It is the only place the connections check exists.

**Files:**
- Modify: `thirdspace-app/firestore.rules:60-75` (inside `match /profiles/{uid}`)
- Modify: `thirdspace-app/__tests__/rules/firestore.rules.test.ts` (append)

**Interfaces:**
- Consumes: the `follows/{follower}_{target}` doc-id convention from `utils/follows.ts:1-3`.
- Produces: the read/write gate that Task 4's hook depends on for its `permission-denied` behaviour.

- [ ] **Step 1: Write the failing rules tests**

Append to `__tests__/rules/firestore.rules.test.ts`:

```ts
// Socials live at profiles/{uid}/private/socials specifically so the read can be
// gated. The one-way-follower case below is the whole point: it is the difference
// between "connections" and "anyone who follows you", and a naive single-exists()
// rule gets it wrong.
async function seedSocials(env: RulesTestEnvironment, uid: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `profiles/${uid}/private/socials`), { instagram: 'maya' })
  })
}

async function seedFollow(env: RulesTestEnvironment, follower: string, target: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `follows/${follower}_${target}`), { follower, target })
  })
}

test('owner can read their own socials', async () => {
  await seedSocials(env, 'me')
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/me/private/socials')))
})

test('a mutual follow can read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'me', 'other')
  await seedFollow(env, 'other', 'me')
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a one-way follower CANNOT read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'me', 'other') // I follow them; they do not follow back
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a followed-by-only user CANNOT read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'other', 'me') // they follow me; I do not follow back
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a stranger cannot read socials', async () => {
  await seedSocials(env, 'other')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('only the owner can write socials, and only the three known keys', async () => {
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'maya', x: 'maya' }))
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), {}))
  await assertFails(setDoc(doc(stranger, 'profiles/me/private/socials'), { instagram: 'evil' }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'maya', payload: 'x'.repeat(100) }))
})
```

- [ ] **Step 2: Run rules tests to verify they fail**

Run: `npm run test:rules`
Expected: FAIL — with no matching rule the reads and writes are all denied, so the `assertSucceeds` cases fail first.

If this errors with a connection refusal, the Firestore emulator is not running. That is an environment problem, not a code problem — start it before continuing.

- [ ] **Step 3: Add the rule**

In `firestore.rules`, inside `match /profiles/{uid} { ... }` and directly after the existing `match /redemptions/{redemptionId}` block (around line 75), add:

```
      // Handles are kept OFF the profile document on purpose: profiles/{uid} is
      // `allow read: if signedIn()`, so anything stored there is readable by every
      // signed-in member no matter what the UI renders. A mutual follow is two edge
      // docs, so it is provable here with two exists() calls — well inside the
      // per-request document access budget.
      match /private/socials {
        allow read: if signedIn() && (
          request.auth.uid == uid || (
            exists(/databases/$(database)/documents/follows/$(request.auth.uid + '_' + uid)) &&
            exists(/databases/$(database)/documents/follows/$(uid + '_' + request.auth.uid))
          )
        );
        // hasOnly stops the doc being used as unbounded storage on a path other
        // members can read.
        allow write: if signedIn() && request.auth.uid == uid
          && request.resource.data.keys().hasOnly(['instagram', 'tiktok', 'x']);
      }
```

- [ ] **Step 4: Run rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS — all six new tests, and every pre-existing rules test still green.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules __tests__/rules/firestore.rules.test.ts
git commit -F - <<'MSG'
feat: gate socials reads behind a proven mutual follow

Two exists() calls against the follows edge docs, because one edge only proves
a one-way follow. Tests cover both one-way directions explicitly - that is the
case a single-exists() rule silently gets wrong, and it is the difference
between "connections" and "anyone who follows you". hasOnly on write keeps the
doc from becoming unbounded storage on a path other members can read.
MSG
```

- [ ] **Step 6: Deploy the rules**

```bash
npx firebase-tools deploy --only firestore:rules
```

**This cannot wait until the end.** Until it runs, every socials read in the live app returns denied and the section silently never appears — which looks exactly like the feature not working. Note that the codemap already records one previously-undeployed rules fix; confirm whether that is still pending and deploy both together.

---

## Task 4: The useSocials hook

**Files:**
- Create: `thirdspace-app/hooks/useSocials.ts`
- Create: `thirdspace-app/__tests__/hooks/useSocials.test.tsx`

**Interfaces:**
- Consumes: `subscribeSocials` from Task 2.
- Produces: `useSocials(uid: string | undefined)` returning `{ handles: SocialHandles, visible: boolean, loading: boolean, hasError: boolean }`. Tasks 5-7 consume it.

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useSocials.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react-native'
import { useSocials } from '../../hooks/useSocials'

const mockUnsubscribe = jest.fn()
let mockOnChange: (handles: Record<string, string>) => void
let mockOnError: (code: string) => void

jest.mock('../../services/profiles', () => ({
  subscribeSocials: jest.fn((_uid: string, onChange: never, onError: never) => {
    mockOnChange = onChange
    mockOnError = onError
    return mockUnsubscribe
  }),
}))

beforeEach(() => {
  mockUnsubscribe.mockClear()
})

describe('useSocials', () => {
  it('exposes handles and marks them visible once the read succeeds', () => {
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnChange({ instagram: 'maya' }) })
    expect(result.current.handles).toEqual({ instagram: 'maya' })
    expect(result.current.visible).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('treats permission-denied as not visible, NOT as an error', () => {
    // The rules deny non-connections by design. Surfacing that as an error would
    // put a failure banner on the profile of everyone you are not connected to.
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnError('permission-denied') })
    expect(result.current.visible).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('reports any other error code as a real error', () => {
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnError('unavailable') })
    expect(result.current.visible).toBe(false)
    expect(result.current.hasError).toBe(true)
  })

  it('stays inert with no uid and does not subscribe', () => {
    const { result } = renderHook(() => useSocials(undefined))
    expect(result.current.visible).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.handles).toEqual({})
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useSocials('other'))
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useSocials.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useSocials'`.

- [ ] **Step 3: Implement the hook**

Create `hooks/useSocials.ts`:

```ts
import { useEffect, useState } from 'react'
import { SocialHandles } from '../types/models'
import { subscribeSocials } from '../services/profiles'

/**
 * `visible` is decided by firestore.rules, not by this hook and not by the screen.
 * A permission-denied read means the viewer is not a connection — a normal outcome,
 * not an error. Keeping the mutual-follow check in exactly one place stops the UI
 * and the backend from disagreeing, and the UI copy would be the one that is wrong.
 */
export function useSocials(uid: string | undefined) {
  const [handles, setHandles] = useState<SocialHandles>({})
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setHandles({})
      setVisible(false)
      setLoading(false)
      setHasError(false)
      return
    }
    setHandles({})
    setVisible(false)
    setLoading(true)
    setHasError(false)

    return subscribeSocials(
      uid,
      (next) => {
        setHandles(next)
        setVisible(true)
        setLoading(false)
        setHasError(false)
      },
      (code) => {
        setVisible(false)
        setLoading(false)
        setHasError(code !== 'permission-denied')
      }
    )
  }, [uid])

  return { handles, visible, loading, hasError }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/hooks/useSocials.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add hooks/useSocials.ts __tests__/hooks/useSocials.test.tsx
git commit -F - <<'MSG'
feat: add useSocials, translating a denied read into "not visible"

The rules deny non-connections by design, so permission-denied is a normal
outcome and must not reach the screen as an error - otherwise every profile
you are not connected to shows a failure banner. Any other code is a real
error and is reported as one.
MSG
```

---

## Task 5: The chip row component

**Files:**
- Create: `thirdspace-app/components/SocialChips.tsx`
- Create: `thirdspace-app/__tests__/components/SocialChips.test.tsx`

**Interfaces:**
- Consumes: `SOCIAL_PLATFORMS`, `socialUrl`, `hasAnyHandle` from Task 1.
- Produces: `<SocialChips handles={SocialHandles} onOpen={(url: string) => void} />`. Tasks 6 consumes it.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/SocialChips.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SocialChips } from '../../components/SocialChips'

describe('SocialChips', () => {
  it('renders one chip per set handle, in platform order', () => {
    const { getByText } = render(<SocialChips handles={{ x: 'maya', instagram: 'maya.codes' }} onOpen={jest.fn()} />)
    expect(getByText('@maya.codes')).toBeTruthy()
    expect(getByText('@maya')).toBeTruthy()
  })

  it('renders nothing when no handle is set', () => {
    const { toJSON } = render(<SocialChips handles={{}} onOpen={jest.fn()} />)
    expect(toJSON()).toBeNull()
  })

  it('ignores a key present but blank', () => {
    const { toJSON } = render(<SocialChips handles={{ instagram: '' }} onOpen={jest.fn()} />)
    expect(toJSON()).toBeNull()
  })

  it('passes the platform URL to onOpen', () => {
    const onOpen = jest.fn()
    const { getByText } = render(<SocialChips handles={{ tiktok: 'maya' }} onOpen={onOpen} />)
    fireEvent.press(getByText('@maya'))
    expect(onOpen).toHaveBeenCalledWith('https://tiktok.com/@maya')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/SocialChips.test.tsx`
Expected: FAIL — `Cannot find module '../../components/SocialChips'`.

- [ ] **Step 3: Implement the component**

Create `components/SocialChips.tsx`:

```tsx
import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { SocialHandles } from '../types/models'
import { SOCIAL_PLATFORMS, socialUrl, hasAnyHandle } from '../utils/socials'
import { Meta } from './ui/Text'
import { palette, radius, space } from '../constants/design'

interface SocialChipsProps {
  handles: SocialHandles
  onOpen: (url: string) => void
}

export function SocialChips({ handles, onOpen }: SocialChipsProps) {
  if (!hasAnyHandle(handles)) return null

  return (
    <View style={styles.wrap}>
      {SOCIAL_PLATFORMS.filter((p) => handles[p.id]).map((p) => {
        const handle = handles[p.id] as string
        return (
          <TouchableOpacity
            key={p.id}
            style={styles.chip}
            onPress={() => onOpen(socialUrl(p.id, handle))}
            accessibilityRole="link"
            accessibilityLabel={`${p.label}, @${handle}`}
          >
            <Meta role="eyebrow" tone="ink">{p.label}</Meta>
            <Meta tone="inkSoft">@{handle}</Meta>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Matches the interest-chip treatment on member/[uid] so the section reads as part
// of the profile rather than a bolted-on widget.
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xxl - 4 },
  chip: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
    gap: 2,
  },
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/SocialChips.test.tsx`
Expected: PASS

- [ ] **Step 5: Verify the token guard still passes**

Run: `npx jest __tests__/constants/tokens.test.ts`
Expected: PASS — the new component must contain no literal hex.

- [ ] **Step 6: Commit**

```bash
git add components/SocialChips.tsx __tests__/components/SocialChips.test.tsx
git commit -F - <<'MSG'
feat: add SocialChips row

Renders nothing at all when no handle is set, so a caller can mount it
unconditionally without producing an empty section. Reuses the interest-chip
treatment so socials read as part of the profile.
MSG
```

---

## Task 6: Show socials on the member and own-profile screens

**Files:**
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx:1-16` (imports), `:20-24` (hooks), `:97-108` (section)
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx:1-25` (imports + hooks), `:72` (section)

**Interfaces:**
- Consumes: `useSocials` (Task 4), `SocialChips` (Task 5), `hasAnyHandle` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the section to the member profile**

In `app/(app)/member/[uid].tsx`, add to the imports:

```tsx
import { Linking } from 'react-native'
import { useSocials } from '../../../hooks/useSocials'
import { SocialChips } from '../../../components/SocialChips'
import { hasAnyHandle } from '../../../utils/socials'
```

(`Linking` joins the existing `react-native` import on line 2 rather than adding a second one.)

After the `useFollowStatus` line (line 23), add:

```tsx
  const { handles: socialHandles, visible: socialsVisible } = useSocials(uid)
```

Add this handler next to `handleToggleFollow`:

```tsx
  // A link that will not open is not worth an error banner on someone's profile.
  const openSocial = (url: string) => { Linking.openURL(url).catch(() => {}) }
```

Then, between the Interests block (ends line 97) and the Vibe block (starts line 99), insert:

```tsx
        {socialsVisible && hasAnyHandle(socialHandles) ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Socials</Meta>
            <SocialChips handles={socialHandles} onOpen={openSocial} />
          </>
        ) : null}
```

Both conditions are required: `socialsVisible` alone would render a bare "Socials" label for a connection who has set no handles.

- [ ] **Step 2: Add the section to your own profile**

In `app/(app)/(attender)/profile.tsx`, add `Linking` to the `react-native` import on line 2, and add:

```tsx
import { useSocials } from '../../../hooks/useSocials'
import { SocialChips } from '../../../components/SocialChips'
import { hasAnyHandle } from '../../../utils/socials'
```

After the `useConnections` line (line 25), add:

```tsx
  // The owner always passes the rules gate, so `visible` needs no check here.
  const { handles: myHandles } = useSocials(user?.uid)
```

Then, immediately after the closing `</View>` of the `statsRow` block (line 71) and before the `Account` eyebrow (line 73), insert:

```tsx
        {hasAnyHandle(myHandles) ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Socials</Meta>
            <SocialChips
              handles={myHandles}
              onOpen={(url) => { Linking.openURL(url).catch(() => {}) }}
            />
          </>
        ) : null}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If `styles.sectionLabel` is reported missing on either screen, check the local `StyleSheet` — `member/[uid].tsx:122` has it; confirm `(attender)/profile.tsx` does too and add `sectionLabel: { marginBottom: space.md, marginTop: space.lg }` to its stylesheet if not.

- [ ] **Step 4: Full suite**

Run: `npx jest`
Expected: PASS, including `__tests__/constants/tokens.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/member/[uid].tsx" "app/(app)/(attender)/profile.tsx"
git commit -F - <<'MSG'
feat: show social handles on member and own profiles

The member screen does not consult useConnections to decide visibility - it
renders whatever the rules let through, so the mutual-follow check stays in
exactly one place. A failed link open is swallowed: it is not worth an error
banner on someone's profile.
MSG
```

---

## Task 7: Edit the handles

**Files:**
- Modify: `thirdspace-app/app/(app)/edit-profile.tsx:1-24` (imports), `:29-54` (state + seed), `:71-93` (save), `:147-159` (form)

**Interfaces:**
- Consumes: `useSocials` (Task 4), `setSocials` (Task 2), `SOCIAL_PLATFORMS` / `normalizeHandle` / `isValidHandle` (Task 1), `FormInput` (existing, already supports `prefix` and `error`).
- Produces: nothing consumed by later tasks.

**Note on a spec correction:** the spec's error-handling section said an invalid handle blocks "that field only" while the others still save. Silently dropping an invalid handle on save — the screen navigates back and the handle is simply gone — is worse than refusing. This plan **disables the save button while any social field is invalid** instead, and the spec is corrected to match.

- [ ] **Step 1: Add imports**

In `app/(app)/edit-profile.tsx`, add:

```tsx
import { useMemo } from 'react'
import { SocialHandles, SocialPlatform } from '../../types/models'
import { SOCIAL_PLATFORMS, normalizeHandle, isValidHandle } from '../../utils/socials'
import { useSocials } from '../../hooks/useSocials'
import { setSocials } from '../../services/profiles'
```

`useMemo` joins the existing `react` import on line 1. `setSocials` does not collide with any local name — the form state below is deliberately called `socialInputs` / `setSocialInputs`.

- [ ] **Step 2: Add state and a seed effect**

After the `useProfile` line (line 29), add:

```tsx
  const { handles: loadedSocials, loading: socialsLoading } = useSocials(user?.uid)
```

After the existing `error` state (line 39), add:

```tsx
  // Raw text, normalized only on validate/save — normalizing per keystroke would
  // fight anyone mid-way through pasting a URL.
  const [socialInputs, setSocialInputs] = useState<Record<SocialPlatform, string>>({ instagram: '', tiktok: '', x: '' })
  const [socialsSeeded, setSocialsSeeded] = useState(false)
```

After the existing seed effect (ends line 51), add a second one:

```tsx
  // Socials load on their own subscription, so they need their own seed guard.
  useEffect(() => {
    if (socialsSeeded || socialsLoading) return
    setSocialInputs({
      instagram: loadedSocials.instagram ?? '',
      tiktok: loadedSocials.tiktok ?? '',
      x: loadedSocials.x ?? '',
    })
    setSocialsSeeded(true)
  }, [loadedSocials, socialsLoading, socialsSeeded])
```

- [ ] **Step 3: Derive errors and the payload**

After `toggleInterest` (line 57), add:

```tsx
  const socialErrors = useMemo(() => {
    const out: Partial<Record<SocialPlatform, string>> = {}
    for (const p of SOCIAL_PLATFORMS) {
      const raw = socialInputs[p.id]
      if (!raw.trim()) continue
      if (!isValidHandle(p.id, normalizeHandle(raw))) out[p.id] = `That doesn't look like a ${p.label} handle.`
    }
    return out
  }, [socialInputs])

  const cleanedSocials = useMemo(() => {
    const out: SocialHandles = {}
    for (const p of SOCIAL_PLATFORMS) {
      const handle = normalizeHandle(socialInputs[p.id])
      if (handle) out[p.id] = handle
    }
    return out
  }, [socialInputs])
```

Then extend `canSubmit` (line 54) so an invalid handle blocks the save rather than being dropped:

```tsx
  const canSubmit =
    interests.length >= MIN_INTERESTS &&
    neighborhood.trim().length > 0 &&
    Object.keys(socialErrors).length === 0
```

Note `canSubmit` is declared above `socialErrors` in the current file order — move the `canSubmit` line to sit directly after the `cleanedSocials` block so it reads after its dependency.

- [ ] **Step 4: Write the handles on save**

In `handleSave`, immediately after the existing `await updateProfile(...)` call (ends line 86) and before `router.back()`:

```tsx
      await setSocials(user.uid, cleanedSocials)
```

It sits inside the existing `try`, so a failure lands on the existing "Couldn't save changes. Try again." path and the screen stays open.

- [ ] **Step 5: Add the inputs**

In the form, after the Borough chip block (ends line 152) and before the interests label (line 154), insert:

```tsx
          <Meta role="eyebrow" style={styles.fieldLabel}>Socials — only your connections can see these</Meta>
          {SOCIAL_PLATFORMS.map((p) => (
            <FormInput
              key={p.id}
              label={p.label}
              prefix="@"
              value={socialInputs[p.id]}
              onChangeText={(t) => setSocialInputs((prev) => ({ ...prev, [p.id]: t }))}
              error={socialErrors[p.id]}
              placeholder="yourhandle"
              autoCapitalize="none"
              autoCorrect={false}
            />
          ))}
```

`FormInput` already supports `prefix` and `error` (`components/FormInput.tsx:9,19,41`) and already sets `autoCapitalize="none"` — passing it explicitly documents the intent at the call site.

- [ ] **Step 6: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean, all suites pass.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/edit-profile.tsx"
git commit -F - <<'MSG'
feat: edit social handles from the profile form

State holds raw text and normalizes on validate/save, so the field does not
fight anyone mid-paste. An invalid handle disables Save rather than being
dropped from the payload - navigating back with the handle silently gone is
worse than refusing the save.
MSG
```

---

## Task 8: Update the codemap

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`

- [ ] **Step 1: Add the collection**

In the Firestore Collections table, after the `profiles/{uid}/redemptions/{id}` row, add:

```markdown
| `profiles/{uid}/private/socials` | `SocialHandles` | Instagram/TikTok/X. Read gated on a proven mutual follow |
```

- [ ] **Step 2: Add the invariants**

In **Key Invariants & Gotchas**, add:

```markdown
- **Social handles are off the profile document on purpose** — `profiles/{uid}` is
  `allow read: if signedIn()`, so anything stored there is readable by every signed-in
  member regardless of what the UI renders. Handles live at `profiles/{uid}/private/socials`
  where the read can actually be gated. Moving them onto the profile doc would turn the
  connections-only promise into decoration.
- **The socials gate lives in firestore.rules, not the screen** — `useSocials` translates a
  `permission-denied` read into `visible: false`, and the profile screens render whatever
  came back rather than re-deciding with `useConnections`. Two copies of the check would
  eventually disagree, and the UI copy would be the wrong one.
- **A mutual follow needs BOTH edge docs** — `exists()` on one direction only proves a
  one-way follow. The rules check `follower_target` and `target_follower`; the rules tests
  cover each one-way case separately.
```

- [ ] **Step 3: Update the counts**

In the Source Tree block, add `useSocials.ts` to the hooks list and `socials.ts` to the utils list, add `SocialChips.tsx` to the components count, and bump the stated hook / util / component counts accordingly.

- [ ] **Step 4: Commit**

```bash
git add ../docs/CODEMAPS/thirdspace-codemap.md
git commit -F - <<'MSG'
docs: record the socials subcollection and its rules-owned gate

Captures the two things that constrain future edits: why handles are not a
profile field, and why the screen must not re-implement the connections check.
MSG
```

---

## Manual verification (not automatable)

Needs **two accounts** and deployed rules (Task 3 Step 6).

1. Account A adds an Instagram handle in Edit profile. Confirm it saves and appears on A's own Profile tab.
2. Account B opens A's member profile with **no follow** in either direction → no Socials section.
3. B follows A (one-way) → **still no Socials section.** This is the case the whole rule exists for.
4. A follows B back → the section appears for both.
5. Tap the chip → Instagram opens (app if installed, browser if not).
6. A unfollows B → section disappears again for B.
7. Paste `https://instagram.com/someone` into the field → saves as `someone`.
8. Type `bad handle!` → inline error, Save disabled.
