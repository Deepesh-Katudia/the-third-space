# App Store Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the four safety and legal surfaces Apple requires of a social app — blocking, reporting, in-app account deletion, terms acceptance — plus a content filter, so the build stops being an automatic rejection under App Review Guidelines 1.2 and 5.1.1(v).

**Architecture:** Blocking is a private subcollection enforced in rules on the write paths and filtered client-side on the read paths, because rules can only allow or deny a whole query, never filter one. Reporting is a create-only collection no client can read, with a Cloud Function turning a write into a human notification. Deletion is a callable Cloud Function that cascades before it deletes the Auth user, so a mid-way failure leaves a recoverable account rather than an orphan. Legal acceptance and the content filter are client-side, the filter as a pure module beside the other 21 in `utils/`.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, expo-router v6, Firebase JS v11 (Auth + Firestore + Storage), Cloud Functions v2 on Node 22 (`firebase-functions` ^6, `firebase-admin` ^12), Jest via jest-expo, `@firebase/rules-unit-testing` for rules.

**Spec:** `docs/superpowers/specs/2026-08-12-app-store-compliance-design.md` — read it before Task 1. The plan argues from the spec; where it deviates it says so and why.

## Global Constraints

- **No literal colour anywhere under `app/` or `components/`.** Every colour comes from `constants/design.ts`. `__tests__/constants/tokens.test.ts` has an empty allowlist and fails on a hex.
- **Error is `clay`, success is `sage`.** There is no red or green in the palette.
- **Every type role renders uppercase** via the tokens; never write an inline `textTransform`.
- **`services/` is the only layer that touches Firebase.** Hooks wrap subscriptions; `utils/` is pure — no clock, no navigation, no firebase import.
- **Rules are the enforcement, the UI is not.** Any check a screen makes must also exist in `firestore.rules`.
- **A rule that dereferences `resource.data` must guard `resource == null`**, or a read of a not-yet-created document throws instead of returning empty.
- **Rules split `create, update` from `delete`** — on a delete there is no `request.resource`, so a field check raises an evaluation error rather than returning false.
- **Both directions of a two-party relationship need separate `exists()` calls and separate tests.** One direction only proves a one-way relationship. This is how `profiles/{uid}/private/socials` already proves a mutual follow.
- **Never reveal a block.** A blocked sender sees "This message could not be sent", never anything naming the block.
- **Firestore rejects an explicit `undefined`.** Optional fields are spread in: `...(x ? { x } : {})`.
- **Batches chunk at 400**, matching `deleteEvent` in `services/events.ts`.
- **Commit message format:** `<type>: <description>`, types `feat|fix|refactor|docs|test|chore|perf|ci`. **Only the user's name — never add a Co-Authored-By or session trailer.**
- **Gates, all three green before a phase ends:** `npx tsc --noEmit`, `npx jest`, `npm run test:rules` (from `thirdspace-app/`), plus `npx jest` in `functions/` for any task that touches `functions/src/`.
- Baseline at plan time: **564 app tests / 70 suites, 52 rules tests, 23 function tests, tsc clean.**

## Corrections to the spec's stated deployment state

The spec's "Deployment state, verified 2026-08-12" block is stale. Verified 2026-09-04/05:

- **The Storage bucket exists and `storage.rules` is deployed.** An anonymous read of `the-third-space-626e8.firebasestorage.app` answers 403, not 404. The GCP resource location is therefore already set.
- **`firestore.rules` is deployed** (2026-09-03), including the write-once `role` split.
- **Cloud Functions are still not deployed**, but the reason is not the billing plan: `deploy --only functions` fails at "We failed to modify the IAM policy for the project". Three service-agent bindings must be granted by a project Owner first. Every function in this plan is therefore **written and tested but not verifiable in production** until that clears.
- The codemap's Spark-plan note has already been corrected.

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `services/blocks.ts` | Block/unblock writes and the `users/{uid}/blocks` subscription. The only module that touches that path. |
| `utils/blocks.ts` | Pure read-side filters: events, chat threads, registrations, uid lists. |
| `hooks/useBlocks.ts` | Module store (the `useUserLocation` pattern) exposing the blocked set app-wide. |
| `app/(app)/blocked-users.tsx` | The list, with unblock. Reached from Settings. |
| `components/ReportSheet.tsx` | One reason-picker sheet, shared by all three report entry points. |
| `services/reports.ts` | `reports` create. The only writer. |
| `functions/src/onReportCreated.ts` | Turns a report into a mail document a human actually receives. |
| `functions/src/deleteAccount.ts` | The callable, and the cascade as a pure function over an injected db. |
| `functions/src/testing/fakeFirestore.ts` | In-memory Firestore double, so the cascade is testable without an emulator. |
| `services/account.ts` | Calls the delete callable; owns re-authentication. |
| `app/(app)/delete-account.tsx` | Consequences, typed confirmation, re-auth. |
| `constants/legal.ts` | The legal URLs and `TERMS_VERSION`. The only file where a legal URL may be written. |
| `utils/contentFilter.ts` | Pure wordlist check. |
| `firestore.indexes.json` | The app's first index config — one collection-group index. |

**Modified**

| File | Change |
|---|---|
| `firestore.rules` | `blocks` subcollection; block gates on 3 write paths; `reports` create-only. |
| `types/models.ts` | `ReportKind`, `ReportReason`, `Report`, `BlockedUser`; `termsAcceptedAt`/`termsVersion` on the user doc. |
| `hooks/useChatList.ts` | Blocked DMs filtered out. |
| `app/(app)/(attender)/index.tsx` | Blocked hosts' events hidden. |
| `app/(app)/member/[uid].tsx:130` | The dead button becomes a real action sheet; blocked state replaces the profile. |
| `app/(app)/guest-list/[id].tsx` | Blocked attendees omitted. |
| `hooks/useConnections.ts` | Blocked members excluded from mutuals. |
| `app/(app)/settings.tsx` | Four new rows: Blocked users, Privacy Policy, Terms, Delete account. |
| `app/(app)/chat/[id].tsx` | Long-press to report; neutral send-failure copy. |
| `app/(app)/event/[id].tsx` | Report this event. |
| `app/(auth)/sign-up.tsx` | Required terms checkbox gating submit; stamps acceptance. |
| `utils/validation.ts` | `validateSignUpForm` gains `termsAccepted`. |
| `services/chat.ts`, `services/events.ts`, `services/profiles.ts` | Content filter at the four write paths. |
| `functions/src/index.ts` | Export `onReportCreated`, `deleteAccount`. |
| `firebase.json` | Wire `firestore.indexes`. |
| `docs/CODEMAPS/thirdspace-codemap.md` | New collections, screens, and the amended no-indexes invariant. |

---

# Phase 1 — Blocking

## Task 1: The block subcollection, its service, and its rules

