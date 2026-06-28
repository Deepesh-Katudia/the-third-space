# Chat & Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three chat screens live over Firestore — event group chats, direct messages, and the message-request gate — with real unread counts and mute.

**Architecture:** Three new collections (`eventChats/{eventId}`, `conversations/{convId}`, `users/{uid}/chatReads/{threadId}`), each driven by `onSnapshot`. A thin `services/chat.ts` wraps Firestore; a pure `utils/chat.ts` holds all derivable logic (unread math, thread merge, request partition) and is fully unit-tested; three hooks compose them; four screens consume the hooks. One `firestore.rules` change gates membership by reusing the existing registration/owner checks.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript 5.7, expo-router v6, Firebase v11 (Firestore), Jest + @testing-library/react-native.

## Global Constraints

- **Source spec:** `docs/superpowers/specs/2026-06-28-chat-messaging-design.md`. Every task inherits it.
- **No new dependencies. No new composite indexes** (`array-contains` queries are client-sorted, mirroring `subscribeVenueEvents`).
- **`firestore.rules` change requires a manual deploy** (`firebase deploy --only firestore:rules`) before the live screens work against production. The emulator is not used (no Java/CLI assumed); rules are verified by review.
- **convId is deterministic:** `dmConversationId(a,b) = [a,b].sort().join('_')`. Firebase Auth UIDs are alphanumeric (no `_`), so `convId.split('_')` recovers the pair.
- **Denormalize identity onto docs** (matches the registrations pattern): every message carries `authorUid/authorName/authorPhotoURL`; every conversation carries `names`/`photos` maps so list rows render without a profile join.
- **Palette (verbatim):** background `#FBF7F2`, dark `#2C1810`, primary `#C4614A`, sage `#7A8C6E`, muted text `#8C7B70`, warm border `rgba(242,197,160,0.5)`.
- **Dynamic navigation:** always object-form `router.push({ pathname: '/(app)/chat/[id]', params: { id, kind } })` — never template-string hrefs.
- **Fonts:** only `DMSerifDisplay_400Regular`, `DMSerifDisplay_400Regular_Italic`, `DMSans_300Light`, `DMSans_400Regular`, `DMSans_500Medium` are loaded (no DM Sans bold).
- **Avatars** fall back to initials via `utils/avatar` (`avatarColor`/`initials`) when no photo.
- **Test pattern:** construct plain objects; for `Timestamp` fields use `{ toMillis, toDate } as unknown as Timestamp`. Mock `../../services/chat` (and `../../services/events`) for hook tests; mock `../../hooks/useAuth` where a hook reads it. No emulator.
- Run `npx tsc --noEmit` clean and keep all existing tests green before each commit. All commands run from `thirdspace-app/`.

---

## File Structure

**Create:**
- `thirdspace-app/utils/chat.ts` — pure helpers (ids, unread, merge, partition, relative time)
- `thirdspace-app/services/chat.ts` — Firestore wrappers (group, DM, lists, read-state)
- `thirdspace-app/hooks/useThreadMessages.ts` — one thread's messages
- `thirdspace-app/hooks/useChatList.ts` — merged group + DM list
- `thirdspace-app/hooks/useMessageRequests.ts` — incoming pending requests
- Tests: `__tests__/utils/chat.test.ts`, `__tests__/hooks/useThreadMessages.test.tsx`, `__tests__/hooks/useChatList.test.tsx`, `__tests__/hooks/useMessageRequests.test.tsx`

**Modify:**
- `thirdspace-app/types/models.ts` — add chat domain types
- `thirdspace-app/firestore.rules` — chat collection rules
- `thirdspace-app/app/(app)/(attender)/chats.tsx` — live list
- `thirdspace-app/app/(app)/chat/[id].tsx` — live thread (group + dm)
- `thirdspace-app/app/(app)/message-requests.tsx` — live requests
- `thirdspace-app/app/(app)/member/[uid].tsx` — "Message" opens the DM thread

---

## Task 1: Chat domain types

**Files:**
- Modify: `thirdspace-app/types/models.ts`
- Test: tsc only

**Interfaces:**
- Produces: `Message`, `EventChatMeta`, `Conversation`, `ChatThread`, `ChatRead` (consumed by every later task).

- [ ] **Step 1: Append the chat types to `types/models.ts`** (after the existing `CreateProfileInput`):

```typescript
// ── Chat & Messaging (sub-project C) ──────────────────────────────────────
// Messages denormalize their author; createdAt is null for the brief window
// before serverTimestamp resolves in the local snapshot.
export interface Message {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL: string | null
  text: string
  createdAt: Timestamp | null
}

export interface EventChatMeta {
  lastMessageText: string
  lastMessageAt: Timestamp | null
  lastMessageAuthor: string
  messageCount: number
}

export interface Conversation {
  id: string
  participants: string[]
  names: Record<string, string>
  photos: Record<string, string | null>
  status: 'pending' | 'open'
  requestedBy: string
  lastMessageText: string
  lastMessageAt: Timestamp | null
  lastMessageAuthor: string
  messageCount: number
}

// Unified row for the chat list (group + dm).
export interface ChatThread {
  id: string
  kind: 'group' | 'dm'
  name: string
  photoURL: string | null
  lastMessageText: string
  lastMessageAt: Timestamp | null
  unread: number
  muted: boolean
}

export interface ChatRead {
  readCount: number
  muted: boolean
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add types/models.ts
git commit -m "feat: add chat domain types"
```

---

## Task 2: `utils/chat.ts` pure helpers

**Files:**
- Create: `thirdspace-app/utils/chat.ts`
- Test: `thirdspace-app/__tests__/utils/chat.test.ts`

**Interfaces:**
- Consumes: `Message`, `Conversation`, `ChatThread`, `EventChatMeta`, `ChatRead` (Task 1).
- Produces:
  - `dmConversationId(a: string, b: string): string`
  - `computeUnread(messageCount: number, readCount: number, muted: boolean): number`
  - `shouldShowAuthor(messages: Message[], index: number): boolean`
  - `sortThreadsByRecency(threads: ChatThread[]): ChatThread[]`
  - `formatRelativeTime(date: Date | null, now?: Date): string`
  - `interface GroupChatInput { eventId: string; title: string; meta: EventChatMeta | null }`
  - `type ReadMap = Record<string, ChatRead>`
  - `buildChatThreads(groups: GroupChatInput[], conversations: Conversation[], reads: ReadMap, myUid: string): ChatThread[]`
  - `selectIncomingRequests(conversations: Conversation[], myUid: string): Conversation[]`

