# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver OS-level push notifications for new direct messages, venue announcements, and new followers/connections via Firestore-triggered Cloud Functions, with a global opt-out and tap-to-deep-link.

**Architecture:** The app writes documents exactly as today (unchanged). Three thin Firebase Functions v2 `onDocumentCreated` triggers observe those writes, resolve recipients server-side through a shared util (Admin SDK, bypasses security rules), and call the Expo Push API via a shared sender that prunes dead tokens. The client captures an Expo push token on sign-in, stores a global `pushEnabled` flag, and routes on notification tap. App and functions never import each other.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript, Firebase v11 (client) + Firebase Admin + Firebase Functions v2 (Node 22), `expo-notifications`, `expo-device`, `expo-server-sdk`, Jest.

## Global Constraints

- **New backend lives at `thirdspace-app/functions/`** (beside `firebase.json`/`.firebaserc`, which is how the Firebase CLI resolves `functions.source`). It has its **own** `package.json`, `tsconfig.json`, and Jest config, independent of the app.
- **No `any` in application code**; type public service/util APIs explicitly. (Narrow untyped Firestore/notification payloads through explicit local interfaces.)
- **`pushEnabled` absent = enabled.** Never treat a missing flag as opt-out.
- **Every trigger excludes the actor** (author/follower) from recipients.
- **Firestore convention:** `serverTimestamp()` for `updatedAt`.
- **Body text truncates to ≤140 chars** before sending.
- **Deep-link routes use the object form** already used across the app: `dm` → `/(app)/chat/[id]`, `announcement` → `/(app)/event/[id]`, `follow` → `/(app)/member/[uid]`.
- **firestore.rules changes require a manual `firebase deploy --only firestore:rules`**; **functions require a manual `firebase deploy --only functions`** and the Firebase project on the **Blaze** plan. The plan does not deploy.
- **Tested units are functions (`sendPush`, `recipients`, the three triggers) and client services/utils (`pushTokens`, `pushRouting`).** The registration hook and settings screen are verified by `tsc --noEmit` + manual device smoke, matching the repo's existing test surface.
- **Palette (existing):** background `#FBF7F2`, ink `#2C1810`, accent `#C4614A`, muted `#8C7B70`, warm border `rgba(242,197,160,0.5)`. Fonts `DMSerifDisplay_400Regular` (headings), `DMSans_400Regular`/`DMSans_500Medium` (body).

---

### Task 1: Scaffold the `functions/` Cloud Functions project

**Files:**
- Create: `thirdspace-app/functions/package.json`
- Create: `thirdspace-app/functions/tsconfig.json`
- Create: `thirdspace-app/functions/jest.config.js`
- Create: `thirdspace-app/functions/.gitignore`
- Create: `thirdspace-app/functions/src/index.ts`
- Create: `thirdspace-app/functions/src/scaffold.test.ts`
- Modify: `thirdspace-app/firebase.json` (add `functions` config)
- Modify: `thirdspace-app/package.json` (exclude `functions/` from the app Jest run)

**Interfaces:**
- Consumes: nothing.
- Produces: a buildable functions workspace; later tasks add modules under `functions/src/`.

- [ ] **Step 1: Create `functions/package.json`**

```json
{
  "name": "functions",
  "private": true,
  "main": "lib/index.js",
  "engines": { "node": "22" },
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "expo-server-sdk": "^3.10.0",
    "firebase-admin": "^12.6.0",
    "firebase-functions": "^6.1.0"
  },
  "devDependencies": {
    "@types/jest": "^29.5.12",
    "@types/node": "^22.0.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2021",
    "lib": ["es2021"],
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts"]
}
```