**Files:**
- Create: `thirdspace-app/services/blocks.ts`
- Modify: `thirdspace-app/firestore.rules` (after the `users/{uid}/pushTokens` block, ~line 76)
- Modify: `thirdspace-app/types/models.ts` (append a Blocking section)
- Test: `thirdspace-app/__tests__/rules/firestore.rules.test.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `blockUser(uid: string, targetUid: string): Promise<void>`, `unblockUser(uid: string, targetUid: string): Promise<void>`, `subscribeBlocks(uid: string, onData: (uids: string[]) => void, onError: () => void): () => void`, and `interface BlockedUser { uid: string; createdAt: Timestamp | null }`.

- [ ] **Step 1: Write the failing rules tests**

Append to `__tests__/rules/firestore.rules.test.ts`. `deleteDoc`, `getDocs` and `collection` may need adding to the existing import from `firebase/firestore`:

```ts
// ── users/{uid}/blocks: private, and unenumerable by the blocked party ─────
// The privacy property IS the feature: if B could read this, a block would become a
// notification, which is what stops people using it. It stays enforceable anyway
// because exists() inside a rule bypasses read rules.
test('owner can block, list and unblock', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'users/me/blocks/them'), { createdAt: new Date() }))
  await assertSucceeds(getDocs(collection(me, 'users/me/blocks')))
  await assertSucceeds(deleteDoc(doc(me, 'users/me/blocks/them')))
})

test('nobody can read who has blocked them', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me/blocks/them'), { createdAt: new Date() })
  })
  const them = env.authenticatedContext('them').firestore()
  await assertFails(getDoc(doc(them, 'users/me/blocks/them')))
  await assertFails(getDocs(collection(them, 'users/me/blocks')))
})

test('a third party can neither read nor write someone else\'s block list', async () => {
  const other = env.authenticatedContext('other').firestore()
  await assertFails(setDoc(doc(other, 'users/me/blocks/them'), { createdAt: new Date() }))
  await assertFails(getDoc(doc(other, 'users/me/blocks/them')))
})
```

- [ ] **Step 2: Run the rules tests to verify they fail**

Run: `npm run test:rules`
Expected: the three new tests FAIL — with no rule for `users/{uid}/blocks/**`, every write and read is denied, so `assertSucceeds` in the first test fails.

- [ ] **Step 3: Add the rule**

In `firestore.rules`, inside `match /users/{uid}`, directly after the `pushTokens` block:

```
      // Private, like pushTokens and chatReads. Nobody can enumerate who has blocked
      // them — that privacy is the point, and it survives because exists() inside a
      // rule bypasses read rules, so the write gates below still work.
      match /blocks/{blockedUid} {
        allow read, write: if signedIn() && request.auth.uid == uid;
      }
```

- [ ] **Step 4: Run the rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS, 55 tests.

- [ ] **Step 5: Add the types**

Append to `types/models.ts`:

```ts
// ── Safety: blocking and reporting (App Store compliance) ─────────────────
// A block lives at users/{uid}/blocks/{blockedUid} — private to the blocker. There is
// deliberately no mirror doc at users/{blocked}/blockedBy: that would hand the blocked
// party an enumerable list of everyone who has blocked them, converting a private
// safety action into a notification.
export interface BlockedUser {
  uid: string
  createdAt: Timestamp | null
}
```

- [ ] **Step 6: Write the service**

Create `services/blocks.ts`:

```ts
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { BlockedUser } from '../types/models'

/**
 * The only module that touches users/{uid}/blocks.
 *
 * The doc id IS the blocked uid, so a block is one addressable document in both
 * directions — which is what lets firestore.rules prove or disprove a block with a
 * single exists() and no index.
 */
function blocksCol(uid: string) {
  return collection(db, 'users', uid, 'blocks')
}

export async function blockUser(uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) throw new Error('cannot-block-self')
  await setDoc(doc(blocksCol(uid), targetUid), { createdAt: serverTimestamp() })
}

export async function unblockUser(uid: string, targetUid: string): Promise<void> {
  await deleteDoc(doc(blocksCol(uid), targetUid))
}

/** Live, because a block taken on one screen must take effect on every other. */
export function subscribeBlocks(
  uid: string,
  onData: (uids: string[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    blocksCol(uid),
    (snap) => onData(snap.docs.map((d) => d.id)),
    onError
  )
}

export function subscribeBlockedUsers(
  uid: string,
  onData: (blocked: BlockedUser[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    blocksCol(uid),
    (snap) => onData(snap.docs.map((d) => ({ uid: d.id, createdAt: d.data().createdAt ?? null }))),
    onError
  )
}
```

- [ ] **Step 7: Typecheck and commit**

```bash
npx tsc --noEmit
git add thirdspace-app/services/blocks.ts thirdspace-app/types/models.ts thirdspace-app/firestore.rules thirdspace-app/__tests__/rules/firestore.rules.test.ts
git commit -m "feat: add the private block subcollection and its service"
```

## Task 2: Gate the write paths in rules

**Files:**
- Modify: `thirdspace-app/firestore.rules` (helper near `signedIn()`, then 3 rules)
- Test: `thirdspace-app/__tests__/rules/firestore.rules.test.ts` (append)

**Interfaces:**
- Consumes: the `blocks` subcollection from Task 1.
- Produces: rules function `blockedEitherWay(other)`.

- [ ] **Step 1: Write the failing rules tests**

```ts
// ── Blocking gates the write paths, symmetrically ──────────────────────────
// Symmetric on writes so neither party can reach the other; asymmetric on reads,
// which is handled client-side. Each direction is a separate exists() and so gets a
// separate test — one direction only ever proves a one-way relationship.
async function seedBlock(blocker: string, blocked: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `users/${blocker}/blocks/${blocked}`), { createdAt: new Date() })
  })
}

const convBody = (a: string, b: string, requestedBy: string) => ({
  participants: [a, b], names: {}, photos: {},
  status: 'pending', requestedBy,
  lastMessageText: 'hi', lastMessageAt: new Date(), lastMessageAuthor: 'A', messageCount: 1,
})

test('the blocker cannot open a DM with the person they blocked', async () => {
  await seedBlock('me', 'them')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'conversations/me_them'), convBody('me', 'them', 'me')))
})

test('the blocked party cannot open a DM with the blocker', async () => {
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(setDoc(doc(them, 'conversations/me_them'), convBody('me', 'them', 'them')))
})

test('an unrelated pair can still open a DM', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'conversations/me_other'), convBody('me', 'other', 'me')))
})

test('an existing thread goes cold when a block lands', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations/me_them'), { ...convBody('me', 'them', 'them'), status: 'open' })
  })
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(setDoc(doc(them, 'conversations/me_them/messages/m1'), {
    authorUid: 'them', authorName: 'Them', authorPhotoURL: null, text: 'still here', createdAt: new Date(),
  }))
})

test('the blocked party cannot follow the blocker', async () => {
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(setDoc(doc(them, 'follows/them_me'), { follower: 'them', target: 'me', createdAt: new Date() }))
})

test('the blocker cannot follow the person they blocked', async () => {
  await seedBlock('me', 'them')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/me_them'), { follower: 'me', target: 'them', createdAt: new Date() }))
})

test('following an unrelated member still works', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'follows/me_other'), { follower: 'me', target: 'other', createdAt: new Date() }))
})
```

- [ ] **Step 2: Run the rules tests to verify they fail**

Run: `npm run test:rules`
Expected: the six `assertFails` tests FAIL (the writes currently succeed); the two `assertSucceeds` tests pass already.

- [ ] **Step 3: Add the helper and the gates**

In `firestore.rules`, after `signedIn()`:

```
    // Both directions, because exists() on one only proves a one-way block. Two
    // constructible document paths, so no index and no denormalisation — the same
    // idiom the socials mutual-follow gate uses.
    function blockedEitherWay(other) {
      return exists(/databases/$(database)/documents/users/$(other)/blocks/$(request.auth.uid))
        || exists(/databases/$(database)/documents/users/$(request.auth.uid)/blocks/$(other));
    }