- [ ] **Step 1: Write the failing test** `__tests__/utils/chat.test.ts`

```typescript
import { Timestamp } from 'firebase/firestore'
import { Conversation, EventChatMeta, Message } from '../../types/models'
import {
  dmConversationId,
  computeUnread,
  shouldShowAuthor,
  sortThreadsByRecency,
  formatRelativeTime,
  buildChatThreads,
  selectIncomingRequests,
  GroupChatInput,
  ReadMap,
} from '../../utils/chat'

function tsAt(ms: number): Timestamp {
  return { toMillis: () => ms, toDate: () => new Date(ms) } as unknown as Timestamp
}
function msg(over: Partial<Message> & { authorUid: string }): Message {
  return { id: over.id ?? 'm', authorUid: over.authorUid, authorName: over.authorName ?? 'A', authorPhotoURL: null, text: over.text ?? 'hi', createdAt: null }
}

describe('dmConversationId', () => {
  it('is order-independent', () => {
    expect(dmConversationId('b', 'a')).toBe('a_b')
    expect(dmConversationId('a', 'b')).toBe('a_b')
  })
})

describe('computeUnread', () => {
  it('is the positive difference, zero when muted or over-read', () => {
    expect(computeUnread(5, 2, false)).toBe(3)
    expect(computeUnread(5, 5, false)).toBe(0)
    expect(computeUnread(2, 5, false)).toBe(0)
    expect(computeUnread(5, 0, true)).toBe(0)
  })
})

describe('shouldShowAuthor', () => {
  it('shows on the first message and at author boundaries', () => {
    const list = [msg({ authorUid: 'x' }), msg({ authorUid: 'x' }), msg({ authorUid: 'y' })]
    expect(shouldShowAuthor(list, 0)).toBe(true)
    expect(shouldShowAuthor(list, 1)).toBe(false)
    expect(shouldShowAuthor(list, 2)).toBe(true)
  })
})

describe('sortThreadsByRecency', () => {
  it('orders newest first and puts null timestamps last', () => {
    const base = { kind: 'group' as const, name: 'n', photoURL: null, lastMessageText: '', unread: 0, muted: false }
    const a = { ...base, id: 'a', lastMessageAt: tsAt(100) }
    const b = { ...base, id: 'b', lastMessageAt: tsAt(300) }
    const c = { ...base, id: 'c', lastMessageAt: null }
    expect(sortThreadsByRecency([a, c, b]).map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('formatRelativeTime', () => {
  const now = new Date(2026, 5, 28, 12, 0, 0)
  it('handles null, now, minutes, and hours', () => {
    expect(formatRelativeTime(null, now)).toBe('')
    expect(formatRelativeTime(new Date(2026, 5, 28, 11, 59, 30), now)).toBe('now')
    expect(formatRelativeTime(new Date(2026, 5, 28, 11, 45, 0), now)).toBe('15m')
    expect(formatRelativeTime(new Date(2026, 5, 28, 9, 0, 0), now)).toBe('3h')
  })
})

describe('buildChatThreads', () => {
  const myUid = 'me'
  const groups: GroupChatInput[] = [
    { eventId: 'e1', title: 'Sketching', meta: { lastMessageText: 'hey', lastMessageAt: tsAt(200), lastMessageAuthor: 'Devon', messageCount: 4 } },
    { eventId: 'e2', title: 'Empty', meta: null },
  ]
  const conversations: Conversation[] = [
    { id: 'me_you', participants: ['me', 'you'], names: { me: 'Me', you: 'Maya' }, photos: { me: null, you: null }, status: 'open', requestedBy: 'you', lastMessageText: 'hi', lastMessageAt: tsAt(500), lastMessageAuthor: 'Maya', messageCount: 3 },
    { id: 'me_zed', participants: ['me', 'zed'], names: { me: 'Me', zed: 'Zed' }, photos: { me: null, zed: null }, status: 'pending', requestedBy: 'zed', lastMessageText: 'wanna meet?', lastMessageAt: tsAt(900), lastMessageAuthor: 'Zed', messageCount: 1 },
  ]
  const reads: ReadMap = { e1: { readCount: 1, muted: false }, me_you: { readCount: 3, muted: false } }

  it('merges group + open/outgoing dm rows, drops incoming-pending, computes unread, sorts', () => {
    const out = buildChatThreads(groups, conversations, reads, myUid)
    // me_zed is incoming-pending (requestedBy !== me) -> excluded
    expect(out.map((t) => t.id)).toEqual(['me_you', 'e1', 'e2'])
    const e1 = out.find((t) => t.id === 'e1')!
    expect(e1.unread).toBe(3) // 4 - 1
    expect(e1.name).toBe('Sketching')
    const dm = out.find((t) => t.id === 'me_you')!
    expect(dm.name).toBe('Maya') // the other participant
    expect(dm.unread).toBe(0) // 3 - 3
  })

  it('includes outgoing-pending dm rows', () => {
    const outgoing: Conversation = { ...conversations[1], id: 'me_out', participants: ['me', 'out'], names: { me: 'Me', out: 'Out' }, photos: { me: null, out: null }, requestedBy: 'me' }
    const out = buildChatThreads([], [outgoing], {}, myUid)
    expect(out.map((t) => t.id)).toEqual(['me_out'])
    expect(out[0].name).toBe('Out')
  })
})

describe('selectIncomingRequests', () => {
  it('keeps only pending conversations the other person started', () => {
    const conversations: Conversation[] = [
      { id: 'a', participants: ['me', 'x'], names: {}, photos: {}, status: 'pending', requestedBy: 'x', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
      { id: 'b', participants: ['me', 'y'], names: {}, photos: {}, status: 'pending', requestedBy: 'me', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
      { id: 'c', participants: ['me', 'z'], names: {}, photos: {}, status: 'open', requestedBy: 'z', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
    ]
    expect(selectIncomingRequests(conversations, 'me').map((c) => c.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/chat.test.ts`
Expected: FAIL — `Cannot find module '../../utils/chat'`.

- [ ] **Step 3: Implement `utils/chat.ts`**

