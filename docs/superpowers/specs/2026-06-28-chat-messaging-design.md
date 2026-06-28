# Chat & Messaging — Design Spec
_Date: 2026-06-28 · Phase 2, Sub-project C of 6_

## Context

Phase 2 connects the Phase-1 mock screens to live Firebase across six subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| A | User Profiles & Identity | done |
| B | Discover & Filters | done |
| **C** | **Chat & Messaging** | **This spec** |
| D | Points & Badges | later |
| E | Social graph (follows/connections) | later |
| F | Venue Announcements | later |

C makes all three chat surfaces real in one slice: **event group chats**, **direct messages**, and the **message-request gate** between them.

### Current state (before this work)
- **`(attender)/chats.tsx`** — renders a hardcoded `MOCK_CHATS: ChatSummary[]`; All / Event groups / Direct filter pills; a static "Requests · 2" link.
- **`chat/[id].tsx`** — event-shaped thread; `MOCK_MESSAGES`, local-only `send()` that appends to `useState`; never persists.
- **`message-requests.tsx`** — `MOCK_REQUESTS`; Accept/Decline only remove the card from local state.
- **`member/[uid].tsx`** — the profile "Message" button currently routes to `message-requests` as a placeholder.
- Components already exist: `ChatRow` (`ChatSummary`), `ChatBubble` (`ChatMessage`), `AttendeeAvatarStack`.
- Identity layer from A is live: `profiles/{uid}`, `useProfile`, `users/{uid}.registeredEventIds`, and `events/{id}/registrations/{uid}` carry a profile snippet (`displayName`, `photoURL`).
- `firestore.rules` already has `signedIn()`, `isEventOwner(eventId)`, and a registration-membership `exists()` check.

## Goal

- Event group chats: every current registrant of an event (plus the hoster) can read and post in that event's chat. History persists after the event date.
- Direct messages: 1:1 threads between members, gated by a one-time request.
- Message requests: the first DM to someone you've never chatted with lands in their Requests; Accept opens the thread for good, Decline silently drops it.
- Real unread counts and a working mute toggle on every thread.
- No mock data remains on the three chat screens.

## Approach

**Firestore subcollections + `onSnapshot`, mirroring the existing service/subscription pattern.** Three new top-level collections:

- `eventChats/{eventId}` — group thread metadata; `messages` subcollection. Created lazily on the first message. Membership reuses the registration `exists()` check and `isEventOwner()` already in the rules — no separate membership records.
- `conversations/{convId}` — DM thread; `convId = ${minUid}_${maxUid}` (deterministic, so a pair can never spawn duplicate threads); `messages` subcollection.
- `users/{uid}/chatReads/{threadId}` — per-user read state `{ readCount, muted }`; `threadId` is the eventId or convId.

**Exact unread without scanning messages.** Each thread doc carries a monotonic `messageCount`, incremented on every send. The reader's `chatReads.readCount` records what they've seen. `unread = muted ? 0 : max(0, messageCount − readCount)`. Opening a thread writes `readCount = messageCount`.

**One conversations subscription feeds both surfaces, index-free.** `subscribeMyConversations(uid)` queries `conversations where participants array-contains uid` (no `orderBy` → no composite index; sorted client-side, matching `subscribeVenueEvents`). Hooks partition the stream: `status==='open'` → chat list; `pending && requestedBy===uid` → chat list (outgoing); `pending && requestedBy!==uid` → Requests screen only.

## Decisions (resolved during brainstorming)

- **Scope:** whole of C (group + DM + requests) in one spec.
- **DM gate:** request once, then open. After Accept, all future messages between the pair flow directly.
- **Group membership:** current registrants + the hoster, while registered. Cancelling a registration removes chat access (the rule re-checks `exists()`). History stays after the event date.
- **Unread/mute:** exact counts via `messageCount − readCount`; mute persisted per user per thread.
- **Pending sends:** the requester may send multiple messages while pending; the thread shows a "Request sent — they haven't accepted yet" banner. The recipient cannot post until they Accept.
- **Group chat creation:** lazy — the first sender creates `eventChats/{eventId}`. No changes to A/B event-creation code.
- **Routing:** one thread screen, `kind` param (`group` | `dm`). eventIds and `uid_uid` convIds never collide; the param selects the collection.

## New / changed units

