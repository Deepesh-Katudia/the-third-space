# Venue Announcements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a hoster broadcast a text announcement to an event's registered attendees, surfaced as a pinned banner on the event detail screen and a highlighted entry in the event's group chat.

**Architecture:** Pure Firebase client SDK + Firestore security rules, no Cloud Functions (consistent with sub-projects A–E). Each send is a single atomic `writeBatch` that writes an announcement doc, a `kind:'announcement'` chat message, and a chat-meta merge. Realtime `subscribe*` services feed the composer, the pinned banner, and the chat.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript, Firebase v11 (Firestore), expo-router v6, Jest.

## Global Constraints

- **No Cloud Functions, no push notifications this sub-project.** In-app only. (Push is a future seam; do not add push token storage or a send path.)
- **No `any`** in application code; type public service APIs explicitly.
- **Firestore convention:** `serverTimestamp()` for `createdAt`; the field is `Timestamp | null` because it is null in the brief local-snapshot window before it resolves (mirror `Message` / `Follow`).
- **Denormalize** author name onto written docs (no joins on read).
- **Empty/whitespace-only text is a no-op** on send (mirror `sendEventMessage`).
- **Palette (existing):** background `#FBF7F2`, ink `#2C1810`, accent `#C4614A`, muted `#8C7B70`, warm border `rgba(242,197,160,0.5)`. Fonts: `DMSerifDisplay_400Regular` (headings), `DMSans_400Regular`/`DMSans_500Medium` (body).
- **firestore.rules changes require a manual `firebase deploy --only firestore:rules`** — same as C/D/E. The plan does not deploy.
- **Tested units are services, hooks, and utils.** Screens/components are verified by `tsc --noEmit` + manual smoke, matching the repo's existing test surface.

---

### Task 1: `formatSentSummary` pure helper

**Files:**
- Create: `thirdspace-app/utils/announcementHelpers.ts`
- Test: `thirdspace-app/__tests__/utils/announcementHelpers.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `formatSentSummary(createdAt: Date | null, recipientCount: number): string` → e.g. `"Sent 2h ago · 22 recipients"`. `createdAt === null` → `"Sending… · N recipients"`. `recipientCount === 1` → singular `"1 recipient"`.

- [ ] **Step 1: Write the failing test**

```ts
import { formatSentSummary } from '../../utils/announcementHelpers'