```typescript
import { ChatRead, ChatThread, Conversation, EventChatMeta, Message } from '../types/models'

export function dmConversationId(a: string, b: string): string {
  return [a, b].sort().join('_')
}

export function computeUnread(messageCount: number, readCount: number, muted: boolean): number {
  if (muted) return 0
  return Math.max(0, messageCount - readCount)
}

export function shouldShowAuthor(messages: Message[], index: number): boolean {
  const prev = messages[index - 1]
  return !prev || prev.authorUid !== messages[index].authorUid
}

export function sortThreadsByRecency(threads: ChatThread[]): ChatThread[] {
  return [...threads].sort((a, b) => {
    const at = a.lastMessageAt ? a.lastMessageAt.toMillis() : 0
    const bt = b.lastMessageAt ? b.lastMessageAt.toMillis() : 0
    return bt - at
  })
}

export function formatRelativeTime(date: Date | null, now: Date = new Date()): string {
  if (!date) return ''
  const min = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return date.toLocaleDateString(undefined, { weekday: 'short' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface GroupChatInput {
  eventId: string
  title: string
  meta: EventChatMeta | null
}

export type ReadMap = Record<string, ChatRead>

export function buildChatThreads(
  groups: GroupChatInput[],
  conversations: Conversation[],
  reads: ReadMap,
  myUid: string
): ChatThread[] {
  const groupThreads: ChatThread[] = groups.map((g) => {
    const read = reads[g.eventId]
    const muted = read?.muted ?? false
    return {
      id: g.eventId,
      kind: 'group',
      name: g.title,
      photoURL: null,
      lastMessageText: g.meta?.lastMessageText ?? '',
      lastMessageAt: g.meta?.lastMessageAt ?? null,
      unread: computeUnread(g.meta?.messageCount ?? 0, read?.readCount ?? 0, muted),
      muted,
    }
  })

  const dmThreads: ChatThread[] = conversations
    .filter((c) => c.status === 'open' || (c.status === 'pending' && c.requestedBy === myUid))
    .map((c) => {
      const otherUid = c.participants.find((p) => p !== myUid) ?? myUid
      const read = reads[c.id]
      const muted = read?.muted ?? false
      return {
        id: c.id,
        kind: 'dm',
        name: c.names[otherUid] ?? 'Member',
        photoURL: c.photos[otherUid] ?? null,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unread: computeUnread(c.messageCount, read?.readCount ?? 0, muted),
        muted,
      }
    })

  return sortThreadsByRecency([...groupThreads, ...dmThreads])
}

export function selectIncomingRequests(conversations: Conversation[], myUid: string): Conversation[] {
  return conversations.filter((c) => c.status === 'pending' && c.requestedBy !== myUid)
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/utils/chat.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add utils/chat.ts __tests__/utils/chat.test.ts
git commit -m "feat: add pure chat helpers (ids, unread, thread merge, requests)"
```

---

## Task 3: `services/chat.ts` Firestore wrappers

**Files:**
- Create: `thirdspace-app/services/chat.ts`
- Test: tsc only (Firestore wrappers; exercised via hook mocks in Tasks 5–7)

**Interfaces:**
- Consumes: `dmConversationId` (Task 2); `Conversation`, `Message` (Task 1).
- Produces:
  - `interface MessageAuthor { uid: string; name: string; photoURL: string | null }`
  - `interface ParticipantInfo { uid: string; name: string; photoURL: string | null }`
  - `interface ChatReadEntry { id: string; readCount: number; muted: boolean }`
  - Group: `subscribeEventMessages(eventId, onChange: (m: Message[]) => void, onError: () => void): () => void`; `subscribeEventChatMeta(eventId, onChange: (meta: EventChatMeta | null) => void, onError: () => void): () => void`; `sendEventMessage(eventId, author: MessageAuthor, text): Promise<void>`
  - DM: `subscribeConversation(convId, onChange: (c: Conversation | null) => void, onError: () => void): () => void`; `subscribeConversationMessages(convId, onChange, onError): () => void`; `sendDirectMessage(convId, participants: ParticipantInfo[], author: MessageAuthor, text): Promise<void>`; `acceptRequest(convId): Promise<void>`; `declineRequest(convId): Promise<void>`
  - Lists: `subscribeMyConversations(uid, onChange: (c: Conversation[]) => void, onError: () => void): () => void`
  - Read-state: `subscribeChatReads(uid, onChange: (r: ChatReadEntry[]) => void, onError: () => void): () => void`; `getThreadRead(uid, threadId): Promise<ChatRead | null>`; `markThreadRead(uid, threadId, count): Promise<void>`; `setThreadMuted(uid, threadId, muted): Promise<void>`

- [ ] **Step 1: Implement `services/chat.ts`**