### `types/models.ts` — ADD
- `Message { id, authorUid, authorName, authorPhotoURL: string | null, text, createdAt: Timestamp }`
- `EventChatMeta { lastMessageText, lastMessageAt, lastMessageAuthor, messageCount }`
- `Conversation { id, participants: string[], status: 'pending' | 'open', requestedBy, lastMessageText, lastMessageAt: Timestamp | null, lastMessageAuthor, messageCount }`
- `ChatThread { id, kind: 'group' | 'dm', name, photoURL: string | null, lastMessageText, lastMessageAt: Timestamp | null, unread: number, muted: boolean }` — the unified chat-list row.
- `ChatRead { readCount: number, muted: boolean }`

### `utils/chat.ts` — NEW (pure, fully unit-tested)
- `dmConversationId(a: string, b: string): string` — `[a, b].sort().join('_')`.
- `computeUnread(messageCount: number, readCount: number, muted: boolean): number` — `muted ? 0 : Math.max(0, messageCount − readCount)`.
- `sortThreadsByRecency(threads: ChatThread[]): ChatThread[]` — newest `lastMessageAt` first; null timestamps (never-used group chats) sort last.
- `shouldShowAuthor(messages: Message[], index: number): boolean` — true when the previous message has a different `authorUid` (run-grouping; replaces the inline logic in `chat/[id]`).