describe('formatSentSummary', () => {
  const now = new Date('2026-07-09T12:00:00Z')

  it('renders "just now" under a minute', () => {
    const t = new Date(now.getTime() - 30 * 1000)
    expect(formatSentSummary(t, 22, now)).toBe('Sent just now · 22 recipients')
  })

  it('renders minutes, hours, and days ago', () => {
    expect(formatSentSummary(new Date(now.getTime() - 5 * 60_000), 22, now)).toBe('Sent 5m ago · 22 recipients')
    expect(formatSentSummary(new Date(now.getTime() - 2 * 3_600_000), 22, now)).toBe('Sent 2h ago · 22 recipients')
    expect(formatSentSummary(new Date(now.getTime() - 3 * 86_400_000), 22, now)).toBe('Sent 3d ago · 22 recipients')
  })

  it('uses the singular for a single recipient', () => {
    expect(formatSentSummary(new Date(now.getTime() - 60_000), 1, now)).toBe('Sent 1m ago · 1 recipient')
  })

  it('shows a pending state when createdAt is null', () => {
    expect(formatSentSummary(null, 22, now)).toBe('Sending… · 22 recipients')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/utils/announcementHelpers.test.ts`
Expected: FAIL — `Cannot find module '../../utils/announcementHelpers'`.

- [ ] **Step 3: Write minimal implementation**

```ts
// thirdspace-app/utils/announcementHelpers.ts

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function relativeTime(createdAt: Date, now: Date): string {
  const diff = now.getTime() - createdAt.getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  return `${Math.floor(diff / DAY)}d ago`
}

/**
 * Host-facing send summary for an announcement.
 * `now` is injectable for tests; defaults to the current time.
 */
export function formatSentSummary(
  createdAt: Date | null,
  recipientCount: number,
  now: Date = new Date()
): string {
  const noun = recipientCount === 1 ? 'recipient' : 'recipients'
  const count = `${recipientCount} ${noun}`
  if (createdAt === null) return `Sending… · ${count}`
  return `Sent ${relativeTime(createdAt, now)} · ${count}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/utils/announcementHelpers.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/utils/announcementHelpers.ts thirdspace-app/__tests__/utils/announcementHelpers.test.ts
git commit -m "feat: add formatSentSummary announcement helper"
```

---

### Task 2: Announcement model + `services/announcements.ts`

**Files:**
- Modify: `thirdspace-app/types/models.ts` (add `Announcement`; add `kind?` to `Message`)
- Create: `thirdspace-app/services/announcements.ts`
- Test: `thirdspace-app/__tests__/services/announcements.test.ts`

**Interfaces:**
- Consumes: `db` from `firebase/config`; Firestore `collection/doc/setDoc/onSnapshot/query/orderBy/serverTimestamp/increment/writeBatch`.
- Produces:
  - `interface Announcement { id: string; text: string; authorUid: string; authorName: string; recipientCount: number; createdAt: Timestamp | null }`
  - `interface AnnouncementAuthor { uid: string; name: string; photoURL: string | null }`
  - `sendAnnouncement(eventId: string, author: AnnouncementAuthor, text: string, recipientCount: number): Promise<void>`
  - `subscribeAnnouncements(eventId: string, onChange: (a: Announcement[]) => void, onError: () => void): () => void` (ordered `createdAt` desc; index 0 = latest)
  - `Message` gains optional `kind?: 'group' | 'announcement'`.

- [ ] **Step 1: Add the model changes**

In `thirdspace-app/types/models.ts`, add to the `Message` interface (in the "Chat & Messaging" block):

```ts
export interface Message {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL: string | null
  text: string
  createdAt: Timestamp | null
  kind?: 'group' | 'announcement'   // absent = group; 'announcement' renders the pinned/highlighted variant
}
```

Add a new block (near the other sub-project sections):

```ts
// ── Venue Announcements (sub-project F) ───────────────────────────────────
// One doc per broadcast at events/{eventId}/announcements/{autoId}. recipientCount
// is a snapshot of the event's registeredCount at send time. createdAt is null in
// the local snapshot window before serverTimestamp resolves.
export interface Announcement {
  id: string
  text: string
  authorUid: string
  authorName: string
  recipientCount: number
  createdAt: Timestamp | null
}
```

- [ ] **Step 2: Write the failing test**

```ts
// thirdspace-app/__tests__/services/announcements.test.ts
import { onSnapshot } from 'firebase/firestore'
import { sendAnnouncement, subscribeAnnouncements } from '../../services/announcements'

const batchSet = jest.fn()
const batchCommit = jest.fn().mockResolvedValue(undefined)

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/'), _isCollection: true }),
  query: (col: { path: string }, ...constraints: unknown[]) => ({ col, constraints }),
  orderBy: (field: string, dir: string) => ({ field, dir }),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__ts',
  increment: (n: number) => ({ __increment: n }),
  writeBatch: () => ({ set: batchSet, commit: batchCommit }),
}))

const author = { uid: 'host1', name: 'Rooftop Bar', photoURL: null }

beforeEach(() => jest.clearAllMocks())

describe('sendAnnouncement', () => {
  it('is a no-op for whitespace-only text', async () => {
    await sendAnnouncement('evt1', author, '   ', 22)
    expect(batchSet).not.toHaveBeenCalled()
    expect(batchCommit).not.toHaveBeenCalled()
  })

  it('batches the announcement doc, an announcement chat message, and a chat-meta merge', async () => {
    await sendAnnouncement('evt1', author, '  Doors at 6  ', 22)

    // announcement doc
    expect(batchSet).toHaveBeenCalledWith(
      { path: 'events/evt1/announcements' },
      { text: 'Doors at 6', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: '__ts' }
    )
    // chat message carries kind:'announcement' and the trimmed text
    expect(batchSet).toHaveBeenCalledWith(
      { path: 'eventChats/evt1/messages' },
      { authorUid: 'host1', authorName: 'Rooftop Bar', authorPhotoURL: null, text: 'Doors at 6', kind: 'announcement', createdAt: '__ts' }
    )
    // chat meta merge with messageCount increment
    expect(batchSet).toHaveBeenCalledWith(
      { path: 'eventChats/evt1' },
      { lastMessageText: 'Doors at 6', lastMessageAt: '__ts', lastMessageAuthor: 'Rooftop Bar', messageCount: { __increment: 1 } },
      { merge: true }
    )
    expect(batchCommit).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeAnnouncements', () => {
  it('queries events/{id}/announcements ordered by createdAt desc and maps docs', () => {
    let handler: (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => { handler = fn; return jest.fn() })
    const onChange = jest.fn()

    subscribeAnnouncements('evt1', onChange, jest.fn())

    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.col).toEqual({ path: 'events/evt1/announcements', _isCollection: true })
    expect(q.constraints).toEqual([{ field: 'createdAt', dir: 'desc' }])

    handler({ docs: [
      { id: 'a1', data: () => ({ text: 'Hi', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: null }) },
    ] })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'a1', text: 'Hi', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: null },
    ])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/services/announcements.test.ts`
Expected: FAIL — `Cannot find module '../../services/announcements'`.

- [ ] **Step 4: Write minimal implementation**

```ts
// thirdspace-app/services/announcements.ts
import {
  collection, doc, onSnapshot, orderBy, query, serverTimestamp, increment, writeBatch,
  DocumentData, QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { Announcement } from '../types/models'

export interface AnnouncementAuthor { uid: string; name: string; photoURL: string | null }

function toAnnouncement(d: QueryDocumentSnapshot<DocumentData>): Announcement {
  const data = d.data()
  return {
    id: d.id,
    text: (data.text as string) ?? '',
    authorUid: (data.authorUid as string) ?? '',
    authorName: (data.authorName as string) ?? 'Host',
    recipientCount: (data.recipientCount as number) ?? 0,
    createdAt: (data.createdAt as Announcement['createdAt']) ?? null,
  }
}

// Atomic batch: announcement doc + announcement chat message + chat-meta merge.
export async function sendAnnouncement(
  eventId: string,
  author: AnnouncementAuthor,
  text: string,
  recipientCount: number
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

  const batch = writeBatch(db)

  const annRef = doc(collection(db, 'events', eventId, 'announcements'))
  batch.set(annRef, {
    text: trimmed,
    authorUid: author.uid,
    authorName: author.name,
    recipientCount,
    createdAt: serverTimestamp(),
  })

  const msgRef = doc(collection(db, 'eventChats', eventId, 'messages'))
  batch.set(msgRef, {
    authorUid: author.uid,
    authorName: author.name,
    authorPhotoURL: author.photoURL,
    text: trimmed,
    kind: 'announcement',
    createdAt: serverTimestamp(),
  })

  batch.set(
    doc(db, 'eventChats', eventId),
    { lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1) },
    { merge: true }
  )

  await batch.commit()
}

export function subscribeAnnouncements(
  eventId: string,
  onChange: (announcements: Announcement[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'events', eventId, 'announcements'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toAnnouncement)), onError)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/services/announcements.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add thirdspace-app/types/models.ts thirdspace-app/services/announcements.ts thirdspace-app/__tests__/services/announcements.test.ts
git commit -m "feat: add announcement model and announcements service"
```

---

### Task 3: Render announcements as a highlighted chat entry

**Files:**
- Modify: `thirdspace-app/services/chat.ts` (`toMessage` reads `kind`)
- Modify: `thirdspace-app/components/ChatBubble.tsx` (add `isAnnouncement` variant)
- Modify: `thirdspace-app/app/(app)/chat/[id].tsx:152-162` (pass `isAnnouncement`)
- Test: `thirdspace-app/__tests__/services/chatKind.test.ts`

**Interfaces:**
- Consumes: `Message.kind` from Task 2; `subscribeEventMessages` from `services/chat.ts`.
- Produces: `Message` objects whose `kind` round-trips from Firestore; `ChatBubble` renders an announcement style when `isAnnouncement` is true.

- [ ] **Step 1: Write the failing test** (proves `toMessage` maps `kind` through `subscribeEventMessages`)

```ts
// thirdspace-app/__tests__/services/chatKind.test.ts
import { onSnapshot } from 'firebase/firestore'
import { subscribeEventMessages } from '../../services/chat'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (col: unknown, ...constraints: unknown[]) => ({ col, constraints }),
  orderBy: (field: string, dir: string) => ({ field, dir }),
  limit: (n: number) => ({ limit: n }),
  onSnapshot: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

it('maps a message kind through subscribeEventMessages', () => {
  let handler: (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void = () => {}
  ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => { handler = fn; return jest.fn() })
  const onChange = jest.fn()

  subscribeEventMessages('evt1', onChange, jest.fn())

  handler({ docs: [
    { id: 'm1', data: () => ({ authorUid: 'u', authorName: 'A', text: 'hey', createdAt: null }) },
    { id: 'm2', data: () => ({ authorUid: 'h', authorName: 'Host', text: 'Doors at 6', createdAt: null, kind: 'announcement' }) },
  ] })

  // subscribeEventMessages reverses to chronological order
  const emitted = onChange.mock.calls[0][0]
  expect(emitted[0].kind).toBe('group')
  expect(emitted[1].kind).toBe('announcement')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/services/chatKind.test.ts`
Expected: FAIL — `emitted[0].kind` is `undefined` (toMessage doesn't set it yet).

- [ ] **Step 3: Update `toMessage` in `services/chat.ts`**

In `toMessage`, add `kind` to the returned object (default `'group'`):

```ts
function toMessage(d: QueryDocumentSnapshot<DocumentData>): Message {
  const data = d.data()
  return {
    id: d.id,
    authorUid: (data.authorUid as string) ?? '',
    authorName: (data.authorName as string) ?? 'Member',
    authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
    text: (data.text as string) ?? '',
    createdAt: (data.createdAt as Message['createdAt']) ?? null,
    kind: (data.kind as Message['kind']) ?? 'group',
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/services/chatKind.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the announcement variant to `ChatBubble.tsx`**

Add `isAnnouncement?: boolean` to `ChatBubbleProps`, and render a distinct block before the `isSelf` branch (announcements are never "self-styled" — they read as a broadcast):

```tsx
interface ChatBubbleProps {
  message: ChatMessage
  isSelf: boolean
  isSystem?: boolean
  isAnnouncement?: boolean
  showAuthor?: boolean
}

export function ChatBubble({ message, isSelf, isSystem = false, isAnnouncement = false, showAuthor = true }: ChatBubbleProps) {
  if (isSystem) {
    // ...unchanged...
  }

  if (isAnnouncement) {
    return (
      <View style={styles.announceRow}>
        <View style={styles.announceCard}>
          <Text style={styles.announceLabel}>📣 Announcement · {message.author}</Text>
          <Text style={styles.announceText}>{message.text}</Text>
          <Text style={styles.announceTime}>{message.time}</Text>
        </View>
      </View>
    )
  }

  // ...rest unchanged...
}
```

Add to the `StyleSheet.create({...})`:

```ts
  announceRow: { paddingHorizontal: 16, marginBottom: 14 },
  announceCard: { backgroundColor: 'rgba(242,197,160,0.22)', borderLeftWidth: 3, borderLeftColor: '#C4614A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  announceLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B3F2A', letterSpacing: 0.4, marginBottom: 5 },
  announceText: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  announceTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#8C7B70', marginTop: 5 },
```

- [ ] **Step 6: Pass `isAnnouncement` from the chat screen**

In `app/(app)/chat/[id].tsx`, update the message map (currently lines 152–162):

```tsx
{messages.map((m, i) => {
  const isSelf = m.authorUid === myUid
  const isAnnouncement = m.kind === 'announcement'
  return (
    <ChatBubble
      key={m.id}
      message={{ id: m.id, author: m.authorName, text: m.text, time: clockTime(m.createdAt ? m.createdAt.toDate() : null) }}
      isSelf={isSelf && !isAnnouncement}
      isAnnouncement={isAnnouncement}
      showAuthor={!isSelf && shouldShowAuthor(messages, i)}
    />
  )
})}
```

- [ ] **Step 7: Typecheck + full test run**

Run: `cd thirdspace-app && npx tsc --noEmit && npx jest`
Expected: no type errors; all suites pass.

- [ ] **Step 8: Commit**

```bash
git add thirdspace-app/services/chat.ts thirdspace-app/components/ChatBubble.tsx "thirdspace-app/app/(app)/chat/[id].tsx" thirdspace-app/__tests__/services/chatKind.test.ts
git commit -m "feat: render announcements as highlighted chat entries"
```

---

### Task 4: Wire the hoster announcement composer to live data

**Files:**
- Modify: `thirdspace-app/app/(app)/(hoster)/announcement/[id].tsx` (replace all `MOCK_*`; real send)

**Interfaces:**
- Consumes: `subscribeEvent` from `services/events.ts` (signature `subscribeEvent(id, cb, onErr)` → unsubscribe; `CommunityEvent` has `title`, `startsAt: Timestamp`, `registeredCount`); `useAuth` (`user.uid`, `user.displayName`); `useProfile(uid)` (`profile.displayName`, `profile.photoURL`); `sendAnnouncement`, `subscribeAnnouncements`, `AnnouncementAuthor` from Task 2; `formatSentSummary` from Task 1; `formatDayDate`, `formatTime` from `utils/eventHelpers.ts`.
- Produces: a working composer screen (no exported API).

- [ ] **Step 1: Replace the mock header/state with live subscriptions**

Rewrite the top of `announcement/[id].tsx`. Imports (note the **four** `../` — this file is one level deeper than `event/[id].tsx`):

```tsx
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../../hooks/useAuth'
import { useProfile } from '../../../../hooks/useProfile'
import { subscribeEvent } from '../../../../services/events'
import { sendAnnouncement, subscribeAnnouncements, AnnouncementAuthor } from '../../../../services/announcements'
import { formatSentSummary } from '../../../../utils/announcementHelpers'
import { formatDayDate, formatTime } from '../../../../utils/eventHelpers'
import { CommunityEvent, Announcement } from '../../../../types/models'
```

Keep the existing `TEMPLATES` constant. Delete `MOCK_EVENT_TITLE`, `MOCK_EVENT_WHEN`, `MOCK_ATTENDEES`, and `MOCK_RECENT`.

- [ ] **Step 2: Replace the component body**

```tsx
export default function Announcement() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { profile } = useProfile(user?.uid || undefined)

  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [latest, setLatest] = useState<Announcement | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setError("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeAnnouncements(id, (list) => setLatest(list[0] ?? null), () => {})
  }, [id])

  const recipientCount = event?.registeredCount ?? 0
  const whenLine = event ? `${formatDayDate(event.startsAt.toDate())} · ${formatTime(event.startsAt.toDate())}` : ''

  const send = async () => {
    const text = message.trim()
    if (!text || !user || sending) return
    setSending(true)
    setError('')
    const author: AnnouncementAuthor = {
      uid: user.uid,
      name: profile?.displayName ?? user.displayName ?? 'Host',
      photoURL: profile?.photoURL ?? null,
    }
    try {
      await sendAnnouncement(id, author, text, recipientCount)
      router.back()
    } catch {
      setError('Could not send. Try again.')
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Send announcement</Text>
          <Text style={styles.subtitle}>To {recipientCount} registered {recipientCount === 1 ? 'attendee' : 'attendees'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event?.title ?? '…'}</Text>
            <Text style={styles.eventWhen}>{whenLine}</Text>
          </View>

          <TextInput
            style={styles.textarea}
            placeholder="Write your announcement…"
            placeholderTextColor="#8C7B70"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.caption}>Posts to the event chat as a pinned notice</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Quick templates</Text>
          <View style={styles.templateWrap}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity key={t.label} style={styles.templateChip} onPress={() => setMessage(t.text)}>
                <Text style={styles.templateText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {latest ? (
            <>
              <Text style={styles.sectionLabel}>Most recent</Text>
              <View style={styles.recentCard}>
                <Text style={styles.recentText}>{latest.text}</Text>
                <Text style={styles.recentStats}>
                  {formatSentSummary(latest.createdAt ? latest.createdAt.toDate() : null, latest.recipientCount)}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!message.trim() || sending}
          >
            <Text style={styles.sendText}>{sending ? 'Sending…' : `Send to ${recipientCount} ${recipientCount === 1 ? 'attendee' : 'attendees'}`}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 3: Add the `error` style**

Add one entry to the existing `StyleSheet.create({...})` (all other styles already exist in the file):

```ts
  error: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginTop: 8 },
```

- [ ] **Step 4: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke (record result)**

Start Expo, sign in as a hoster, open Events → "Send announcement" on an event with ≥1 registration. Confirm: header shows real attendee count, event card shows real title + date, typing enables Send, a template fills the box, tapping Send returns to the events list without error, and re-opening the composer shows the sent text under "Most recent" with a "Sent … · N recipients" line.

- [ ] **Step 6: Commit**

```bash
git add "thirdspace-app/app/(app)/(hoster)/announcement/[id].tsx"
git commit -m "feat: wire hoster announcement composer to live send"
```

---

### Task 5: Pinned announcement banner on the attender event detail

**Files:**
- Create: `thirdspace-app/components/AnnouncementBanner.tsx`
- Modify: `thirdspace-app/app/(app)/event/[id].tsx` (subscribe to latest announcement; render banner for owner/registered)

**Interfaces:**
- Consumes: `subscribeAnnouncements`, `Announcement` from Task 2; existing `event/[id].tsx` state `isOwner`, `isRegistered`, and `router`.
- Produces: `AnnouncementBanner` presentational component (props: `announcement: Announcement`, `onPress: () => void`).

- [ ] **Step 1: Create the banner component**

```tsx
// thirdspace-app/components/AnnouncementBanner.tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Announcement } from '../types/models'

interface AnnouncementBannerProps {
  announcement: Announcement
  onPress: () => void
}

export function AnnouncementBanner({ announcement, onPress }: AnnouncementBannerProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.label}>📣 Latest from the host</Text>
      <Text style={styles.text} numberOfLines={3}>{announcement.text}</Text>
      <Text style={styles.cta}>Open chat →</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(242,197,160,0.22)', borderLeftWidth: 3, borderLeftColor: '#C4614A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B3F2A', letterSpacing: 0.4, marginBottom: 6 },
  text: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  cta: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4614A', marginTop: 8 },
})
```

- [ ] **Step 2: Subscribe to the latest announcement in `event/[id].tsx`**

Add the import:

```tsx
import { AnnouncementBanner } from '../../../components/AnnouncementBanner'
import { subscribeAnnouncements } from '../../../services/announcements'
import { CommunityEvent, Registration, Announcement } from '../../../types/models'
```

Add state near the other `useState` calls:

```tsx
const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)
```

Add an effect after the existing registrations effect (reads are gated by security rules to owner/registered, so only subscribe then):

```tsx
useEffect(() => {
  if (!id || (!isOwner && !isRegistered)) return
  return subscribeAnnouncements(id, (list) => setLatestAnnouncement(list[0] ?? null), () => {})
}, [id, isOwner, isRegistered])
```

- [ ] **Step 3: Render the banner above "Who's going"**

In the JSX `body`, immediately before the `{/* Who's going */}` block, add:

```tsx
{latestAnnouncement && (isOwner || isRegistered) ? (
  <AnnouncementBanner
    announcement={latestAnnouncement}
    onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: event.id } })}
  />
) : null}
```

- [ ] **Step 4: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke (record result)**

As a registered attender, open an event that has an announcement → the pinned banner appears above "Who's going"; tapping it opens the event chat where the same announcement shows as a highlighted entry. As a non-registered user, the banner does not appear.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/components/AnnouncementBanner.tsx "thirdspace-app/app/(app)/event/[id].tsx"
git commit -m "feat: show pinned announcement banner on event detail"
```

---

### Task 6: Firestore security rules for announcements

**Files:**
- Modify: `thirdspace-app/firestore.rules` (add `announcements` subcollection rules inside `match /events/{eventId}`)

**Interfaces:**
- Consumes: existing rule helpers `signedIn()`, `isEventOwner(eventId)`, `isEventChatMember(eventId)`.
- Produces: read gated to chat members; create gated to the event owner writing their own `authorUid`.

- [ ] **Step 1: Add the rules block**

Inside `match /events/{eventId} { ... }`, after the `registrations` sub-match, add:

```
      match /announcements/{announcementId} {
        allow read: if signedIn() && isEventChatMember(eventId);
        allow create: if signedIn() && isEventOwner(eventId)
          && request.resource.data.authorUid == request.auth.uid;
        // No update/delete this sub-project.
      }
```

- [ ] **Step 2: Sanity-check the braces**

The Firebase CLI is not installed in this environment, so there is no local rules compiler. Visually confirm the new `announcements` block sits **inside** `match /events/{eventId} { … }` (a sibling of the existing `registrations` block) and that every brace is balanced. Deployment is manual — see Step 4.

- [ ] **Step 3: Commit**

```bash
git add thirdspace-app/firestore.rules
git commit -m "feat: add security rules for event announcements"
```

- [ ] **Step 4: Manual deploy (operator, not automated)**

The person with Firebase access runs:

```bash
npm i -g firebase-tools   # if not installed
firebase login
cd thirdspace-app && firebase deploy --only firestore:rules
```

This deploys the whole `firestore.rules` file (project `the-third-space-626e8`). Until it runs, attenders will get permission-denied on announcement reads — the banner effect swallows the error (empty `onError`) so the screen degrades gracefully.

---

## Final verification

- [ ] Run the whole suite: `cd thirdspace-app && npx jest` → all green.
- [ ] Typecheck: `cd thirdspace-app && npx tsc --noEmit` → clean.
- [ ] Two-account smoke: host sends an announcement → it appears as a pinned banner on the attender's event detail AND as a highlighted chat entry; host's composer shows it under "Most recent" with the recipient snapshot line.
- [ ] Update project memory: mark sub-project F code-complete; note the manual rules deploy + 2-account smoke as the remaining ops steps.