```typescript
import {
  collection, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  DocumentData, QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ChatRead, Conversation, EventChatMeta, Message } from '../types/models'

const MESSAGE_PAGE = 50

export interface MessageAuthor { uid: string; name: string; photoURL: string | null }
export interface ParticipantInfo { uid: string; name: string; photoURL: string | null }
export interface ChatReadEntry { id: string; readCount: number; muted: boolean }

function toMessage(d: QueryDocumentSnapshot<DocumentData>): Message {
  const data = d.data()
  return {
    id: d.id,
    authorUid: (data.authorUid as string) ?? '',
    authorName: (data.authorName as string) ?? 'Member',
    authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
    text: (data.text as string) ?? '',
    createdAt: (data.createdAt as Message['createdAt']) ?? null,
  }
}

// ── Group chats ───────────────────────────────────────────────────────────
export function subscribeEventMessages(
  eventId: string,
  onChange: (messages: Message[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'eventChats', eventId, 'messages'), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toMessage).reverse()), onError)
}

export function subscribeEventChatMeta(
  eventId: string,
  onChange: (meta: EventChatMeta | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'eventChats', eventId),
    (snap) => onChange(snap.exists() ? (snap.data() as EventChatMeta) : null),
    onError
  )
}

export async function sendEventMessage(eventId: string, author: MessageAuthor, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const batch = writeBatch(db)
  const msgRef = doc(collection(db, 'eventChats', eventId, 'messages'))
  batch.set(msgRef, {
    authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
    text: trimmed, createdAt: serverTimestamp(),
  })
  batch.set(
    doc(db, 'eventChats', eventId),
    { lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1) },
    { merge: true }
  )
  await batch.commit()
}

// ── Direct messages ─────────────────────────────────────────────────────────
function toConversation(snap: { id: string; data: () => DocumentData }): Conversation {
  const data = snap.data()
  return {
    id: snap.id,
    participants: (data.participants as string[]) ?? [],
    names: (data.names as Record<string, string>) ?? {},
    photos: (data.photos as Record<string, string | null>) ?? {},
    status: (data.status as 'pending' | 'open') ?? 'pending',
    requestedBy: (data.requestedBy as string) ?? '',
    lastMessageText: (data.lastMessageText as string) ?? '',
    lastMessageAt: (data.lastMessageAt as Conversation['lastMessageAt']) ?? null,
    lastMessageAuthor: (data.lastMessageAuthor as string) ?? '',
    messageCount: (data.messageCount as number) ?? 0,
  }
}

export function subscribeConversation(
  convId: string,
  onChange: (conversation: Conversation | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'conversations', convId),
    (snap) => onChange(snap.exists() ? toConversation(snap) : null),
    onError
  )
}

export function subscribeConversationMessages(
  convId: string,
  onChange: (messages: Message[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toMessage).reverse()), onError)
}

export async function sendDirectMessage(
  convId: string,
  participants: ParticipantInfo[],
  author: MessageAuthor,
  text: string
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const convRef = doc(db, 'conversations', convId)
  const snap = await getDoc(convRef)
  const batch = writeBatch(db)
  const msgRef = doc(collection(db, 'conversations', convId, 'messages'))
  batch.set(msgRef, {
    authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
    text: trimmed, createdAt: serverTimestamp(),
  })
  if (!snap.exists()) {
    const names: Record<string, string> = {}
    const photos: Record<string, string | null> = {}
    participants.forEach((p) => { names[p.uid] = p.name; photos[p.uid] = p.photoURL })
    batch.set(convRef, {
      participants: participants.map((p) => p.uid),
      names, photos,
      status: 'pending', requestedBy: author.uid,
      lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: 1,
    })
  } else {
    batch.update(convRef, {
      lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1),
    })
  }
  await batch.commit()
}

export async function acceptRequest(convId: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', convId), { status: 'open' })
}

export async function declineRequest(convId: string): Promise<void> {
  const msgs = await getDocs(collection(db, 'conversations', convId, 'messages'))
  const batch = writeBatch(db)
  msgs.docs.forEach((d) => batch.delete(d.ref))
  batch.delete(doc(db, 'conversations', convId))
  await batch.commit()
}

export function subscribeMyConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError: () => void
): () => void {
  // array-contains only (no orderBy) -> no composite index; sorting is client-side.
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => toConversation(d))), onError)
}

// ── Read state ───────────────────────────────────────────────────────────────
export function subscribeChatReads(
  uid: string,
  onChange: (reads: ChatReadEntry[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'chatReads'),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, readCount: (d.data().readCount as number) ?? 0, muted: (d.data().muted as boolean) ?? false }))),
    onError
  )
}

export async function getThreadRead(uid: string, threadId: string): Promise<ChatRead | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'chatReads', threadId))
  if (!snap.exists()) return null
  return { readCount: (snap.data().readCount as number) ?? 0, muted: (snap.data().muted as boolean) ?? false }
}

export async function markThreadRead(uid: string, threadId: string, count: number): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'chatReads', threadId), { readCount: count }, { merge: true })
}

export async function setThreadMuted(uid: string, threadId: string, muted: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'chatReads', threadId), { muted }, { merge: true })
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add services/chat.ts
git commit -m "feat: add chat Firestore service (group, dm, lists, read-state)"
```

---

## Task 4: Firestore rules for chat

**Files:**
- Modify: `thirdspace-app/firestore.rules`
- Test: review only — emulator not used; **manual deploy required after merge**.

**Interfaces:** none (security layer).

- [ ] **Step 1: Add chat rules** — inside the existing `match /databases/{database}/documents { … }` block, add the helper `isRegistered` next to `isEventOwner`, and add the three collection blocks before the closing brace:

```
    function isRegistered(eventId) {
      return exists(/databases/$(database)/documents/events/$(eventId)/registrations/$(request.auth.uid));
    }

    function isEventChatMember(eventId) {
      return isRegistered(eventId) || isEventOwner(eventId);
    }

    match /eventChats/{eventId} {
      allow read: if signedIn() && isEventChatMember(eventId);
      allow create, update: if signedIn() && isEventChatMember(eventId);

      match /messages/{messageId} {
        allow read: if signedIn() && isEventChatMember(eventId);
        allow create: if signedIn() && isEventChatMember(eventId)
          && request.resource.data.authorUid == request.auth.uid;
      }
    }

    match /conversations/{convId} {
      allow read, update, delete: if signedIn() && request.auth.uid in resource.data.participants;
      allow create: if signedIn()
        && request.resource.data.participants.size() == 2
        && request.auth.uid in request.resource.data.participants
        && request.resource.data.requestedBy == request.auth.uid
        && request.resource.data.status == 'pending';

      match /messages/{messageId} {
        allow read: if signedIn()
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants;
        allow create: if signedIn()
          && request.resource.data.authorUid == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/conversations/$(convId)).data.participants
          && (
            get(/databases/$(database)/documents/conversations/$(convId)).data.status == 'open' ||
            get(/databases/$(database)/documents/conversations/$(convId)).data.requestedBy == request.auth.uid
          );
      }
    }

    match /users/{uid}/chatReads/{threadId} {
      allow read, write: if signedIn() && request.auth.uid == uid;
    }
```

- [ ] **Step 2: Sanity-check the rules text**