### `services/chat.ts` — NEW (thin Firestore wrappers)
- Group: `subscribeEventMessages(eventId, onChange, onError)`, `sendEventMessage(eventId, author, text)` — batch: create message + upsert `eventChats/{eventId}` meta (`lastMessage*`, `messageCount: increment(1)`).
- DM: `subscribeConversation(convId, onChange)`, `subscribeConversationMessages(convId, onChange, onError)`, `sendDirectMessage(convId, participants, author, text)` (creates the `pending` conversation on first send, else appends + bumps meta), `acceptRequest(convId)` (`status → 'open'`), `declineRequest(convId)` (delete conversation + its messages, batched).
- Lists: `subscribeMyConversations(uid, onChange, onError)` (array-contains, client-sorted).
- Read state: `subscribeChatReads(uid, onChange)` (the user's `chatReads` collection), `markThreadRead(uid, threadId, count)`, `setThreadMuted(uid, threadId, muted)`.
- `author` everywhere = `{ uid, name, photoURL }` denormalized onto each message (cards render without a profile join, matching the registrations pattern).

### `hooks/useThreadMessages.ts` — NEW
`useThreadMessages(kind, id): { messages: Message[]; loading: boolean; hasError: boolean }`. Subscribes to the right messages subcollection (last 50, `orderBy createdAt`), mirroring `useUpcomingEvents`.

### `hooks/useChatList.ts` — NEW
`useChatList(uid): { threads: ChatThread[]; loading; hasError }`. Subscribes to: the user's registered events' `eventChats` meta (ids from `registeredEventIds`; titles from the event docs), `subscribeMyConversations`, and `subscribeChatReads`. Merges into `ChatThread[]`, computes unread via `computeUnread`, drops pending-incoming conversations, sorts via `sortThreadsByRecency`.

### `hooks/useMessageRequests.ts` — NEW
`useMessageRequests(uid): { requests: Conversation[]; loading; hasError }`. From `subscribeMyConversations`, keeps `status==='pending' && requestedBy !== uid`, hydrates each requester's name/photo via the conversation's denormalized `lastMessageAuthor` (+ `profiles` lookup for the avatar).

### `app/(app)/(attender)/chats.tsx` — MODIFY
`useChatList(user.uid)` replaces `MOCK_CHATS`; same All/Group/Direct filter over `thread.kind`. "Requests · N" badge = `useMessageRequests().requests.length`. `loading` → `LoadingView`; empty → existing `EmptyState`.

### `app/(app)/chat/[id].tsx` — MODIFY
Reads `id` + `kind` params. `useThreadMessages(kind, id)`; send via `sendEventMessage` / `sendDirectMessage`. Header: group shows event title + `AttendeeAvatarStack`; DM shows the other member's name/avatar. Mute toggle in the header writes `setThreadMuted`. On mount and on each new message, `markThreadRead`. Pending-outgoing DM → "Request sent" banner; the system "You registered · welcome" pill stays for group chats only. Author + self-detection by `authorUid === user.uid` (no more string compare).

### `app/(app)/message-requests.tsx` — MODIFY
`useMessageRequests(user.uid)` replaces `MOCK_REQUESTS`. Accept → `acceptRequest` (thread moves to the main list); Decline → `declineRequest`. The "shared interest" line uses real interests when available, else falls back to a neutral label.

### `app/(app)/member/[uid].tsx` — MODIFY
`onMessage` → `router.push({ pathname: '/(app)/chat/[id]', params: { id: dmConversationId(myUid, uid), kind: 'dm' } })` instead of routing to `message-requests`.

### `firestore.rules` — MODIFY (deploy required)
Add helpers `isRegistered(eventId)` and `isEventChatMember(eventId) = isRegistered(eventId) || isEventOwner(eventId)`, then:
- `eventChats/{eventId}`: read + create + update if `isEventChatMember`. `messages`: read if member; create if member and `authorUid == auth.uid`. No edit/delete (v1).
- `conversations/{convId}`: read/update/delete if `auth.uid in resource.data.participants`. create if `auth.uid in request.resource.data.participants && participants.size()==2 && requestedBy==auth.uid && status=='pending'`. `messages`: read if participant; create if `authorUid==auth.uid`, participant, and (`status=='open'` or author is `requestedBy`).
- `users/{uid}/chatReads/{threadId}`: read/write if `auth.uid == uid` (subcollections need their own match).

## Data flow

```
Group:  sendEventMessage ──► eventChats/{id}/messages + meta(messageCount++)
                                     │ onSnapshot
DM:     sendDirectMessage ──► conversations/{cid}/messages + meta(messageCount++)
                                     │ onSnapshot
                          useThreadMessages ──► chat/[id] bubbles

List:   registeredEventIds + eventChats meta ┐
        subscribeMyConversations             ├─► useChatList ─► merge+unread+sort ─► chats.tsx
        subscribeChatReads (readCount/muted) ┘
                                              └─► useMessageRequests (pending-incoming) ─► message-requests.tsx
```

## Error handling & edge cases

- **Empty group chat** (no messages yet) → in-thread empty state + composer; first send creates the doc.
- **Read error** on any subscription → `hasError` → `EmptyState`/`Banner`; no crash (mirrors `useVenue`/`useProfile`).
- **Cancelled registration** → rules re-deny the event chat on next read; the row drops from `useChatList` (id no longer in `registeredEventIds`).
- **Decline race** — declining deletes the conversation; the requester's open thread then reads empty → show a neutral "This conversation is no longer available" state rather than an error.
- **Self-DM** — `dmConversationId(uid, uid)` would collide; the member screen hides "Message" on your own profile (already not reachable, but guard anyway).
- **Pending recipient cannot post** — composer is disabled with a hint until Accept (enforced by rules and UI).
- **Muted thread** — `computeUnread` returns 0; row shows 🔕 and no badge.

## Testing

- **Unit (`utils/chat.ts`):** `dmConversationId` order-independence + self pair; `computeUnread` (zero/positive/muted/over-read); `sortThreadsByRecency` (nulls last, stable); `shouldShowAuthor` (first message, run boundaries).
- **Hook tests** (mock `services/chat`): `useChatList` merge + partition (drops pending-incoming, computes unread); `useMessageRequests` filters to pending-incoming; `useThreadMessages` exposes messages + clears loading + sets hasError. Follows the `useUpcomingEvents`/`useProfile` mock pattern.
- **Type/build:** `npx tsc --noEmit` clean; existing 69 Jest tests stay green.
- **Manual smoke:** two accounts — group chat round-trips for two registrants; non-registrant is denied; DM request appears in recipient Requests, Accept opens it both ways, Decline removes it silently; unread badge increments and clears on open; mute zeroes the badge.

## New dependencies & infra

- **No new packages.**
- **`firestore.rules` change → manual deploy required** (`firebase deploy --only firestore:rules`). Unlike B, C is not read-only.
- **No new composite indexes** (array-contains queries are deliberately client-sorted).

## Out of scope (v1)

- Message pagination / infinite scroll (load the last 50; newest wins).
- Block & report enforcement (the button stays inert).
- Typing indicators, read receipts beyond unread, push notifications.
- Image / attachment messages (the `＋` button stays inert).
- Editing or deleting sent messages.
- Group chats for non-registrants or post-cancellation access.
- Deriving "shared interests" from a real social graph (that's sub-project E).