- [ ] **Step 3: Create `functions/jest.config.js`**

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
}
```

- [ ] **Step 4: Create `functions/.gitignore`**

```
node_modules/
lib/
```

- [ ] **Step 5: Create `functions/src/index.ts`** (triggers are appended in later tasks)

```ts
import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Trigger functions are exported here as they are implemented:
// export { onNewDirectMessage } from './onNewDirectMessage'
// export { onNewAnnouncement } from './onNewAnnouncement'
// export { onNewFollow } from './onNewFollow'
```

- [ ] **Step 6: Create `functions/src/scaffold.test.ts`** (proves the toolchain runs)

```ts
describe('functions toolchain', () => {
  it('runs TypeScript tests', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 7: Add the `functions` block to `thirdspace-app/firebase.json`**

Change the file to:

```json
{
  "firestore": { "rules": "firestore.rules" },
  "storage": { "rules": "storage.rules" },
  "functions": {
    "source": "functions",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": false }
  }
}
```

- [ ] **Step 8: Exclude `functions/` from the app Jest run**

The app's Jest (in `thirdspace-app/package.json`) uses the `jest-expo` preset and would otherwise sweep up the functions tests with the wrong environment. Add `<rootDir>/functions/` to its `testPathIgnorePatterns`. The block becomes:

```json
    "testPathIgnorePatterns": [
      "/node_modules/",
      "<rootDir>/__tests__/rules/",
      "<rootDir>/functions/"
    ],
```

- [ ] **Step 9: Install and verify build + test (functions) and confirm the app suite ignores them**

Run: `cd thirdspace-app/functions && npm install && npm run build && npm test`
Expected: `tsc` emits `lib/` with no errors; Jest reports 1 passing test.

Run: `cd thirdspace-app && npx jest 2>&1 | tail -3`
Expected: the app suite still runs its existing suites only — no `functions/` tests appear.

- [ ] **Step 10: Commit**

```bash
git add thirdspace-app/functions/package.json thirdspace-app/functions/package-lock.json thirdspace-app/functions/tsconfig.json thirdspace-app/functions/jest.config.js thirdspace-app/functions/.gitignore thirdspace-app/functions/src/index.ts thirdspace-app/functions/src/scaffold.test.ts thirdspace-app/firebase.json thirdspace-app/package.json
git commit -m "chore: scaffold cloud functions workspace for push"
```

---

### Task 2: `sendPush` — Expo Push API sender + body truncation

**Files:**
- Create: `thirdspace-app/functions/src/sendPush.ts`
- Test: `thirdspace-app/functions/src/sendPush.test.ts`

**Interfaces:**
- Consumes: `expo-server-sdk`.
- Produces:
  - `interface PushMessage { to: string; title: string; body: string; data: Record<string, unknown> }`
  - `sendPush(messages: PushMessage[]): Promise<string[]>` — sends via Expo, returns the token strings that came back `DeviceNotRegistered` (for pruning). Empty/invalid input → `[]`, no network call.
  - `truncateBody(text: string, max?: number): string` — default max 140; appends `…` when it truncates.

- [ ] **Step 1: Write the failing test**

```ts
const mockSend = jest.fn()
jest.mock('expo-server-sdk', () => ({
  Expo: class {
    chunkPushNotifications(msgs: unknown[]) { return [msgs] }
    sendPushNotificationsAsync(chunk: unknown[]) { return mockSend(chunk) }
    static isExpoPushToken() { return true }
  },
}))

import { sendPush, truncateBody } from './sendPush'

beforeEach(() => jest.clearAllMocks())

describe('truncateBody', () => {
  it('leaves short text untouched', () => {
    expect(truncateBody('hello')).toBe('hello')
  })
  it('truncates long text with an ellipsis', () => {
    const out = truncateBody('a'.repeat(200))
    expect(out.length).toBeLessThanOrEqual(140)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('sendPush', () => {
  it('is a no-op for empty input', async () => {
    const dead = await sendPush([])
    expect(mockSend).not.toHaveBeenCalled()
    expect(dead).toEqual([])
  })

  it('returns tokens whose ticket is DeviceNotRegistered', async () => {
    mockSend.mockResolvedValue([
      { status: 'ok' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ])
    const dead = await sendPush([
      { to: 'tok_ok', title: 'A', body: 'x', data: {} },
      { to: 'tok_dead', title: 'B', body: 'y', data: {} },
    ])
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(dead).toEqual(['tok_dead'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app/functions && npx jest src/sendPush.test.ts`
Expected: FAIL — `Cannot find module './sendPush'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/functions/src/sendPush.ts
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'

const expo = new Expo()

export interface PushMessage {
  to: string
  title: string
  body: string
  data: Record<string, unknown>
}

export function truncateBody(text: string, max = 140): string {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

// Sends the messages and returns the tokens that Expo reported as no longer registered.
export async function sendPush(messages: PushMessage[]): Promise<string[]> {
  const valid = messages.filter((m) => Expo.isExpoPushToken(m.to))
  if (valid.length === 0) return []

  const dead: string[] = []
  const chunks = expo.chunkPushNotifications(valid as unknown as ExpoPushMessage[])
  for (const chunk of chunks) {
    const tickets = (await expo.sendPushNotificationsAsync(chunk)) as ExpoPushTicket[]
    tickets.forEach((ticket, i) => {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        dead.push((chunk[i] as unknown as PushMessage).to)
      }
    })
  }
  return dead
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app/functions && npx jest src/sendPush.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/functions/src/sendPush.ts thirdspace-app/functions/src/sendPush.test.ts
git commit -m "feat: add expo push sender with dead-token pruning"
```

---

### Task 3: `recipients` — resolution, filtering, and token pruning helpers

**Files:**
- Create: `thirdspace-app/functions/src/recipients.ts`
- Test: `thirdspace-app/functions/src/recipients.test.ts`

**Interfaces:**
- Consumes: `firebase-admin/firestore` `Firestore` type (injected as a parameter for testability).
- Produces:
  - `interface PushTarget { uid: string; token: string }`
  - `activeTokensFor(db, uids: string[]): Promise<PushTarget[]>` — for each uid whose `users/{uid}.pushEnabled !== false`, expands every token in `users/{uid}/pushTokens`.
  - `isThreadMuted(db, uid: string, convId: string): Promise<boolean>` — reads `users/{uid}/chatReads/{convId}.muted`.
  - `isMutualFollow(db, followerUid: string, targetUid: string): Promise<boolean>` — existence of `follows/{targetUid}_{followerUid}`.
  - `pruneDeadTokens(db, targets: PushTarget[], deadTokens: string[]): Promise<void>` — deletes the `pushTokens` docs whose token is dead.

- [ ] **Step 1: Write the failing test**

```ts
import { Firestore } from 'firebase-admin/firestore'
import { activeTokensFor, isThreadMuted, isMutualFollow, pruneDeadTokens } from './recipients'

interface FakeData {
  users?: Record<string, { pushEnabled?: boolean }>
  tokens?: Record<string, string[]>   // uid -> token doc ids
  mutes?: Record<string, boolean>     // "uid/convId" -> muted
  follows?: Set<string>               // present follow doc ids
}

function fakeDb(data: FakeData, deleted: string[] = []) {
  return {
    doc: (path: string) => ({
      get: async () => {
        const parts = path.split('/')
        if (parts[0] === 'users' && parts.length === 2) {
          const u = data.users?.[parts[1]]
          return { exists: !!u, get: (f: string) => (u ? (u as Record<string, unknown>)[f] : undefined) }
        }
        if (parts[0] === 'users' && parts[2] === 'chatReads') {
          const muted = data.mutes?.[`${parts[1]}/${parts[3]}`]
          return { exists: muted !== undefined, get: () => muted }
        }
        if (parts[0] === 'follows') {
          return { exists: !!data.follows?.has(parts[1]), get: () => undefined }
        }
        return { exists: false, get: () => undefined }
      },
      delete: async () => { deleted.push(path) },
    }),
    collection: (path: string) => ({
      get: async () => {
        const uid = path.split('/')[1]
        const toks = data.tokens?.[uid] ?? []
        return { docs: toks.map((id) => ({ id })) }
      },
    }),
  } as unknown as Firestore
}

describe('activeTokensFor', () => {
  it('skips users with pushEnabled=false and expands tokens for the rest', async () => {
    const db = fakeDb({
      users: { a: {}, b: { pushEnabled: false }, c: { pushEnabled: true } },
      tokens: { a: ['t_a1', 't_a2'], b: ['t_b'], c: ['t_c'] },
    })
    const targets = await activeTokensFor(db, ['a', 'b', 'c'])
    expect(targets).toEqual([
      { uid: 'a', token: 't_a1' },
      { uid: 'a', token: 't_a2' },
      { uid: 'c', token: 't_c' },
    ])
  })
})

describe('isThreadMuted', () => {
  it('is true only when the read doc marks the thread muted', async () => {
    const db = fakeDb({ mutes: { 'u/conv1': true, 'u/conv2': false } })
    expect(await isThreadMuted(db, 'u', 'conv1')).toBe(true)
    expect(await isThreadMuted(db, 'u', 'conv2')).toBe(false)
    expect(await isThreadMuted(db, 'u', 'conv3')).toBe(false)
  })
})

describe('isMutualFollow', () => {
  it('detects the reverse follow document', async () => {
    const db = fakeDb({ follows: new Set(['target_follower']) })
    expect(await isMutualFollow(db, 'follower', 'target')).toBe(true)
    expect(await isMutualFollow(db, 'nobody', 'target')).toBe(false)
  })
})

describe('pruneDeadTokens', () => {
  it('deletes only the dead token docs', async () => {
    const deleted: string[] = []
    const db = fakeDb({}, deleted)
    await pruneDeadTokens(
      db,
      [{ uid: 'a', token: 't1' }, { uid: 'a', token: 't2' }, { uid: 'b', token: 't3' }],
      ['t2', 't3']
    )
    expect(deleted.sort()).toEqual(['users/a/pushTokens/t2', 'users/b/pushTokens/t3'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app/functions && npx jest src/recipients.test.ts`
Expected: FAIL — `Cannot find module './recipients'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/functions/src/recipients.ts
import { Firestore } from 'firebase-admin/firestore'

export interface PushTarget {
  uid: string
  token: string
}

// uids must already exclude the actor. Skips opted-out users; expands each remaining
// user's device tokens.
export async function activeTokensFor(db: Firestore, uids: string[]): Promise<PushTarget[]> {
  const targets: PushTarget[] = []
  for (const uid of uids) {
    const userSnap = await db.doc(`users/${uid}`).get()
    if (userSnap.get('pushEnabled') === false) continue
    const tokensSnap = await db.collection(`users/${uid}/pushTokens`).get()
    tokensSnap.docs.forEach((d) => targets.push({ uid, token: d.id }))
  }
  return targets
}

export async function isThreadMuted(db: Firestore, uid: string, convId: string): Promise<boolean> {
  const snap = await db.doc(`users/${uid}/chatReads/${convId}`).get()
  return snap.get('muted') === true
}

export async function isMutualFollow(db: Firestore, followerUid: string, targetUid: string): Promise<boolean> {
  const snap = await db.doc(`follows/${targetUid}_${followerUid}`).get()
  return snap.exists
}

export async function pruneDeadTokens(db: Firestore, targets: PushTarget[], deadTokens: string[]): Promise<void> {
  const dead = new Set(deadTokens)
  await Promise.all(
    targets.filter((t) => dead.has(t.token)).map((t) => db.doc(`users/${t.uid}/pushTokens/${t.token}`).delete())
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app/functions && npx jest src/recipients.test.ts`
Expected: PASS (4 suites).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/functions/src/recipients.ts thirdspace-app/functions/src/recipients.test.ts
git commit -m "feat: add recipient resolution and pruning helpers"
```

---

### Task 4: `onNewDirectMessage` trigger

**Files:**
- Create: `thirdspace-app/functions/src/onNewDirectMessage.ts`
- Test: `thirdspace-app/functions/src/onNewDirectMessage.test.ts`
- Modify: `thirdspace-app/functions/src/index.ts` (export it)

**Interfaces:**
- Consumes: `sendPush`, `truncateBody`, `PushMessage` (Task 2); `activeTokensFor`, `isThreadMuted`, `pruneDeadTokens` (Task 3); `firebase-functions/v2/firestore` `onDocumentCreated`; `firebase-admin/firestore` `getFirestore`.
- Produces: `export const onNewDirectMessage` (a v2 Firestore trigger). Also `export async function handleNewDirectMessage(db, cid, message)` — the testable core.

- [ ] **Step 1: Write the failing test** (drives the core; mocks the helpers)

```ts
jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  isThreadMuted: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor, isThreadMuted } from './recipients'
import { handleNewDirectMessage } from './onNewDirectMessage'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({
      get: (f: string) => (path === 'conversations/c1' && f === 'participants' ? ['host', 'guest'] : undefined),
    }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('messages the other participant, skipping the author and muted recipients', async () => {
  ;(isThreadMuted as jest.Mock).mockResolvedValue(false)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'guest', token: 't_guest' }])

  await handleNewDirectMessage(fakeDb, 'c1', { authorUid: 'host', authorName: 'Rooftop', text: 'hi there' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['guest'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_guest', title: 'Rooftop', body: 'hi there', data: { type: 'dm', convId: 'c1' } },
  ])
})

it('sends nothing when the only other participant muted the thread', async () => {
  ;(isThreadMuted as jest.Mock).mockResolvedValue(true)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([])

  await handleNewDirectMessage(fakeDb, 'c1', { authorUid: 'host', authorName: 'Rooftop', text: 'hi' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, [])
  expect(sendPush).toHaveBeenCalledWith([])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app/functions && npx jest src/onNewDirectMessage.test.ts`
Expected: FAIL — `Cannot find module './onNewDirectMessage'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/functions/src/onNewDirectMessage.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, isThreadMuted, pruneDeadTokens } from './recipients'

interface DirectMessageDoc {
  authorUid: string
  authorName: string
  text: string
}

export async function handleNewDirectMessage(db: Firestore, cid: string, message: DirectMessageDoc): Promise<void> {
  const convSnap = await db.doc(`conversations/${cid}`).get()
  const participants = (convSnap.get('participants') as string[] | undefined) ?? []

  const others = participants.filter((uid) => uid !== message.authorUid)
  const muteFlags = await Promise.all(others.map((uid) => isThreadMuted(db, uid, cid)))
  const unmuted = others.filter((_, i) => !muteFlags[i])

  const targets = await activeTokensFor(db, unmuted)
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title: message.authorName || 'New message',
    body: truncateBody(message.text || ''),
    data: { type: 'dm', convId: cid },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewDirectMessage = onDocumentCreated('conversations/{cid}/messages/{mid}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewDirectMessage(getFirestore(), event.params.cid, snap.data() as DirectMessageDoc)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app/functions && npx jest src/onNewDirectMessage.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Export it from `index.ts`**

Replace the commented `onNewDirectMessage` line in `functions/src/index.ts` with a real export:

```ts
export { onNewDirectMessage } from './onNewDirectMessage'
```

- [ ] **Step 6: Build + commit**

Run: `cd thirdspace-app/functions && npm run build`
Expected: no errors.

```bash
git add thirdspace-app/functions/src/onNewDirectMessage.ts thirdspace-app/functions/src/onNewDirectMessage.test.ts thirdspace-app/functions/src/index.ts
git commit -m "feat: push on new direct message"
```

---

### Task 5: `onNewAnnouncement` trigger

**Files:**
- Create: `thirdspace-app/functions/src/onNewAnnouncement.ts`
- Test: `thirdspace-app/functions/src/onNewAnnouncement.test.ts`
- Modify: `thirdspace-app/functions/src/index.ts` (export it)

**Interfaces:**
- Consumes: `sendPush`, `truncateBody`, `PushMessage`; `activeTokensFor`, `pruneDeadTokens`; `onDocumentCreated`; `getFirestore`.
- Produces: `export const onNewAnnouncement`; `export async function handleNewAnnouncement(db, eventId, announcement)`.

- [ ] **Step 1: Write the failing test**

```ts
jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor } from './recipients'
import { handleNewAnnouncement } from './onNewAnnouncement'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({ get: (f: string) => (path === 'events/e1' && f === 'title' ? 'Rooftop Sketching' : undefined) }),
  }),
  collection: (path: string) => ({
    get: async () => ({
      docs: path === 'events/e1/registrations' ? [{ id: 'host' }, { id: 'guest1' }, { id: 'guest2' }] : [],
    }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('fans out to registrations except the author, with the event title', async () => {
  ;(activeTokensFor as jest.Mock).mockResolvedValue([
    { uid: 'guest1', token: 't1' },
    { uid: 'guest2', token: 't2' },
  ])

  await handleNewAnnouncement(fakeDb, 'e1', { authorUid: 'host', authorName: 'Host', text: 'Doors at 6' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['guest1', 'guest2'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't1', title: '📣 Rooftop Sketching', body: 'Doors at 6', data: { type: 'announcement', eventId: 'e1' } },
    { to: 't2', title: '📣 Rooftop Sketching', body: 'Doors at 6', data: { type: 'announcement', eventId: 'e1' } },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app/functions && npx jest src/onNewAnnouncement.test.ts`
Expected: FAIL — `Cannot find module './onNewAnnouncement'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/functions/src/onNewAnnouncement.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, pruneDeadTokens } from './recipients'

interface AnnouncementDoc {
  authorUid: string
  authorName: string
  text: string
}

export async function handleNewAnnouncement(db: Firestore, eventId: string, announcement: AnnouncementDoc): Promise<void> {
  const eventSnap = await db.doc(`events/${eventId}`).get()
  const title = (eventSnap.get('title') as string | undefined) ?? 'Event'

  const regsSnap = await db.collection(`events/${eventId}/registrations`).get()
  const uids = regsSnap.docs.map((d) => d.id).filter((uid) => uid !== announcement.authorUid)

  const targets = await activeTokensFor(db, uids)
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title: `📣 ${title}`,
    body: truncateBody(announcement.text || ''),
    data: { type: 'announcement', eventId },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewAnnouncement = onDocumentCreated('events/{eventId}/announcements/{announcementId}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewAnnouncement(getFirestore(), event.params.eventId, snap.data() as AnnouncementDoc)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app/functions && npx jest src/onNewAnnouncement.test.ts`
Expected: PASS.

- [ ] **Step 5: Export from `index.ts`**

Add:

```ts
export { onNewAnnouncement } from './onNewAnnouncement'
```

- [ ] **Step 6: Build + commit**

Run: `cd thirdspace-app/functions && npm run build`
Expected: no errors.

```bash
git add thirdspace-app/functions/src/onNewAnnouncement.ts thirdspace-app/functions/src/onNewAnnouncement.test.ts thirdspace-app/functions/src/index.ts
git commit -m "feat: push on new venue announcement"
```

---

### Task 6: `onNewFollow` trigger

**Files:**
- Create: `thirdspace-app/functions/src/onNewFollow.ts`
- Test: `thirdspace-app/functions/src/onNewFollow.test.ts`
- Modify: `thirdspace-app/functions/src/index.ts` (export it)

**Interfaces:**
- Consumes: `sendPush`, `truncateBody`, `PushMessage`; `activeTokensFor`, `isMutualFollow`, `pruneDeadTokens`; `onDocumentCreated`; `getFirestore`.
- Produces: `export const onNewFollow`; `export async function handleNewFollow(db, follow)` where `follow = { follower, target }`.

- [ ] **Step 1: Write the failing test**

```ts
jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  isMutualFollow: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor, isMutualFollow } from './recipients'
import { handleNewFollow } from './onNewFollow'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({ get: (f: string) => (path === 'profiles/maya' && f === 'displayName' ? 'Maya' : undefined) }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('notifies the target that a new follower started following them', async () => {
  ;(isMutualFollow as jest.Mock).mockResolvedValue(false)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'sam', token: 't_sam' }])

  await handleNewFollow(fakeDb, { follower: 'maya', target: 'sam' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['sam'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_sam', title: 'New follower', body: 'Maya started following you', data: { type: 'follow', uid: 'maya' } },
  ])
})

it('uses connection copy when the follow is mutual', async () => {
  ;(isMutualFollow as jest.Mock).mockResolvedValue(true)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'sam', token: 't_sam' }])

  await handleNewFollow(fakeDb, { follower: 'maya', target: 'sam' })

  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_sam', title: 'New connection', body: "You're now connected with Maya", data: { type: 'follow', uid: 'maya' } },
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app/functions && npx jest src/onNewFollow.test.ts`
Expected: FAIL — `Cannot find module './onNewFollow'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/functions/src/onNewFollow.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, isMutualFollow, pruneDeadTokens } from './recipients'

interface FollowDoc {
  follower: string
  target: string
}

export async function handleNewFollow(db: Firestore, follow: FollowDoc): Promise<void> {
  const profSnap = await db.doc(`profiles/${follow.follower}`).get()
  const name = (profSnap.get('displayName') as string | undefined) ?? 'Someone'

  const mutual = await isMutualFollow(db, follow.follower, follow.target)
  const title = mutual ? 'New connection' : 'New follower'
  const body = mutual ? `You're now connected with ${name}` : `${name} started following you`

  const targets = await activeTokensFor(db, [follow.target])
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title,
    body: truncateBody(body),
    data: { type: 'follow', uid: follow.follower },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewFollow = onDocumentCreated('follows/{followId}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewFollow(getFirestore(), snap.data() as FollowDoc)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app/functions && npx jest src/onNewFollow.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Export from `index.ts`**

Add:

```ts
export { onNewFollow } from './onNewFollow'
```

- [ ] **Step 6: Build + full functions test run + commit**

Run: `cd thirdspace-app/functions && npm run build && npm test`
Expected: no build errors; all functions suites green.

```bash
git add thirdspace-app/functions/src/onNewFollow.ts thirdspace-app/functions/src/onNewFollow.test.ts thirdspace-app/functions/src/index.ts
git commit -m "feat: push on new follow and mutual connection"
```

---

### Task 7: Firestore security rules for `pushTokens`

**Files:**
- Modify: `thirdspace-app/firestore.rules` (add a `pushTokens` sub-match under `users/{uid}`)

**Interfaces:**
- Consumes: existing `signedIn()` helper.
- Produces: owner-only read/write on `users/{uid}/pushTokens/{token}`.

- [ ] **Step 1: Add the rules block**

In `thirdspace-app/firestore.rules`, the existing `match /users/{uid} { ... }` block is:

```
    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }
```

Replace it with a version that adds the sub-collection match (the `pushEnabled` field is already covered by the parent `write` rule, so only `pushTokens` needs a new block):

```
    match /users/{uid} {
      allow read, write: if signedIn() && request.auth.uid == uid;

      match /pushTokens/{token} {
        allow read, write: if signedIn() && request.auth.uid == uid;
      }
    }
```

- [ ] **Step 2: Sanity-check the braces**

The Firebase CLI is not required for this check. Confirm the new `pushTokens` block sits **inside** `match /users/{uid} { … }` and every brace is balanced:

Run: `cd thirdspace-app && node -e "const s=require('fs').readFileSync('firestore.rules','utf8');const o=(s.match(/{/g)||[]).length,c=(s.match(/}/g)||[]).length;console.log(o===c?'BALANCED':'UNBALANCED',o,c)"`
Expected: `BALANCED`.

- [ ] **Step 3: Commit**

```bash
git add thirdspace-app/firestore.rules
git commit -m "feat: add security rules for user push tokens"
```

- [ ] **Step 4: Manual deploy (operator, not automated)**

The person with Firebase access runs, from `thirdspace-app/`:

```bash
firebase deploy --only firestore:rules
```

(Deploys the whole rules file to project `the-third-space-626e8`. Until it runs, token writes are denied and no device registers.)

---

### Task 8: Client `services/pushTokens.ts`

**Files:**
- Create: `thirdspace-app/services/pushTokens.ts`
- Test: `thirdspace-app/__tests__/services/pushTokens.test.ts`

**Interfaces:**
- Consumes: `db` from `firebase/config`; Firestore `doc/setDoc/deleteDoc/getDoc/serverTimestamp`.
- Produces:
  - `upsertPushToken(uid: string, token: string, platform: 'ios' | 'android'): Promise<void>`
  - `deletePushToken(uid: string, token: string): Promise<void>`
  - `setPushEnabled(uid: string, enabled: boolean): Promise<void>`
  - `getPushEnabled(uid: string): Promise<boolean>` — absent field → `true`.

- [ ] **Step 1: Write the failing test**

```ts
import { setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { upsertPushToken, deletePushToken, setPushEnabled, getPushEnabled } from '../../services/pushTokens'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  serverTimestamp: () => '__ts',
}))

beforeEach(() => jest.clearAllMocks())

it('upserts a token doc keyed by the token string', async () => {
  await upsertPushToken('u1', 'tok1', 'ios')
  expect(setDoc).toHaveBeenCalledWith(
    { path: 'users/u1/pushTokens/tok1' },
    { token: 'tok1', platform: 'ios', updatedAt: '__ts' },
    { merge: true }
  )
})

it('deletes a token doc', async () => {
  await deletePushToken('u1', 'tok1')
  expect(deleteDoc).toHaveBeenCalledWith({ path: 'users/u1/pushTokens/tok1' })
})

it('writes the global pushEnabled flag with merge', async () => {
  await setPushEnabled('u1', false)
  expect(setDoc).toHaveBeenCalledWith({ path: 'users/u1' }, { pushEnabled: false }, { merge: true })
})

it('treats an absent pushEnabled field as enabled', async () => {
  ;(getDoc as jest.Mock).mockResolvedValue({ data: () => ({}) })
  expect(await getPushEnabled('u1')).toBe(true)
})

it('returns false only when pushEnabled is explicitly false', async () => {
  ;(getDoc as jest.Mock).mockResolvedValue({ data: () => ({ pushEnabled: false }) })
  expect(await getPushEnabled('u1')).toBe(false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/services/pushTokens.test.ts`
Expected: FAIL — `Cannot find module '../../services/pushTokens'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/services/pushTokens.ts
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'

export async function upsertPushToken(uid: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'pushTokens', token), { token, platform, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deletePushToken(uid: string, token: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'pushTokens', token))
}

export async function setPushEnabled(uid: string, enabled: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid), { pushEnabled: enabled }, { merge: true })
}

export async function getPushEnabled(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.data()?.pushEnabled !== false
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/services/pushTokens.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/services/pushTokens.ts thirdspace-app/__tests__/services/pushTokens.test.ts
git commit -m "feat: add push token client service"
```

---

### Task 9: `utils/pushRouting.ts` deep-link mapper

**Files:**
- Create: `thirdspace-app/utils/pushRouting.ts`
- Test: `thirdspace-app/__tests__/utils/pushRouting.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `routeForNotification(data: NotificationData): RouteObject | null` where `NotificationData` and `RouteObject` are defined below.

- [ ] **Step 1: Write the failing test**

```ts
import { routeForNotification } from '../../utils/pushRouting'

describe('routeForNotification', () => {
  it('routes a dm to the chat screen', () => {
    expect(routeForNotification({ type: 'dm', convId: 'c1' })).toEqual({
      pathname: '/(app)/chat/[id]', params: { id: 'c1' },
    })
  })
  it('routes an announcement to the event screen', () => {
    expect(routeForNotification({ type: 'announcement', eventId: 'e1' })).toEqual({
      pathname: '/(app)/event/[id]', params: { id: 'e1' },
    })
  })
  it('routes a follow to the member screen', () => {
    expect(routeForNotification({ type: 'follow', uid: 'u1' })).toEqual({
      pathname: '/(app)/member/[uid]', params: { uid: 'u1' },
    })
  })
  it('returns null for an unknown type', () => {
    expect(routeForNotification({ type: 'mystery' })).toBeNull()
  })
  it('returns null when the required id is missing', () => {
    expect(routeForNotification({ type: 'dm' })).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/utils/pushRouting.test.ts`
Expected: FAIL — `Cannot find module '../../utils/pushRouting'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/utils/pushRouting.ts

export interface NotificationData {
  type?: string
  convId?: string
  eventId?: string
  uid?: string
}

export interface RouteObject {
  pathname: string
  params: Record<string, string>
}

export function routeForNotification(data: NotificationData): RouteObject | null {
  switch (data.type) {
    case 'dm':
      return data.convId ? { pathname: '/(app)/chat/[id]', params: { id: data.convId } } : null
    case 'announcement':
      return data.eventId ? { pathname: '/(app)/event/[id]', params: { id: data.eventId } } : null
    case 'follow':
      return data.uid ? { pathname: '/(app)/member/[uid]', params: { uid: data.uid } } : null
    default:
      return null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/utils/pushRouting.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/utils/pushRouting.ts thirdspace-app/__tests__/utils/pushRouting.test.ts
git commit -m "feat: add push notification deep-link mapper"
```

---

### Task 10: `usePushRegistration` hook + mount in the authed layout

**Files:**
- Install: `expo-notifications`, `expo-device`
- Create: `thirdspace-app/hooks/usePushRegistration.ts`
- Modify: `thirdspace-app/app/(app)/_layout.tsx` (mount a `PushRegistration` gate)

**Interfaces:**
- Consumes: `useAuth` (`user.uid`); `upsertPushToken`, `deletePushToken` (Task 8); `routeForNotification` (Task 9); `expo-notifications`, `expo-device`, `expo-constants`, `expo-router`.
- Produces: `usePushRegistration(): void` and a default-exported `PushRegistration` gate component that renders `null`.

- [ ] **Step 1: Install the native modules**

Run: `cd thirdspace-app && npx expo install expo-notifications expo-device`
Expected: both added to `package.json` at SDK-54-compatible versions.

- [ ] **Step 2: Write the hook + gate**

```tsx
// thirdspace-app/hooks/usePushRegistration.ts
import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useAuth } from './useAuth'
import { upsertPushToken, deletePushToken } from '../services/pushTokens'
import { routeForNotification, NotificationData } from '../utils/pushRouting'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function usePushRegistration(): void {
  const { user } = useAuth()
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const uidRef = useRef<string | null>(null)

  // Capture a token on sign-in (physical devices with granted permission only).
  useEffect(() => {
    let cancelled = false
    async function register(): Promise<void> {
      if (!user || !Device.isDevice) return
      const current = await Notifications.getPermissionsAsync()
      let status = current.status
      if (status === 'undetermined') {
        status = (await Notifications.requestPermissionsAsync()).status
      }
      if (status !== 'granted') return

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data
      if (cancelled) return
      tokenRef.current = token
      uidRef.current = user.uid
      await upsertPushToken(user.uid, token, Platform.OS === 'ios' ? 'ios' : 'android')
    }
    register()
    return () => {
      cancelled = true
    }
  }, [user])

  // Remove this device's token on sign-out so a shared device stops receiving pushes.
  useEffect(() => {
    if (user) return
    const uid = uidRef.current
    const token = tokenRef.current
    if (uid && token) {
      deletePushToken(uid, token)
      uidRef.current = null
      tokenRef.current = null
    }
  }, [user])

  // Deep-link when a notification is tapped.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData
      const route = routeForNotification(data)
      if (route) router.push(route as never)
    })
    return () => sub.remove()
  }, [router])
}

export default function PushRegistration(): null {
  usePushRegistration()
  return null
}
```

- [ ] **Step 3: Mount the gate in `app/(app)/_layout.tsx`**

Change the file to:

```tsx
import { Stack } from 'expo-router'
import PushRegistration from '../../hooks/usePushRegistration'

export default function AppLayout() {
  return (
    <>
      <PushRegistration />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="message-requests" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" />
      </Stack>
    </>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke (record result)**

On a **physical device** dev build: sign in → accept the OS permission prompt → confirm (in the Firebase console) a doc appears under `users/{uid}/pushTokens`. Sign out → confirm that token doc is removed. (Simulators never register — that's expected.)

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/hooks/usePushRegistration.ts "thirdspace-app/app/(app)/_layout.tsx" thirdspace-app/package.json thirdspace-app/package-lock.json
git commit -m "feat: register expo push token and deep-link on tap"
```

---

### Task 11: Global toggle — `settings.tsx` + entry points

**Files:**
- Create: `thirdspace-app/app/(app)/settings.tsx`
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx` (add a Settings row)
- Modify: `thirdspace-app/app/(app)/(hoster)/venue.tsx` (add a Settings row)

**Interfaces:**
- Consumes: `useAuth` (`user.uid`); `getPushEnabled`, `setPushEnabled` (Task 8); `expo-router` `useRouter`.
- Produces: a settings screen at route `/(app)/settings` with a single "Push notifications" switch. No exported API.

- [ ] **Step 1: Create the settings screen**

```tsx
// thirdspace-app/app/(app)/settings.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { getPushEnabled, setPushEnabled } from '../../services/pushTokens'

export default function Settings() {
  const router = useRouter()
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getPushEnabled(user.uid).then((v) => {
      if (!cancelled) setEnabled(v)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const toggle = async (value: boolean) => {
    setEnabled(value)
    if (user) await setPushEnabled(user.uid, value)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Push notifications</Text>
          <Text style={styles.rowHint}>Messages, announcements, and new connections</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ true: '#C4614A', false: 'rgba(140,123,112,0.4)' }}
        />
      </View>
      <Text style={styles.footnote}>
        If notifications are turned off at the device level, enable them in your phone's Settings first.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  rowHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginTop: 3 },
  footnote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginHorizontal: 24, marginTop: 12, lineHeight: 18 },
})
```

- [ ] **Step 2: Add a Settings entry to the attender Profile screen**

Open `thirdspace-app/app/(app)/(attender)/profile.tsx`. It already imports `useRouter` (used for other navigation) and renders a sign-out control. Immediately **above** the sign-out control, add a Settings row:

```tsx
<TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/(app)/settings')}>
  <Text style={styles.settingsText}>Settings</Text>
  <Text style={styles.settingsChevron}>›</Text>
</TouchableOpacity>
```

And add these entries to that file's `StyleSheet.create({...})`:

```ts
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', marginBottom: 12 },
  settingsText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  settingsChevron: { fontFamily: 'DMSans_400Regular', fontSize: 20, color: '#8C7B70' },
```

If the file does not already have `useRouter`, add `const router = useRouter()` inside the component and `import { useRouter } from 'expo-router'` at the top.

- [ ] **Step 3: Add a Settings entry to the hoster Venue screen**

Open `thirdspace-app/app/(app)/(hoster)/venue.tsx` and add the same row near the top-level actions of the screen (e.g. under the venue header), reusing the identical snippet and styles from Step 2:

```tsx
<TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/(app)/settings')}>
  <Text style={styles.settingsText}>Settings</Text>
  <Text style={styles.settingsChevron}>›</Text>
</TouchableOpacity>
```

Add the same three `settingsRow` / `settingsText` / `settingsChevron` style entries to that file's `StyleSheet.create({...})`, and ensure `useRouter`/`TouchableOpacity` are imported (add them if missing).

- [ ] **Step 4: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke (record result)**

As an attender: Profile → Settings → toggle "Push notifications" off, back out and reopen → it stays off (persisted to `users/{uid}.pushEnabled`). As a hoster: Venue → Settings shows the same screen.

- [ ] **Step 6: Commit**

```bash
git add "thirdspace-app/app/(app)/settings.tsx" "thirdspace-app/app/(app)/(attender)/profile.tsx" "thirdspace-app/app/(app)/(hoster)/venue.tsx"
git commit -m "feat: add settings screen with global push toggle"
```

---

## Final verification

- [ ] Functions suite: `cd thirdspace-app/functions && npm run build && npm test` → build clean, all suites green.
- [ ] App suite: `cd thirdspace-app && npx jest` → all suites green (includes the new `pushTokens` and `pushRouting` tests).
- [ ] App typecheck: `cd thirdspace-app && npx tsc --noEmit` → clean.
- [ ] Operator steps (not automated): ensure the Firebase project is on **Blaze**; `firebase deploy --only firestore:rules`; `firebase deploy --only functions`; build a dev/production client (EAS or local) — push does not work in Expo Go or on simulators.
- [ ] Two-device smoke: with the app backgrounded, (a) a DM to account B pushes to B and taps into the chat; (b) a host announcement to a registered B pushes and taps into the event; (c) A following B pushes to B and taps into A's member profile; (d) toggling B's push off, and muting the DM thread, each suppress the expected push.
- [ ] Update project memory: mark push-notifications (Phase 3 sub-project 1) code-complete; note Blaze + rules deploy + functions deploy + 2-device smoke as the remaining ops steps.
```