Confirm: braces balance with the rest of the file; `isRegistered`/`isEventChatMember` are defined once; the `users/{uid}/chatReads/{threadId}` match is a sibling of the existing `users/{uid}` match (subcollection matches do not inherit, so this explicit block is required).

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: firestore rules for event chats, conversations, chat reads"
```

> **Deploy note (manual, after merge):** `firebase deploy --only firestore:rules`. Until deployed, live chat reads/writes are denied in production.

---

## Task 5: `useThreadMessages` hook

**Files:**
- Create: `thirdspace-app/hooks/useThreadMessages.ts`
- Test: `thirdspace-app/__tests__/hooks/useThreadMessages.test.tsx`

**Interfaces:**
- Consumes: `subscribeEventMessages`, `subscribeConversationMessages` (Task 3).
- Produces: `useThreadMessages(kind: 'group' | 'dm', id: string): { messages: Message[]; loading: boolean; hasError: boolean }`.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useThreadMessages.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { useThreadMessages } from '../../hooks/useThreadMessages'
import { subscribeEventMessages, subscribeConversationMessages } from '../../services/chat'

jest.mock('../../services/chat', () => ({
  subscribeEventMessages: jest.fn(),
  subscribeConversationMessages: jest.fn(),
}))

describe('useThreadMessages', () => {
  it('subscribes to event messages for a group thread', async () => {
    ;(subscribeEventMessages as jest.Mock).mockImplementation((_id, onChange) => { onChange([{ id: 'm1' }]); return () => {} })
    const { result } = renderHook(() => useThreadMessages('group', 'e1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeEventMessages).toHaveBeenCalledWith('e1', expect.any(Function), expect.any(Function))
    expect(result.current.messages).toEqual([{ id: 'm1' }])
  })

  it('subscribes to conversation messages for a dm thread and surfaces errors', async () => {
    ;(subscribeConversationMessages as jest.Mock).mockImplementation((_id, _onChange, onError) => { onError(); return () => {} })
    const { result } = renderHook(() => useThreadMessages('dm', 'me_you'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeConversationMessages).toHaveBeenCalledWith('me_you', expect.any(Function), expect.any(Function))
    expect(result.current.hasError).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useThreadMessages.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useThreadMessages'`.

- [ ] **Step 3: Implement `hooks/useThreadMessages.ts`**

```typescript
import { useEffect, useState } from 'react'
import { Message } from '../types/models'
import { subscribeEventMessages, subscribeConversationMessages } from '../services/chat'

export function useThreadMessages(kind: 'group' | 'dm', id: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setHasError(false)
    const subscribe = kind === 'group' ? subscribeEventMessages : subscribeConversationMessages
    return subscribe(
      id,
      (list) => { setMessages(list); setLoading(false); setHasError(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [kind, id])

  return { messages, loading, hasError }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useThreadMessages.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add hooks/useThreadMessages.ts __tests__/hooks/useThreadMessages.test.tsx
git commit -m "feat: add useThreadMessages hook"
```

---

## Task 6: `useChatList` hook

**Files:**
- Create: `thirdspace-app/hooks/useChatList.ts`
- Test: `thirdspace-app/__tests__/hooks/useChatList.test.tsx`

**Interfaces:**
- Consumes: `getMyRegisteredEvents` (`services/events`); `subscribeEventChatMeta`, `subscribeMyConversations`, `subscribeChatReads` (Task 3); `buildChatThreads`, `GroupChatInput`, `ReadMap` (Task 2).
- Produces: `useChatList(uid: string | undefined): { threads: ChatThread[]; loading: boolean; hasError: boolean }`.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useChatList.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { useChatList } from '../../hooks/useChatList'
import { getMyRegisteredEvents } from '../../services/events'
import { subscribeEventChatMeta, subscribeMyConversations, subscribeChatReads } from '../../services/chat'

jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))
jest.mock('../../services/chat', () => ({
  subscribeEventChatMeta: jest.fn(() => () => {}),
  subscribeMyConversations: jest.fn(() => () => {}),
  subscribeChatReads: jest.fn(() => () => {}),
}))

beforeEach(() => jest.clearAllMocks())