```

In `match /conversations/{convId}`, extend `allow create` with, and add to the messages `allow create`:

```
      allow create: if signedIn()
        && request.resource.data.participants.size() == 2
        && request.auth.uid in request.resource.data.participants
        && request.resource.data.requestedBy == request.auth.uid
        && request.resource.data.status == 'pending'
        && !blockedEitherWay(
             request.resource.data.participants[0] == request.auth.uid
               ? request.resource.data.participants[1]
               : request.resource.data.participants[0]
           );
```

```
        allow create: if signedIn()
          && request.resource.data.authorUid == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants
          && (
            get(/databases/$(database)/documents/conversations/$(convId)).data.status == 'open' ||
            get(/databases/$(database)/documents/conversations/$(convId)).data.requestedBy == request.auth.uid
          )
          && !blockedEitherWay(
               get(/databases/$(database)/documents/conversations/$(convId)).data.participants[0] == request.auth.uid
                 ? get(/databases/$(database)/documents/conversations/$(convId)).data.participants[1]
                 : get(/databases/$(database)/documents/conversations/$(convId)).data.participants[0]
             );
```

In `match /follows/{followId}`, extend `allow create` with `&& !blockedEitherWay(request.resource.data.target);`.

- [ ] **Step 4: Run the rules tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS, 62 tests. If a test errors rather than failing, the ternary is malformed — rules ternaries need the whole expression parenthesised as written above.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/firestore.rules thirdspace-app/__tests__/rules/firestore.rules.test.ts
git commit -m "feat: deny DMs and follows in both directions once a block exists"
```

## Task 3: The pure read-side filters

**Files:**
- Create: `thirdspace-app/utils/blocks.ts`
- Test: `thirdspace-app/__tests__/utils/blocks.test.ts`

**Interfaces:**
- Consumes: `dmConversationId` from `utils/chat.ts`; `ChatThread`, `CommunityEvent`, `Registration` from `types/models.ts`.
- Produces: `hideBlockedEvents(events, blocked)`, `hideBlockedThreads(threads, blocked, myUid)`, `hideBlockedRegistrations(regs, blocked)`, `excludeBlocked(uids, blocked)`, `dmPartnerUid(threadId, myUid)`. All take `blocked: ReadonlySet<string>`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/utils/blocks.test.ts`:

```ts
import { dmPartnerUid, excludeBlocked, hideBlockedEvents, hideBlockedRegistrations, hideBlockedThreads } from '../../utils/blocks'
import type { ChatThread, CommunityEvent, Registration } from '../../types/models'

const blocked = new Set(['bad'])

const event = (id: string, venueId: string) => ({ id, venueId } as CommunityEvent)
const thread = (id: string, kind: 'group' | 'dm') => ({ id, kind } as ChatThread)

describe('hideBlockedEvents', () => {
  it('hides events hosted by a blocked member', () => {
    // venueId IS the hoster uid — venues are keyed by uid, one per hoster.
    const kept = hideBlockedEvents([event('e1', 'bad'), event('e2', 'good')], blocked)
    expect(kept.map((e) => e.id)).toEqual(['e2'])
  })

  it('returns the list untouched when nothing is blocked', () => {
    const events = [event('e1', 'bad')]
    expect(hideBlockedEvents(events, new Set())).toBe(events)
  })
})

describe('dmPartnerUid', () => {
  it('reads the other party out of the sorted-pair thread id', () => {
    expect(dmPartnerUid('alice_bob', 'alice')).toBe('bob')
    expect(dmPartnerUid('alice_bob', 'bob')).toBe('alice')
  })

  it('returns null for an id that is not a pair containing me', () => {
    // A group thread id is an event id, and a malformed id must not resolve to a
    // partner — that would filter an unrelated thread out of somebody's list.
    expect(dmPartnerUid('event123', 'alice')).toBeNull()
    expect(dmPartnerUid('alice_bob', 'carol')).toBeNull()
  })
})

describe('hideBlockedThreads', () => {
  it('drops a DM with a blocked member and keeps every group thread', () => {
    const kept = hideBlockedThreads([thread('me_bad', 'dm'), thread('me_good', 'dm'), thread('bad', 'group')], blocked, 'me')
    expect(kept.map((t) => t.id)).toEqual(['me_good', 'bad'])
  })
})

describe('hideBlockedRegistrations', () => {
  it('omits blocked attendees', () => {
    const regs = [{ uid: 'bad' }, { uid: 'good' }] as Registration[]
    expect(hideBlockedRegistrations(regs, blocked).map((r) => r.uid)).toEqual(['good'])
  })
})