describe('useChatList', () => {
  it('merges registered-event group rows with open dm rows', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([{ id: 'e1', title: 'Sketching' }])
    ;(subscribeEventChatMeta as jest.Mock).mockImplementation((_id, onChange) => { onChange(null); return () => {} })
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([{ id: 'me_you', participants: ['me', 'you'], names: { you: 'Maya' }, photos: { you: null }, status: 'open', requestedBy: 'you', lastMessageText: 'hi', lastMessageAt: null, lastMessageAuthor: 'Maya', messageCount: 2 }])
      return () => {}
    })
    ;(subscribeChatReads as jest.Mock).mockImplementation((_uid, onChange) => { onChange([]); return () => {} })

    const { result } = renderHook(() => useChatList('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const ids = result.current.threads.map((t) => t.id).sort()
    expect(ids).toEqual(['e1', 'me_you'])
    const dm = result.current.threads.find((t) => t.id === 'me_you')!
    expect(dm.name).toBe('Maya')
    expect(dm.unread).toBe(2)
  })

  it('returns empty and not-loading when uid is undefined', async () => {
    const { result } = renderHook(() => useChatList(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useChatList.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useChatList'`.

- [ ] **Step 3: Implement `hooks/useChatList.ts`**

```typescript
import { useEffect, useMemo, useState } from 'react'
import { ChatThread } from '../types/models'
import { getMyRegisteredEvents } from '../services/events'
import { subscribeEventChatMeta, subscribeMyConversations, subscribeChatReads } from '../services/chat'
import { buildChatThreads, GroupChatInput, ReadMap } from '../utils/chat'

export function useChatList(uid: string | undefined) {
  const [groups, setGroups] = useState<GroupChatInput[]>([])
  const [conversations, setConversations] = useState<Parameters<typeof buildChatThreads>[1]>([])
  const [reads, setReads] = useState<ReadMap>({})
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Registered events -> base group rows + one meta subscription each.
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    let cancelled = false
    let unsubs: Array<() => void> = []
    getMyRegisteredEvents(uid)
      .then((events) => {
        if (cancelled) return
        setGroups(events.map((e) => ({ eventId: e.id, title: e.title, meta: null })))
        unsubs = events.map((e) =>
          subscribeEventChatMeta(
            e.id,
            (meta) => setGroups((prev) => prev.map((g) => (g.eventId === e.id ? { ...g, meta } : g))),
            () => {}
          )
        )
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setHasError(true); setLoading(false) } })
    return () => { cancelled = true; unsubs.forEach((u) => u()) }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeMyConversations(uid, setConversations, () => setHasError(true))
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeChatReads(
      uid,
      (list) => {
        const map: ReadMap = {}
        list.forEach((r) => { map[r.id] = { readCount: r.readCount, muted: r.muted } })
        setReads(map)
      },
      () => {}
    )
  }, [uid])

  const threads: ChatThread[] = useMemo(
    () => (uid ? buildChatThreads(groups, conversations, reads, uid) : []),
    [groups, conversations, reads, uid]
  )

  return { threads, loading, hasError }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useChatList.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add hooks/useChatList.ts __tests__/hooks/useChatList.test.tsx
git commit -m "feat: add useChatList hook merging group and dm threads"
```

---

## Task 7: `useMessageRequests` hook

**Files:**
- Create: `thirdspace-app/hooks/useMessageRequests.ts`
- Test: `thirdspace-app/__tests__/hooks/useMessageRequests.test.tsx`

**Interfaces:**
- Consumes: `subscribeMyConversations` (Task 3); `selectIncomingRequests` (Task 2).
- Produces: `useMessageRequests(uid: string | undefined): { requests: Conversation[]; loading: boolean; hasError: boolean }`.

- [ ] **Step 1: Write the failing test** `__tests__/hooks/useMessageRequests.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react-native'
import { useMessageRequests } from '../../hooks/useMessageRequests'
import { subscribeMyConversations } from '../../services/chat'

jest.mock('../../services/chat', () => ({ subscribeMyConversations: jest.fn() }))

describe('useMessageRequests', () => {
  it('keeps only pending conversations started by someone else', async () => {
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([
        { id: 'a', participants: ['me', 'x'], status: 'pending', requestedBy: 'x' },
        { id: 'b', participants: ['me', 'y'], status: 'pending', requestedBy: 'me' },
        { id: 'c', participants: ['me', 'z'], status: 'open', requestedBy: 'z' },
      ])
      return () => {}
    })
    const { result } = renderHook(() => useMessageRequests('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.requests.map((r) => r.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useMessageRequests.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useMessageRequests'`.

- [ ] **Step 3: Implement `hooks/useMessageRequests.ts`**

```typescript
import { useEffect, useMemo, useState } from 'react'
import { Conversation } from '../types/models'
import { subscribeMyConversations } from '../services/chat'
import { selectIncomingRequests } from '../utils/chat'

export function useMessageRequests(uid: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    setHasError(false)
    return subscribeMyConversations(
      uid,
      (list) => { setConversations(list); setLoading(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [uid])

  const requests = useMemo(() => (uid ? selectIncomingRequests(conversations, uid) : []), [conversations, uid])

  return { requests, loading, hasError }
}
```

- [ ] **Step 4: Run test + tsc**

Run: `npx jest __tests__/hooks/useMessageRequests.test.tsx && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add hooks/useMessageRequests.ts __tests__/hooks/useMessageRequests.test.tsx
git commit -m "feat: add useMessageRequests hook"
```

---

## Task 8: Chats list screen — live

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/chats.tsx`
- Test: tsc + full jest + manual

**Interfaces:**
- Consumes: `useAuth` (existing), `useChatList` (Task 6), `useMessageRequests` (Task 7), `formatRelativeTime` (Task 2), `ChatRow`/`ChatSummary`/`EmptyState`/`LoadingView` (existing).

- [ ] **Step 1: Replace `app/(app)/(attender)/chats.tsx`** (removes `MOCK_CHATS`; the `direct` filter key becomes `dm` to match `ChatThread.kind`):

```tsx
import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatRow, ChatSummary } from '../../../components/ChatRow'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { useAuth } from '../../../hooks/useAuth'
import { useChatList } from '../../../hooks/useChatList'
import { useMessageRequests } from '../../../hooks/useMessageRequests'
import { formatRelativeTime } from '../../../utils/chat'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'group', label: 'Event groups' },
  { key: 'dm', label: 'Direct' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

export default function Chats() {
  const router = useRouter()
  const { user } = useAuth()
  const { threads, loading } = useChatList(user?.uid)
  const { requests } = useMessageRequests(user?.uid)
  const [filter, setFilter] = useState<FilterKey>('all')

  const visible = useMemo(
    () => (filter === 'all' ? threads : threads.filter((t) => t.kind === filter)),
    [filter, threads]
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        {requests.length > 0 ? (
          <TouchableOpacity onPress={() => router.push('/(app)/message-requests')} hitSlop={8}>
            <Text style={styles.requestsLink}>Requests · {requests.length}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterPill, active && styles.filterPillActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {visible.length === 0 ? (
            <EmptyState emoji="◈" title="No chats here" body="Register for an event to join its group chat." />
          ) : (
            visible.map((t) => {
              const summary: ChatSummary = {
                id: t.id,
                name: t.name,
                type: t.kind === 'group' ? 'group' : 'direct',
                lastMessage: t.lastMessageText || 'No messages yet',
                timestamp: formatRelativeTime(t.lastMessageAt ? t.lastMessageAt.toDate() : null),
                unread: t.unread,
                muted: t.muted,
              }
              return (
                <ChatRow
                  key={t.id}
                  chat={summary}
                  onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: t.id, kind: t.kind, name: t.name } })}
                />
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, marginBottom: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5 },
  requestsLink: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#C4614A' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 4 },
  filterPill: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  filterPillActive: { backgroundColor: '#2C1810', borderColor: '#2C1810' },
  filterText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  filterTextActive: { color: 'white' },
  list: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 },
})
```

- [ ] **Step 2: Verify build + tests**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/(attender)/chats.tsx"
git commit -m "feat: live chats list from group + dm threads"
```

---

## Task 9: Chat thread screen — live (group + dm)

**Files:**
- Modify: `thirdspace-app/app/(app)/chat/[id].tsx`
- Test: tsc + manual

**Interfaces:**
- Consumes: `useAuth`, `useProfile` (existing); `useThreadMessages` (Task 5); `subscribeEventChatMeta`, `subscribeConversation`, `sendEventMessage`, `sendDirectMessage`, `acceptRequest`, `markThreadRead`, `setThreadMuted`, `getThreadRead`, `MessageAuthor`, `ParticipantInfo` (Task 3); `shouldShowAuthor` (Task 2); `ChatBubble`/`AttendeeAvatarStack`/`Banner` (existing); `initials` (existing).

- [ ] **Step 1: Replace `app/(app)/chat/[id].tsx`** (removes all `MOCK_*`; `id` + `kind` + `name` come from route params):

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatBubble } from '../../../components/ChatBubble'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { Banner } from '../../../components/Banner'
import { initials } from '../../../utils/avatar'
import { shouldShowAuthor, dmConversationId } from '../../../utils/chat'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useThreadMessages } from '../../../hooks/useThreadMessages'
import {
  subscribeEventChatMeta, subscribeConversation, sendEventMessage, sendDirectMessage,
  acceptRequest, markThreadRead, setThreadMuted, getThreadRead,
  MessageAuthor, ParticipantInfo,
} from '../../../services/chat'
import { Conversation } from '../../../types/models'

function clockTime(date: Date | null): string {
  if (!date) return 'now'
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; name?: string }>()
  const id = params.id
  const kind: 'group' | 'dm' = params.kind === 'dm' ? 'dm' : 'group'
  const router = useRouter()
  const { user } = useAuth()
  const myUid = user?.uid ?? ''
  const { profile } = useProfile(myUid || undefined)

  const otherUid = kind === 'dm' ? id.split('_').find((p) => p !== myUid) ?? '' : ''
  const { profile: otherProfile } = useProfile(kind === 'dm' ? otherUid : undefined)

  const { messages, loading } = useThreadMessages(kind, id)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [muted, setMuted] = useState(false)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<ScrollView>(null)

  const myName = profile?.displayName ?? user?.displayName ?? 'You'
  const author: MessageAuthor = { uid: myUid, name: myName, photoURL: profile?.photoURL ?? null }

  const headerName = kind === 'dm' ? otherProfile?.displayName ?? params.name ?? 'Member' : params.name ?? 'Event chat'

  // Thread metadata: drives unread clearing + (dm) request state.
  useEffect(() => {
    if (!id) return
    if (kind === 'group') {
      return subscribeEventChatMeta(id, (meta) => setMessageCount(meta?.messageCount ?? 0), () => {})
    }
    return subscribeConversation(id, (c) => { setConversation(c); setMessageCount(c?.messageCount ?? 0) }, () => {})
  }, [id, kind])

  // Initialise mute state once.
  useEffect(() => {
    if (!myUid || !id) return
    let cancelled = false
    getThreadRead(myUid, id).then((r) => { if (!cancelled && r) setMuted(r.muted) }).catch(() => {})
    return () => { cancelled = true }
  }, [myUid, id])

  // Mark read whenever the visible message count advances.
  useEffect(() => {
    if (!myUid || !id || messageCount === 0) return
    markThreadRead(myUid, id, messageCount).catch(() => {})
  }, [myUid, id, messageCount])

  useEffect(() => {
    if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages.length])

  const isPendingOutgoing = kind === 'dm' && conversation?.status === 'pending' && conversation.requestedBy === myUid
  const isPendingIncoming = kind === 'dm' && conversation?.status === 'pending' && conversation.requestedBy !== myUid
  const declined = kind === 'dm' && !loading && conversation === null && messages.length === 0

  const send = async () => {
    const text = draft.trim()
    if (!text || !myUid) return
    setDraft('')
    if (kind === 'group') {
      await sendEventMessage(id, author, text)
    } else {
      const participants: ParticipantInfo[] = [
        { uid: myUid, name: myName, photoURL: profile?.photoURL ?? null },
        { uid: otherUid, name: otherProfile?.displayName ?? params.name ?? 'Member', photoURL: otherProfile?.photoURL ?? null },
      ]
      await sendDirectMessage(id, participants, author, text)
    }
  }

  const recentSeeds = useMemo(() => {
    const seen: string[] = []
    for (let i = messages.length - 1; i >= 0 && seen.length < 3; i--) {
      if (!seen.includes(messages[i].authorName)) seen.push(messages[i].authorName)
    }
    return seen
  }, [messages])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (myUid && id) setThreadMuted(myUid, id, next).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, kind === 'dm' && styles.headerAvatarRound]}>
          <Text style={styles.headerAvatarText}>{initials(headerName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerName}</Text>
          <Text style={styles.headerMeta}>{kind === 'group' ? 'Group chat' : isPendingOutgoing ? 'Request pending' : 'Direct message'}</Text>
        </View>
        {kind === 'group' && recentSeeds.length > 0 ? (
          <AttendeeAvatarStack uids={recentSeeds} count={recentSeeds.length} size={26} max={3} />
        ) : (
          <TouchableOpacity onPress={toggleMute} hitSlop={8}>
            <Text style={styles.muteToggle}>{muted ? '🔕' : '🔔'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {kind === 'group' ? (
            <ChatBubble isSelf={false} isSystem message={{ id: 'sys', author: '', text: 'You registered · welcome to the chat', time: '' }} />
          ) : null}
          {isPendingOutgoing ? (
            <Banner tone="success" message="Request sent — they haven't accepted yet." />
          ) : null}
          {declined ? (
            <Banner message="This conversation is no longer available." />
          ) : null}
          {messages.map((m, i) => {
            const isSelf = m.authorUid === myUid
            return (
              <ChatBubble
                key={m.id}
                message={{ id: m.id, author: m.authorName, text: m.text, time: clockTime(m.createdAt ? m.createdAt.toDate() : null) }}
                isSelf={isSelf}
                showAuthor={!isSelf && shouldShowAuthor(messages, i)}
              />
            )
          })}
        </ScrollView>

        {isPendingIncoming ? (
          <View style={styles.acceptRow}>
            <Text style={styles.acceptHint}>Accept this request to reply.</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(id)}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={kind === 'group' ? 'Message the group' : 'Message'}
              placeholderTextColor="#8C7B70"
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!draft.trim()}>
              <Text style={styles.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(242,197,160,0.5)' },
  back: { fontSize: 24, color: '#2C1810' },
  headerAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  headerAvatarRound: { borderRadius: 20 },
  headerAvatarText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: 'white' },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  headerMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70' },
  muteToggle: { fontSize: 18 },
  messages: { paddingTop: 16, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(242,197,160,0.5)', backgroundColor: '#FBF7F2' },
  input: { flex: 1, maxHeight: 110, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(196,97,74,0.4)' },
  sendText: { fontSize: 20, color: 'white', fontFamily: 'DMSans_500Medium' },
  acceptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(242,197,160,0.5)' },
  acceptHint: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  acceptBtn: { backgroundColor: '#C4614A', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 11 },
  acceptText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
})
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; all tests pass.
Manual (needs deployed rules + two accounts): group message round-trips between two registrants; non-registrant is denied (error state, no crash); sending the first DM from a member profile creates a pending request; mute toggle persists.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/chat/[id].tsx"
git commit -m "feat: live chat thread for group and direct messages"
```

---

## Task 10: Message requests + member "Message" entry point

**Files:**
- Modify: `thirdspace-app/app/(app)/message-requests.tsx`
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx`
- Test: tsc + full jest + manual

**Interfaces:**
- Consumes: `useAuth`, `useProfile` (existing); `useMessageRequests` (Task 7); `acceptRequest`, `declineRequest` (Task 3); `dmConversationId` (Task 2); `LoadingView`/`EmptyState`/`Banner` (existing); `avatarColor`/`initials` (existing).

- [ ] **Step 1: Replace `app/(app)/message-requests.tsx`** (removes `MOCK_REQUESTS`):

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { avatarColor, initials } from '../../utils/avatar'
import { useAuth } from '../../hooks/useAuth'
import { useMessageRequests } from '../../hooks/useMessageRequests'
import { acceptRequest, declineRequest } from '../../services/chat'

export default function MessageRequests() {
  const router = useRouter()
  const { user } = useAuth()
  const { requests, loading } = useMessageRequests(user?.uid)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Requests</Text>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Requests stay here until you accept. Decline quietly — they're never notified.
            </Text>
          </View>

          {requests.length === 0 ? (
            <EmptyState emoji="✉" title="All caught up" body="You have no pending message requests." />
          ) : (
            requests.map((r) => {
              const name = r.names[r.requestedBy] ?? r.lastMessageAuthor ?? 'Member'
              return (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
                      <Text style={styles.avatarText}>{initials(name)}</Text>
                    </View>
                    <View style={styles.cardHead}>
                      <Text style={styles.name}>{name}</Text>
                      <View style={styles.interestBadge}>
                        <Text style={styles.interestText}>New request</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.preview}>{r.lastMessageText}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(r.id)}>
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(r.id)}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  infoBanner: { backgroundColor: 'rgba(242,197,160,0.18)', borderRadius: 14, padding: 16, marginBottom: 20 },
  infoText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#6B3F2A', lineHeight: 19 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  cardHead: { flex: 1, gap: 4 },
  name: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2C1810' },
  interestBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(122,140,110,0.16)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  interestText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#5c6e51' },
  preview: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', lineHeight: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(242,197,160,0.8)', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  declineText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#8C7B70' },
  acceptBtn: { flex: 1, backgroundColor: '#C4614A', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  acceptText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
})
```

- [ ] **Step 2: Wire the member "Message" button to the DM thread** in `app/(app)/member/[uid].tsx`.

Add imports near the top (with the other hook/util imports):

```tsx
import { useAuth } from '../../../hooks/useAuth'
import { dmConversationId } from '../../../utils/chat'
```

Add inside the component, after `const { profile, loading, hasError } = useProfile(uid)`:

```tsx
  const { user } = useAuth()
```

Replace the `MemberProfileCard` `onMessage` handler:

```tsx
        <MemberProfileCard
          member={member}
          onMessage={() => {
            if (!user?.uid || !uid || user.uid === uid) return
            router.push({ pathname: '/(app)/chat/[id]', params: { id: dmConversationId(user.uid, uid), kind: 'dm', name: profile.displayName } })
          }}
        />
```

- [ ] **Step 3: Verify build + tests**

Run: `npx tsc --noEmit && npx jest`
Expected: clean tsc; **all** tests pass (existing 69 + new `chat` util suite + 3 new hook suites).

- [ ] **Step 4: Manual smoke of the full flow** (needs deployed rules + two accounts)
  - A registers for an event, opens its group chat, sends a message; B (also registered) sees it live; the chat row shows an unread badge that clears on open.
  - A opens B's member profile → Message → types → B sees the request under "Requests · 1"; Accept moves it into both lists; Decline removes it silently.
  - Mute on a thread zeroes its unread badge.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/message-requests.tsx" "app/(app)/member/[uid].tsx"
git commit -m "feat: live message requests and member-to-DM entry point"
```

---

## Self-Review

**Spec coverage**
- Event group chats live (membership = registrant or hoster) → Tasks 3 (`sendEventMessage`/`subscribeEventMessages`), 4 (rules), 5, 9.
- Direct messages + request-once-then-open gate → Tasks 3 (`sendDirectMessage`/`acceptRequest`/`declineRequest`), 4 (rules), 9 (pending banner + accept), 10 (requests + initiate).
- Shared conversations subscription, index-free, partitioned → Task 3 (`subscribeMyConversations`), Task 2 (`buildChatThreads`/`selectIncomingRequests`), Tasks 6–7.
- Exact unread + mute → Task 2 (`computeUnread`), Task 3 (`markThreadRead`/`setThreadMuted`/`subscribeChatReads`), Tasks 6 + 9.
- Lazy group creation → Task 3 (`sendEventMessage` `set … { merge: true }`); empty thread renders in Task 9.
- Unified `kind` route → Tasks 8 (push params), 9 (param read).
- `member` "Message" opens the DM → Task 10.
- Rules + manual deploy called out → Task 4 + global constraints.

**Placeholder scan:** No TBD/TODO. Every code step shows complete code; manual steps enumerate concrete actions.

**Type consistency:** `Message`/`Conversation`/`EventChatMeta`/`ChatThread`/`ChatRead` defined in Task 1, consumed unchanged in 2/3/6/7/9. `MessageAuthor`/`ParticipantInfo`/`ChatReadEntry` defined in Task 3, consumed in 9. `buildChatThreads(groups, conversations, reads, myUid)`, `selectIncomingRequests(conversations, myUid)`, `dmConversationId(a,b)`, `computeUnread(messageCount, readCount, muted)`, `shouldShowAuthor(messages, index)`, `formatRelativeTime(date, now?)` — signatures identical across the util, hooks, and screens. `useThreadMessages(kind,id)`, `useChatList(uid)`, `useMessageRequests(uid)` return shapes consistent across Tasks 5–10.

---

## Execution Notes

- Tasks 1–7 are foundation (types, pure util, service, rules, hooks) and independently unit-testable. Tasks 8–10 are screen wiring gated on tsc + full jest + manual smoke (this repo does not unit-test screens).
- **Deploy gate:** after merge, run `firebase deploy --only firestore:rules`. Live chat is denied until then. This is the one manual step Claude cannot perform.