describe('excludeBlocked', () => {
  it('removes blocked uids from a list', () => {
    expect(excludeBlocked(['bad', 'good'], blocked)).toEqual(['good'])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/utils/blocks.test.ts`
Expected: FAIL — `Cannot find module '../../utils/blocks'`.

- [ ] **Step 3: Write the module**

Create `utils/blocks.ts`:

```ts
import type { ChatThread, CommunityEvent, Registration } from '../types/models'

/**
 * Read-side block filtering, pure.
 *
 * Rules cannot filter a query result — only allow or deny the whole query — so read
 * suppression is client-side no matter how much is enforced server-side. Keeping it here
 * rather than in the hooks means every surface filters identically and the behaviour is
 * testable without a renderer.
 *
 * Each function returns the ORIGINAL array when nothing is blocked, so the common case
 * costs no allocation and referential equality survives for useMemo consumers.
 */

/**
 * A DM thread id is the sorted uid pair (see utils/chat.ts dmConversationId), so the
 * partner is derivable without a lookup. Returns null for anything that is not a pair
 * containing me — a group thread id is an event id, and resolving one of those to a
 * "partner" would filter an unrelated thread out of somebody's list.
 */
export function dmPartnerUid(threadId: string, myUid: string): string | null {
  const parts = threadId.split('_')
  if (parts.length !== 2) return null
  if (parts[0] === myUid) return parts[1]
  if (parts[1] === myUid) return parts[0]
  return null
}

export function hideBlockedEvents(
  events: CommunityEvent[],
  blocked: ReadonlySet<string>
): CommunityEvent[] {
  if (blocked.size === 0) return events
  // venueId is the hoster's uid: venues/{uid} is keyed by it, one venue per hoster.
  return events.filter((e) => !blocked.has(e.venueId))
}

export function hideBlockedThreads(
  threads: ChatThread[],
  blocked: ReadonlySet<string>,
  myUid: string
): ChatThread[] {
  if (blocked.size === 0) return threads
  return threads.filter((t) => {
    if (t.kind !== 'dm') return true
    const partner = dmPartnerUid(t.id, myUid)
    return partner === null || !blocked.has(partner)
  })
}

export function hideBlockedRegistrations(
  registrations: Registration[],
  blocked: ReadonlySet<string>
): Registration[] {
  if (blocked.size === 0) return registrations
  return registrations.filter((r) => !blocked.has(r.uid))
}

export function excludeBlocked(uids: string[], blocked: ReadonlySet<string>): string[] {
  if (blocked.size === 0) return uids
  return uids.filter((uid) => !blocked.has(uid))
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest __tests__/utils/blocks.test.ts`
Expected: PASS, 8 tests. If `Registration` has no `uid`, check `types/models.ts` and use the field that carries the attendee uid.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/utils/blocks.ts thirdspace-app/__tests__/utils/blocks.test.ts
git commit -m "feat: add pure read-side block filters"
```

## Task 4: The `useBlocks` module store

**Files:**
- Create: `thirdspace-app/hooks/useBlocks.ts`
- Modify: `thirdspace-app/app/(app)/_layout.tsx` (call `syncBlocks` in an effect)
- Test: `thirdspace-app/__tests__/hooks/useBlocks.test.tsx`

**Interfaces:**
- Consumes: `subscribeBlocks` from `services/blocks.ts`.
- Produces: `syncBlocks(uid: string | undefined): void`, `useBlocks(): { blocked: ReadonlySet<string>; isBlocked: (uid: string) => boolean; loading: boolean }`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/hooks/useBlocks.test.tsx`:

```tsx
import React from 'react'
import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { syncBlocks, useBlocks } from '../../hooks/useBlocks'
import { subscribeBlocks } from '../../services/blocks'

jest.mock('../../services/blocks', () => ({ subscribeBlocks: jest.fn() }))

let emit: (uids: string[]) => void = () => {}
const unsub = jest.fn()

function Probe() {
  const { blocked, loading } = useBlocks()
  return <Text>{loading ? 'loading' : [...blocked].join(',') || 'none'}</Text>
}

beforeEach(() => {
  unsub.mockClear()
  ;(subscribeBlocks as jest.Mock).mockReset().mockImplementation((_uid, onData) => {
    emit = onData
    return unsub
  })
  syncBlocks(undefined) // reset module state between tests
})

it('starts loading and publishes the set once the snapshot arrives', async () => {
  const { getByText } = render(<Probe />)
  syncBlocks('me')
  emit(['bad', 'worse'])
  await waitFor(() => expect(getByText('bad,worse')).toBeTruthy())
})

it('clears the set and unsubscribes on sign-out', async () => {
  syncBlocks('me')
  emit(['bad'])
  const { getByText } = render(<Probe />)
  syncBlocks(undefined)
  await waitFor(() => expect(getByText('none')).toBeTruthy())
  expect(unsub).toHaveBeenCalled()
})

it('does not resubscribe for the same uid', () => {
  syncBlocks('me')
  syncBlocks('me')
  expect(subscribeBlocks).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/hooks/useBlocks.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useBlocks'`.

- [ ] **Step 3: Write the hook**

Create `hooks/useBlocks.ts`:

```ts
import { useSyncExternalStore } from 'react'
import { subscribeBlocks } from '../services/blocks'

/**
 * The blocked set, app-wide.
 *
 * A module store rather than a hook-per-screen (the useUserLocation / useDiscoverFilters
 * pattern) because five unrelated surfaces filter on it — the chat list, Discover, a
 * member profile, a guest list and the connections list — and one subscription for the
 * session is the honest shape for something every screen reads and one screen writes.
 *
 * `loading` starts true so a surface never renders an unfiltered list first and then
 * removes rows: a blocked member flashing into view is exactly the failure the feature
 * exists to prevent.
 */
interface BlocksState {
  blocked: ReadonlySet<string>
  loading: boolean
}

const EMPTY: ReadonlySet<string> = new Set()

let state: BlocksState = { blocked: EMPTY, loading: true }
let currentUid: string | undefined
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): BlocksState {
  return state
}

/**
 * Attach to one account's block list. Idempotent per uid, so calling it from an effect
 * that re-runs is free. Passing undefined (sign-out) tears down and clears — never leave
 * one account's blocks in place for the next user of the device.
 */
export function syncBlocks(uid: string | undefined): void {
  if (uid === currentUid) return
  currentUid = uid
  unsubscribe?.()
  unsubscribe = null

  if (!uid) {
    state = { blocked: EMPTY, loading: false }
    emit()
    return
  }

  state = { blocked: EMPTY, loading: true }
  emit()
  unsubscribe = subscribeBlocks(
    uid,
    (uids) => {
      state = { blocked: new Set(uids), loading: false }
      emit()
    },
    () => {
      // A failed read must not hide the whole app behind a permanent loading state.
      // Failing open is the right call here: the WRITE gates in firestore.rules are
      // the enforcement, and this is only presentation.
      state = { blocked: EMPTY, loading: false }
      emit()
    }
  )
}

export function useBlocks() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return {
    blocked: snap.blocked,
    isBlocked: (uid: string) => snap.blocked.has(uid),
    loading: snap.loading,
  }
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest __tests__/hooks/useBlocks.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Attach it once, in the app group layout**

In `app/(app)/_layout.tsx`, add the import and an effect (the layout stays mounted under every pushed route, which is why it is the right attach point — the same reasoning that puts `RewardWatcher` beside the tab navigator):

```tsx
  const { user } = useAuth()
  useEffect(() => {
    syncBlocks(user?.uid)
  }, [user?.uid])
```

- [ ] **Step 6: Verify and commit**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean, all tests pass.

```bash
git add thirdspace-app/hooks/useBlocks.ts thirdspace-app/__tests__/hooks/useBlocks.test.tsx "thirdspace-app/app/(app)/_layout.tsx"
git commit -m "feat: publish the blocked set app-wide through a module store"
```

## Task 5: Filter the five read surfaces

**Files:**
- Modify: `thirdspace-app/hooks/useChatList.ts`, `thirdspace-app/hooks/useConnections.ts`, `thirdspace-app/app/(app)/(attender)/index.tsx`, `thirdspace-app/app/(app)/guest-list/[id].tsx`, `thirdspace-app/app/(app)/member/[uid].tsx`
- Test: `thirdspace-app/__tests__/hooks/useChatList.blocks.test.tsx` (new), plus the existing suites must stay green

**Interfaces:**
- Consumes: `useBlocks` (Task 4), the filters from Task 3.
- Produces: no new exports; `member/[uid].tsx` gains a blocked state.

- [ ] **Step 1: Write the failing test for the chat list**

The chat list is the surface where a leak is worst, so it gets the test. Mock `useBlocks` and the three chat subscriptions, assert a DM with a blocked partner never appears. Follow the mocking conventions in `__tests__/components/CloudPromptWatcher.test.tsx`: `jest.mock` for modules, `mock`-prefixed variables in factories.

```tsx
jest.mock('../../hooks/useBlocks', () => ({ useBlocks: () => ({ blocked: new Set(['bad']), isBlocked: (u: string) => u === 'bad', loading: false }) }))
```

Assert `threads.map(t => t.id)` excludes `me_bad` and still includes a group thread.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/hooks/useChatList.blocks.test.tsx`
Expected: FAIL — the blocked DM is present.

- [ ] **Step 3: Apply the filters**

`useChatList.ts` — wrap the existing memo:

```ts
  const { blocked } = useBlocks()
  const threads: ChatThread[] = useMemo(
    () => (uid ? hideBlockedThreads(buildChatThreads(groups, conversations, reads, uid), blocked, uid) : []),
    [groups, conversations, reads, uid, blocked]
  )
```

`useConnections.ts` — `excludeBlocked(mutualConnections(...), blocked)` inside the existing memo, with `blocked` added to its deps.

`(attender)/index.tsx` — apply before the borough step, so the widen-rather-than-empty fallback counts only events the member can actually see:

```ts
  const { blocked } = useBlocks()
  const visibleEvents = useMemo(() => hideBlockedEvents(events, blocked), [events, blocked])
  const filtered = useMemo(() => applyEventFilters(visibleEvents, filters, query), [visibleEvents, filters, query])
```

`guest-list/[id].tsx` — `hideBlockedRegistrations(attendees, blocked)` where the list renders.

`member/[uid].tsx` — before the profile body, render a blocked state instead:

```tsx
  const { isBlocked } = useBlocks()
  if (isBlocked(uid)) {
    return (
      <Screen tone="cream">
        <View style={styles.header}><BackButton /></View>
        <EmptyState
          emoji="🚫"
          title="You blocked this member"
          body="They cannot message or follow you. Unblock them from Settings to see their profile again."
          actionLabel="Blocked users"
          onAction={() => router.push('/(app)/blocked-users')}
        />
      </Screen>
    )
  }
```

- [ ] **Step 4: Run the full suite**

Run: `npx jest && npx tsc --noEmit`
Expected: the new test passes and nothing regresses. If a hook test fails on a missing `useBlocks` mock, add it — the store is module-level, so an unmocked `useBlocks` returns the empty set and is harmless, but an assertion on subscription counts may notice.

- [ ] **Step 5: Commit**

```bash
git add -A thirdspace-app/hooks thirdspace-app/app thirdspace-app/__tests__
git commit -m "feat: hide blocked members from every read surface"
```

## Task 6: The blocked-users screen and its settings row

**Files:**
- Create: `thirdspace-app/app/(app)/blocked-users.tsx`
- Modify: `thirdspace-app/app/(app)/settings.tsx`
- Test: `thirdspace-app/__tests__/screens/blockedUsers.test.tsx`

**Interfaces:**
- Consumes: `subscribeBlockedUsers`, `unblockUser` (Task 1); `getProfile` from `services/profiles.ts` for names.
- Produces: route `/(app)/blocked-users`.

- [ ] **Step 1: Write the failing test**

Render the screen with `subscribeBlockedUsers` mocked to emit two entries and `getProfile` mocked to return display names; assert both names render, then press Unblock on one and assert `unblockUser` was called with `(myUid, thatUid)`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/screens/blockedUsers.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the screen**

Follow `settings.tsx` for the shell (`Screen tone="cream"`, `BackButton`, `Display role="screenTitle"`) and `connections.tsx` for the row shape. Each row: avatar (`avatarColor`/`initials` from `utils/avatar.ts`), display name, and an Unblock button styled with `palette.clay`. Empty state via `components/EmptyState.tsx`: title "No one is blocked", body "Anyone you block will show up here so you can undo it." — Apple expects blocking to be reversible, which is the whole reason this screen exists.

- [ ] **Step 4: Add the settings row**

In `settings.tsx`, after the Change password row, a `navRow` to `/(app)/blocked-users` titled "Blocked users" with hint "Members you have blocked, and how to undo it".

- [ ] **Step 5: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add "thirdspace-app/app/(app)/blocked-users.tsx" "thirdspace-app/app/(app)/settings.tsx" thirdspace-app/__tests__/screens/blockedUsers.test.tsx
git commit -m "feat: add a blocked users screen reachable from settings"
```

## Task 7: The action sheet, and failure copy that reveals nothing

**Files:**
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx:130` (the dead `TouchableOpacity`)
- Modify: `thirdspace-app/app/(app)/chat/[id].tsx` (send failure copy)
- Modify: `thirdspace-app/components/MemberProfileCard.tsx` or the follow call site (follow failure copy)
- Test: `thirdspace-app/__tests__/screens/memberActions.test.tsx`

**Interfaces:**
- Consumes: `blockUser` (Task 1). Report lands in Task 9 — this task leaves a single-action sheet and a `// Report is added in Task 9` comment.
- Produces: nothing importable.

- [ ] **Step 1: Write the failing test**

Assert that pressing "Block or report" opens an `ActionSheetIOS`-free custom sheet (use a `Modal`, as `CloudPrompt` does — `ActionSheetIOS` is iOS-only and this app ships Android too), that choosing Block calls `blockUser`, and that a `confirm` step exists so a mis-tap cannot block someone silently.

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest __tests__/screens/memberActions.test.tsx`
Expected: FAIL — the button has no `onPress`.

- [ ] **Step 3: Implement the sheet**

Replace the dead control:

```tsx
<TouchableOpacity style={styles.blockBtn} onPress={() => setSheetOpen(true)} activeOpacity={0.7}>
  <Body role="bodySm">Block or report</Body>
</TouchableOpacity>
```

A `Modal` sheet with: **Block <name>** (destructive, `palette.clay`), **Report** (Task 9), **Cancel**. Blocking confirms first ("They will not be able to message or follow you."), then calls `blockUser(user.uid, uid)` and navigates back — the profile is now a blocked state, so staying on it would be odd.

- [ ] **Step 4: Neutral failure copy**

In `chat/[id].tsx`, the send catch must set exactly `"This message could not be sent."` — never text that names a block. Same for the follow call site: `"That didn't work. Try again."` A blocked write fails at the rules layer with `permission-denied`, and the two indistinguishable cases (blocked, or genuinely offline) must read identically. Add a comment saying so, because a future contributor will otherwise "improve" the message.

- [ ] **Step 5: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add -A thirdspace-app/app thirdspace-app/components thirdspace-app/__tests__
git commit -m "feat: make the block control real, with failure copy that reveals nothing"
```

**Phase 1 gate:** `npx tsc --noEmit`, `npx jest`, `npm run test:rules` all green. Then continue.

---

# Phase 2 — Reporting

## Task 8: The reports collection, its rules, and its service

**Files:**
- Modify: `thirdspace-app/firestore.rules`, `thirdspace-app/types/models.ts`
- Create: `thirdspace-app/services/reports.ts`
- Test: `thirdspace-app/__tests__/rules/firestore.rules.test.ts` (append)

**Interfaces:**
- Produces: `type ReportKind = 'user' | 'message' | 'event'`; `type ReportReason = 'harassment' | 'spam' | 'nudity' | 'hate' | 'violence' | 'other'`; `interface Report`; `submitReport(input: SubmitReportInput): Promise<void>`.

- [ ] **Step 1: Write the failing rules tests**

```ts
// ── reports: create-only, and unreadable by everyone ──────────────────────
// A report is an accusation about a third party. Making it client-readable would leak
// who reported whom, so it is written blind and read only through the console or the
// Admin SDK, both of which bypass rules.
const reportBody = (reporterUid: string) => ({
  reporterUid, kind: 'user', targetUid: 'them', reason: 'harassment', createdAt: new Date(),
})

test('a signed-in member can file a report as themselves', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'reports/r1'), reportBody('me')))
})

test('a member cannot file a report in somebody else\'s name', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'reports/r2'), reportBody('someone-else')))
})

test('nobody can read, update or delete a report — not even its author', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'reports/r3'), reportBody('me'))
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'reports/r3')))
  await assertFails(updateDoc(doc(me, 'reports/r3'), { reason: 'spam' }))
  await assertFails(deleteDoc(doc(me, 'reports/r3')))
})
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test:rules`
Expected: the first test FAILS (no rule allows the create).

- [ ] **Step 3: Add the rule** (top level, beside `phoneIndex`)

```
    // Create-only, never client-readable. See __tests__/rules/firestore.rules.test.ts
    // for why: a readable report leaks who reported whom.
    match /reports/{reportId} {
      allow create: if signedIn() && request.resource.data.reporterUid == request.auth.uid;
      allow read, update, delete: if false;
    }
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test:rules`
Expected: PASS, 65 tests.

- [ ] **Step 5: Types and service**

`types/models.ts`:

```ts
export type ReportKind = 'user' | 'message' | 'event'
export type ReportReason = 'harassment' | 'spam' | 'nudity' | 'hate' | 'violence' | 'other'

export interface Report {
  id: string
  reporterUid: string
  kind: ReportKind
  targetUid: string
  threadId?: string
  messageId?: string
  eventId?: string
  reason: ReportReason
  details?: string
  createdAt: Timestamp | null
}
```

`services/reports.ts`: `submitReport` with `addDoc`, spreading optional keys in (`...(input.threadId ? { threadId: input.threadId } : {})`) because Firestore rejects an explicit `undefined`, and `createdAt: serverTimestamp()`.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/firestore.rules thirdspace-app/types/models.ts thirdspace-app/services/reports.ts thirdspace-app/__tests__/rules/firestore.rules.test.ts
git commit -m "feat: add a create-only reports collection"
```

## Task 9: `ReportSheet` and the three entry points

**Files:**
- Create: `thirdspace-app/components/ReportSheet.tsx`
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx`, `thirdspace-app/app/(app)/chat/[id].tsx`, `thirdspace-app/app/(app)/event/[id].tsx`
- Test: `thirdspace-app/__tests__/components/ReportSheet.test.tsx`

**Interfaces:**
- Consumes: `submitReport` (Task 8).
- Produces: `<ReportSheet target={{ kind, targetUid, threadId?, messageId?, eventId? }} visible onClose />`.

- [ ] **Step 1: Write the failing test**

Assert the six reasons render, that choosing one plus Submit calls `submitReport` with the target payload, that a confirmation state appears afterwards ("Thanks — we'll look at this"), and that `onClose` fires. Reason copy must read as plain English, not enum values.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/components/ReportSheet.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the sheet**

A `Modal` (same approach as `CloudPrompt`), a `Display` title "Report this <thing>", six reason rows, an optional `details` `TextInput` (`FormInput` styling), Submit and Cancel. Submit is disabled until a reason is chosen. On success show the acknowledgement — Apple's clause is about responsiveness, and a silent close reads as nothing having happened.

- [ ] **Step 4: Wire the three entry points**

- `member/[uid].tsx` — the Report row in the Task 7 sheet opens `<ReportSheet target={{ kind: 'user', targetUid: uid }} />`.
- `chat/[id].tsx` — long-press a bubble (`onLongPress` on the existing `ChatBubble` wrapper) opens `{ kind: 'message', targetUid: message.authorUid, threadId: id, messageId: message.id }`. Long-press on your OWN message does nothing.
- `event/[id].tsx` — a "Report this event" row in the detail body opens `{ kind: 'event', targetUid: event.venueId, eventId: event.id }`.

- [ ] **Step 5: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add -A thirdspace-app/components thirdspace-app/app thirdspace-app/__tests__
git commit -m "feat: let members report a profile, a message or an event"
```

## Task 10: `onReportCreated` — make the queue reach a human

**Files:**
- Create: `thirdspace-app/functions/src/onReportCreated.ts`, `thirdspace-app/functions/src/onReportCreated.test.ts`
- Modify: `thirdspace-app/functions/src/index.ts`

**Interfaces:**
- Produces: `handleReportCreated(db: Firestore, report: ReportDoc): Promise<void>` and the `onReportCreated` trigger export.

**Deviation from the spec, stated:** the spec says this function "emails the support address". No email provider or credential exists in this project, and inventing one would be a fake. Instead the function writes a document to `mail/{autoId}` in the shape the official *Trigger Email from Firestore* extension consumes, and logs a structured line. Installing that extension (or swapping the write for an API call) is a deployment step, recorded in Task 19. The function's contract — "a report becomes a notification" — is unchanged and testable today.

- [ ] **Step 1: Write the failing test**

Follow `onNewFollow.test.ts`: a `fakeDb` object with `doc`/`collection` stubs, no emulator.

```ts
it('writes a mail document naming the reporter, the target and the reason', async () => {
  await handleReportCreated(fakeDb, {
    reporterUid: 'maya', kind: 'message', targetUid: 'sam',
    threadId: 'maya_sam', messageId: 'm1', reason: 'harassment', details: 'kept messaging',
  })
  expect(added).toHaveLength(1)
  expect(added[0].to).toEqual([SUPPORT_EMAIL])
  expect(added[0].message.subject).toBe('[Report] message — harassment')
  expect(added[0].message.text).toContain('maya_sam')
  expect(added[0].message.text).toContain('sam')
})

it('still writes when the optional fields are absent', async () => {
  await handleReportCreated(fakeDb, { reporterUid: 'maya', kind: 'user', targetUid: 'sam', reason: 'spam' })
  expect(added[0].message.text).not.toContain('undefined')
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd functions && npx jest onReportCreated`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`onReportCreated.ts`: a `SUPPORT_EMAIL` constant, a pure `handleReportCreated` building the mail body (every optional field guarded so the string never contains "undefined" — a support queue is read by a human), and the trigger:

```ts
export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const data = event.data?.data()
  if (!data) return
  await handleReportCreated(getFirestore(), data as ReportDoc)
})
```

- [ ] **Step 4: Run to verify it passes, then export**

Run: `cd functions && npx jest`
Expected: PASS, 25 tests. Add `export { onReportCreated } from './onReportCreated'` to `functions/src/index.ts`.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/functions/src
git commit -m "feat: turn a new report into a support notification"
```

**Phase 2 gate:** all four suites green.

---

# Phase 3 — Account deletion

## Task 11: The collection-group index

**Files:**
- Create: `thirdspace-app/firestore.indexes.json`
- Modify: `thirdspace-app/firebase.json`

**Interfaces:** none — configuration only.

**Why this is its own task:** it breaks a documented invariant ("no composite indexes anywhere in this app; all queries use single-field where only"). Collection-group single-field indexes are **not** created automatically, so the deletion cascade cannot find a user's messages without this. A reviewer should be able to reject or accept this change on its own.

- [ ] **Step 1: Write the index config**

```json
{
  "indexes": [],
  "fieldOverrides": [
    {
      "collectionGroup": "messages",
      "fieldPath": "authorUid",
      "indexes": [
        { "order": "ASCENDING", "queryScope": "COLLECTION" },
        { "order": "ASCENDING", "queryScope": "COLLECTION_GROUP" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Wire it into `firebase.json`**

```json
  "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
```

- [ ] **Step 3: Verify the config parses**

Run: `npx firebase-tools deploy --only firestore:indexes --dry-run` (if `--dry-run` is unsupported in the installed CLI, run `node -e "JSON.parse(require('fs').readFileSync('firestore.indexes.json','utf8')); console.log('ok')"` and leave the real deploy to Task 19).
Expected: no parse error.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/firestore.indexes.json thirdspace-app/firebase.json
git commit -m "chore: add the app's first index config, a collection-group index on message authorUid"
```

## Task 12: The deletion cascade

**Files:**
- Create: `thirdspace-app/functions/src/deleteAccount.ts`, `thirdspace-app/functions/src/testing/fakeFirestore.ts`, `thirdspace-app/functions/src/deleteAccount.test.ts`
- Modify: `thirdspace-app/functions/src/index.ts`

**Interfaces:**
- Produces: `cascadeDelete(deps: DeleteDeps, uid: string): Promise<DeleteReport>` where `DeleteDeps = { db: Firestore; bucket: Bucket; auth: Auth }`, and the `deleteAccount` callable.

- [ ] **Step 1: Write the fake and the failing tests**

`fakeFirestore.ts` — an in-memory double supporting `doc().get/set/delete`, `collection().get`, `collectionGroup().where().get`, `batch()` and `runTransaction`, seeded from a plain object. The existing function tests use hand-rolled stubs per test; the cascade touches eight collections, so a shared double is worth it.

Tests, one per ordering guarantee:

```ts
it('deletes the Auth user LAST, after every cascade step', async () => {
  const order: string[] = []
  // ...record each step, then:
  expect(order[order.length - 1]).toBe('auth')
})

it('leaves the Auth user intact when a cascade step throws', async () => {
  // A mid-way failure must leave a recoverable, still-signed-in account rather than an
  // unreachable orphan whose data survives with no owner able to delete it.
  await expect(cascadeDelete(depsThatFailAtStep3, 'me')).rejects.toThrow()
  expect(auth.deleteUser).not.toHaveBeenCalled()
})

it('decrements registeredCount once per event the user was registered for', async () => { /* ... */ })
it('deletes follows where the user is the target as well as the follower', async () => { /* ... */ })
it('cancels a hoster\'s FUTURE events and leaves past ones alone', async () => { /* ... */ })
it('clears a thread\'s lastMessage snapshot when the last message was the deleted user\'s', async () => { /* ... */ })
it('chunks writes at 400', async () => { /* seed 900 docs, expect 3 batch commits */ })
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd functions && npx jest deleteAccount`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the cascade in the spec's order**

Steps 1–8 exactly as the spec's table: messages (collection-group on `authorUid`, hard deleted), registrations + `registeredCount` decrements, follows in both directions, profile + socials + redemptions, user doc + pushTokens + chatReads + blocks, venue + future events cancelled, Storage prefixes (`profilePhotos/{uid}/`, `venuePhotos/{uid}/`, `eventCovers/{uid}/`, `chatMedia/{uid}/`), Auth user last. Then thread-metadata repair: for every affected thread, if `lastMessageAuthor` belonged to the deleted user, recompute from the newest surviving message or clear it.

- [ ] **Step 4: Run to verify they pass**

Run: `cd functions && npx jest`
Expected: PASS.

- [ ] **Step 5: Add the callable and export it**

```ts
export const deleteAccount = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'You must be signed in.')
  await cascadeDelete({ db: getFirestore(), bucket: getStorage().bucket(), auth: getAuth() }, request.auth.uid)
  return { ok: true }
})
```

The callable takes **no uid argument** — it deletes the caller. Accepting a uid would be a way to delete somebody else's account.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/functions/src
git commit -m "feat: add the account deletion cascade, Auth user last"
```

## Task 13: The delete-account screen

**Files:**
- Create: `thirdspace-app/services/account.ts`, `thirdspace-app/app/(app)/delete-account.tsx`
- Modify: `thirdspace-app/app/(app)/settings.tsx`
- Test: `thirdspace-app/__tests__/screens/deleteAccount.test.tsx`

**Interfaces:**
- Consumes: the `deleteAccount` callable (Task 12).
- Produces: `deleteMyAccount(currentPassword?: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Assert: the consequences list renders; Delete is disabled until the confirmation text is typed exactly (`DELETE`); for a password account the password field is required and `reauthenticateWithCredential` runs before the callable; a failed re-auth shows a message and never calls the callable; success signs out and lands on `/(auth)/onboarding`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/screens/deleteAccount.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `services/account.ts`**

Mirror `services/auth.ts`: re-authenticate with `EmailAuthProvider.credential` for password accounts (skip for Apple/Google, where Firebase's recent-login window governs), then `httpsCallable(functions, 'deleteAccount')({})`, then `signOut(auth)`.

- [ ] **Step 4: Build the screen**

`Screen tone="cream"`, `BackButton`, title "Delete account". Spell the consequences out plainly — profile, messages, registrations and photos are removed; past events you attended stay on the record for other people; this cannot be undone. Typed confirmation, then a `palette.clay` button. On failure: "We couldn't delete your account. Try again, or contact support." — and do not sign out, because the account still exists.

- [ ] **Step 5: Settings row**

Last row, `palette.clay` title "Delete account", hint "Permanently remove your account and data".

- [ ] **Step 6: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add -A thirdspace-app/services thirdspace-app/app thirdspace-app/__tests__
git commit -m "feat: let a member delete their account from settings"
```

**Phase 3 gate:** all four suites green.

---

# Phase 4 — Terms, EULA and policy links

## Task 14: `constants/legal.ts` and the settings rows

**Files:**
- Create: `thirdspace-app/constants/legal.ts`
- Modify: `thirdspace-app/app/(app)/settings.tsx`
- Test: `thirdspace-app/__tests__/constants/legal.test.ts`

**Interfaces:**
- Produces: `PRIVACY_POLICY_URL`, `TERMS_URL`, `SUPPORT_URL`, `TERMS_VERSION`.

- [ ] **Step 1: Write the failing test**

```ts
it('gives every legal URL an https origin on the company domain', () => {
  for (const url of [PRIVACY_POLICY_URL, TERMS_URL, SUPPORT_URL]) {
    expect(url.startsWith('https://')).toBe(true)
  }
})

it('versions the terms with a date string, so re-acceptance is answerable', () => {
  // A boolean cannot answer "did they accept THESE terms".
  expect(TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/constants/legal.test.ts`

- [ ] **Step 3: Write the module**

One doc comment saying this is the only file where a legal URL may be written, mirroring how `constants/design.ts` owns colour. The URLs point at the company site from the release checklist's Stage 2; if that domain is not live yet, use the final intended URLs and note in the commit that they 404 until the site ships — **Apple checks these links**, so they are a release blocker in their own right.

- [ ] **Step 4: Add the two settings rows**

Privacy Policy and Terms, opened with `WebBrowser.openBrowserAsync` (`expo-web-browser` is already a dependency — no new package, no rebuild).

- [ ] **Step 5: Run and commit**

```bash
git add thirdspace-app/constants/legal.ts "thirdspace-app/app/(app)/settings.tsx" thirdspace-app/__tests__/constants/legal.test.ts
git commit -m "feat: add the legal URLs and reach them from settings"
```

## Task 15: Terms acceptance at sign-up

**Files:**
- Modify: `thirdspace-app/utils/validation.ts`, `thirdspace-app/app/(auth)/sign-up.tsx`, `thirdspace-app/services/profiles.ts`
- Test: `thirdspace-app/__tests__/utils/validation.test.ts` (extend), `thirdspace-app/__tests__/screens/signUpTerms.test.tsx` (new)

**Interfaces:**
- Consumes: `TERMS_VERSION` (Task 14).
- Produces: `validateSignUpForm` gains `termsAccepted: boolean`; `stampTermsAcceptance(uid: string): Promise<void>`.

**Deviation from the spec, stated:** the spec stamps `profiles/{uid}.termsAcceptedAt`. Acceptance happens at **sign-up**, before either `users/{uid}` or `profiles/{uid}` exists, and hosters never get a profile document at all — so a profile-only stamp would lose every hoster's acceptance. It is stamped on `users/{uid}` instead, the one document every account has, merged right after sign-up. Rules already allow an owner update that leaves `role` untouched.

- [ ] **Step 1: Write the failing tests**

```ts
it('requires the terms checkbox', () => {
  const errors = validateSignUpForm({ ...validFields, termsAccepted: false })
  expect(errors.termsAccepted).toBe('You must accept the Terms and Privacy Policy to continue.')
})

it('accepts the form once the box is checked', () => {
  expect(validateSignUpForm({ ...validFields, termsAccepted: true })).toEqual({})
})
```

Screen test: the submit button is disabled with the box unchecked, and a successful sign-up writes `termsAcceptedAt` and `termsVersion` onto `users/{uid}`.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/utils/validation.test.ts __tests__/screens/signUpTerms.test.tsx`

- [ ] **Step 3: Implement**

Add `termsAccepted` to the `validateSignUpForm` field type and `SignUpFormErrors`. In `sign-up.tsx`: a checkbox row (a `TouchableOpacity` with an `Ionicons` checkbox — no new dependency) whose label links the two URLs via `WebBrowser`, folded into the existing `canSubmit`. After every successful path — email, Apple and Google — call `stampTermsAcceptance(user.uid)`, which merges `{ termsAcceptedAt: serverTimestamp(), termsVersion: TERMS_VERSION }` into `users/{uid}`.

- [ ] **Step 4: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add -A thirdspace-app/utils thirdspace-app/app thirdspace-app/services thirdspace-app/__tests__
git commit -m "feat: require terms acceptance at sign-up and stamp the version"
```

**Phase 4 gate:** all suites green.

---

# Phase 5 — Content filtering

## Task 16: `utils/contentFilter.ts`

**Files:**
- Create: `thirdspace-app/utils/contentFilter.ts`
- Test: `thirdspace-app/__tests__/utils/contentFilter.test.ts`

**Interfaces:**
- Produces: `containsBlockedTerm(text: string): boolean`, `assertClean(text: string, field: string): void` (throws `Error('content-rejected:<field>')`).

- [ ] **Step 1: Write the failing test**

```ts
it('matches a blocked term regardless of case and surrounding punctuation', () => { /* ... */ })
it('does not match a blocked term embedded in a longer innocent word', () => {
  // Word-boundary matching, or "Scunthorpe" is unusable as a venue name. The filter is
  // a compliance floor; over-matching a real word is a bug users see immediately.
})
it('passes ordinary text', () => { /* ... */ })
it('throws a field-tagged error from assertClean so the UI can say which input', () => { /* ... */ })
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest __tests__/utils/contentFilter.test.ts`

- [ ] **Step 3: Implement**

A module-level `BLOCKED_TERMS` array (slurs and explicit sexual terms — keep the list short and defensible), normalised comparison (lower-case, strip diacritics), matched on word boundaries. Document plainly that this is a compliance floor, not moderation: Guideline 1.2 asks for "a method for filtering objectionable material", the report queue is the real mechanism, and anything cleverer before there are users to learn from is speculative.

- [ ] **Step 4: Run to verify it passes, then commit**

```bash
git add thirdspace-app/utils/contentFilter.ts thirdspace-app/__tests__/utils/contentFilter.test.ts
git commit -m "feat: add a wordlist content filter"
```

## Task 17: Wire the filter into the four write paths

**Files:**
- Modify: `thirdspace-app/services/chat.ts` (`sendEventMessage`, `sendDirectMessage`), `thirdspace-app/services/events.ts` (`buildEventDoc` callers), `thirdspace-app/services/profiles.ts` (`createProfile`, `updateProfile`)
- Modify the call sites that must surface the rejection: `thirdspace-app/app/(app)/chat/[id].tsx`, `thirdspace-app/app/(app)/create-event.tsx`, `thirdspace-app/app/(app)/edit-profile.tsx`
- Test: extend `__tests__/services/chat.test.ts` and the event/profile service tests

**Interfaces:**
- Consumes: `assertClean` (Task 16).

- [ ] **Step 1: Write the failing tests**

One per path: a send with a blocked term rejects and writes nothing (assert the Firestore mock was never called — a partial write here would be worse than the rejection), and a clean send still writes.

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest __tests__/services`

- [ ] **Step 3: Implement**

`assertClean` at the top of each write, before any Firestore call. The filter **rejects at the boundary with a user-facing message rather than silently stripping text** — silent modification of what someone wrote is its own kind of failure. Each screen maps `content-rejected:<field>` to "That <field> contains language we don't allow. Please edit it."

- [ ] **Step 4: Run and commit**

Run: `npx jest && npx tsc --noEmit`

```bash
git add -A thirdspace-app/services thirdspace-app/app thirdspace-app/__tests__
git commit -m "feat: reject objectionable text at the four write paths"
```

---

## Task 18: Documentation and the deployment steps

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`
- Modify: the technical document generator, then regenerate `docs/technical-document.docx`

- [ ] **Step 1: Amend the no-indexes invariant**

The codemap says "no composite indexes anywhere in this app. All Firestore queries use single-field `where` only." That is now false. Amend it in place, naming `firestore.indexes.json`, the collection-group index on `messages.authorUid`, and the one query that needs it — quietly breaking a documented invariant is worse than the index.

- [ ] **Step 2: Add the new surfaces to the codemap**

`users/{uid}/blocks/{blockedUid}` and `reports/{reportId}` in the collections table; `blocked-users.tsx` and `delete-account.tsx` in the route tree; the block asymmetry (symmetric writes, asymmetric reads) and the reason for it in Key Invariants; `constants/legal.ts` as the only place a legal URL may be written; the two new functions.

- [ ] **Step 3: Regenerate the technical document**

Update sections 7 (collections), 8 (rules), 10 (features), 12 (functions), 16 (status) and 17 (roadmap — the compliance spec moves from "specified but not implemented" to done), then regenerate the `.docx`.

- [ ] **Step 4: Record the deployment steps**

These need a project Owner and are **not** code:

1. Grant the three service-agent IAM bindings, then `npx firebase-tools deploy --only functions` (7 functions now).
2. `npx firebase-tools deploy --only firestore:rules,firestore:indexes` — the index build is asynchronous; the cascade query fails until it finishes.
3. Install the *Trigger Email from Firestore* extension, or replace the `mail/` write in `onReportCreated` with a provider API call, and set the support address.
4. Publish the privacy policy, terms and support pages at the URLs in `constants/legal.ts` — Apple opens them.
5. Seed the App Review demo account with real content: upcoming events, an active chat thread, and connections.

- [ ] **Step 5: Commit**

```bash
git add docs
git commit -m "docs: record the compliance surfaces and amend the no-indexes invariant"
```

---

## Self-review notes

**Spec coverage.** Component 1 → Tasks 1–7. Component 2 → Tasks 8–10. Component 3 → Tasks 11–13. Component 4 → Tasks 14–15. Component 5 → Tasks 16–17. Testing section → the test steps in every task, with rules tests asserting both block directions separately as the spec requires. Accepted consequences → carried into the code comments and the delete-account copy. "Open items outside this spec" → Task 18 Step 4, with the spec's stale storage claims corrected in the header.

**Two deviations, both stated where they occur:** `onReportCreated` writes a mail document rather than sending mail directly (no provider exists), and terms acceptance is stamped on `users/{uid}` rather than `profiles/{uid}` (hosters have no profile document). Both keep the spec's contract.

**Type consistency.** `blocked: ReadonlySet<string>` is the parameter type in every filter and the field name in `useBlocks`. `ReportKind`/`ReportReason` are used identically in `types/models.ts`, `services/reports.ts`, `ReportSheet` and `onReportCreated`. `cascadeDelete(deps, uid)` keeps that argument order at its callable and in its tests.
