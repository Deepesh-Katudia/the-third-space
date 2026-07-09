# Venue Announcements — Design Spec
_Date: 2026-07-09 · Phase 2, Sub-project F of 6_

## Context

Phase 2 connects the Phase-1 mock screens to live Firebase across six subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| A | User Profiles & Identity | done |
| B | Discover & Filters | done |
| C | Chat & Messaging | done |
| D | Points & Badges | done |
| E | Social graph (follows/connections) | done |
| **F** | **Venue Announcements** | **This spec** |

This is the **last** sub-project of Phase 2.

### Current state (before this work)

- **`app/(app)/(hoster)/announcement/[id].tsx`** — a Phase-1 mock composer keyed by event ID. It has a textarea, quick templates, a "Most recent" card, and a Send button. All data is `MOCK_*`; `send()` only calls `router.back()` — nothing persists.
- Launched from **`app/(app)/(hoster)/events.tsx`** via a "Send announcement" button per event; registered as a hidden tab in `(hoster)/_layout.tsx` (`href: null`).
- There is **no attender-side surface** to receive announcements.
- The composer caption claims *"Sends as push + in-app message"* — push is not built.
- No Cloud Functions exist; everything is client SDK + Firestore security rules (consistent with A–E).

## Goal

- A hoster can broadcast a text announcement to the registered attendees of one of their events, and it persists.
- Every registered attendee (and the owner) sees the announcement **in two places**: a pinned banner on the event detail screen, and a highlighted entry in the event's group chat.
- The host sees their most recent announcement with an honest send summary: relative time + recipient count snapshot.
- No mock/fake announcement state remains.
- Stays **in-app only** — no push notifications, no Cloud Functions (consistent with A–E). The push seam is left honest, not faked.

## Decisions (settled during brainstorming)

| Decision | Choice |
|----------|--------|
| Delivery mechanism | **In-app only.** No push infra, no Cloud Functions. |
| Attender surface | **Both** a pinned banner on event detail **and** a highlighted chat entry. |
| Send stats | **Recipient snapshot only** — snapshot `registeredCount` at send. No per-user read receipts. |
| Chat entry mechanism | Extend the shared `Message` type with an optional `kind` field and reuse the entire existing chat pipeline. |
| Attender "view all" | Banner tap opens the existing event chat (`/(app)/chat/[id]`). **No separate attender announcements list screen.** |
| Edit / delete announcements | Out of scope (YAGNI). |

## Architecture

**Pure client SDK + security rules + a single atomic `writeBatch` per send.** No Cloud Functions. Mirrors `services/chat.ts` `sendEventMessage`.

### Data model

**New subcollection** `events/{eventId}/announcements/{announcementId}`:

| field | type | notes |
|-------|------|-------|
| `text` | string | trimmed body |
| `authorUid` | string | = event owner (`event.venueId`) |
| `authorName` | string | denormalized author display name |
| `recipientCount` | number | snapshot of `event.registeredCount` at send time |
| `createdAt` | Timestamp \| null | `serverTimestamp()`; null in the brief local snapshot window before it resolves (same convention as `Message` / `Follow`) |

**`Message` type change** (`types/models.ts`): add optional `kind?: 'group' | 'announcement'`. Absent/`'group'` is a normal message; `'announcement'` renders the highlighted variant. `toMessage` in `services/chat.ts` reads it (defaulting to `'group'`). Existing messages without the field are unaffected.

### Send flow — one atomic `writeBatch`

`sendAnnouncement(eventId, author, text, recipientCount)` commits three writes together:

1. `set` the announcement doc at `events/{eventId}/announcements/{autoId}` with the fields above.
2. `set` a chat message at `eventChats/{eventId}/messages/{autoId}` with `kind: 'announcement'`, `text`, `authorUid`, `authorName`, `authorPhotoURL`, `createdAt: serverTimestamp()`.
3. merge `eventChats/{eventId}` meta: `lastMessageText`, `lastMessageAt`, `lastMessageAuthor`, `messageCount: increment(1)` — identical to `sendEventMessage`, so the chat-list row updates like any message.

Trimmed empty text is a no-op (matches `sendEventMessage`).

### Service layer — new `services/announcements.ts`

```ts
export interface AnnouncementAuthor { uid: string; name: string; photoURL: string | null }

// Atomic batch: announcement doc + announcement chat message + chat meta merge.
export async function sendAnnouncement(
  eventId: string,
  author: AnnouncementAuthor,
  text: string,
  recipientCount: number
): Promise<void>

// Realtime, ordered createdAt desc. Powers the host "Most recent" card AND the
// attender pinned banner (both consume index 0 = latest).
export function subscribeAnnouncements(
  eventId: string,
  onChange: (announcements: Announcement[]) => void,
  onError: () => void
): () => void
```

`Announcement` model added to `types/models.ts` (`id`, `text`, `authorUid`, `authorName`, `recipientCount`, `createdAt`).

### Components / screens

| Unit | Change |
|------|--------|
| `app/(app)/(hoster)/announcement/[id].tsx` | Wire to live data. `subscribeEvent(id)` → title/when + `registeredCount`. `subscribeAnnouncements(id)` → "Most recent" card (`text` + `Sent {relative} · {recipientCount} recipients`). `send()` → `sendAnnouncement(...)` with `useAuth` author + snapshot count, then `router.back()`; disabled while empty/sending; error banner on failure. Templates unchanged. Caption → *"Posts to the event chat as a pinned notice."* |
| `components/AnnouncementBanner.tsx` (new) | Presentational card for the latest announcement (author, text, relative time). Tapping it routes to `/(app)/chat/[id]`. |
| `app/(app)/event/[id].tsx` | Subscribe to latest announcement; render `AnnouncementBanner` above "Who's going", **only when the viewer is the owner or a registered attendee** and ≥1 announcement exists. |
| `components/ChatBubble.tsx` | Render an announcement variant (visually distinct: e.g. accent border / 📣 label) when `message.kind === 'announcement'`. |
| `utils/announcementHelpers.ts` (new) | Pure `formatSentSummary(createdAt, recipientCount)` → `"Sent 2h ago · 22 recipients"`. Unit-tested. |

### Security rules (`firestore.rules`)

Append inside `match /events/{eventId}`:

```
match /announcements/{announcementId} {
  allow read:   if signedIn() && isEventChatMember(eventId);   // owner or registered
  allow create: if signedIn() && isEventOwner(eventId)
                && request.resource.data.authorUid == request.auth.uid;
  // no update/delete this sub-project
}
```

`isEventChatMember(eventId)` (= `isRegistered || isEventOwner`) already exists. The announcement's chat-message write passes the existing `eventChats` rules because the owner is a chat member. `kind` is an unrestricted field, so no rule change is needed there.

**Manual deploy required** (`firebase deploy --only firestore:rules`) — same operational note as sub-projects C, D, and E.

## Data flow

```
Hoster taps "Send announcement" on an event
  → announcement/[id] composer (live event title + registeredCount)
  → writes: sendAnnouncement(eventId, author, text, recipientCount)
      └─ atomic batch: announcement doc + chat message(kind=announcement) + chat meta
  → subscribeAnnouncements pushes it back to the composer's "Most recent"
      AND to every registered attendee's:
        ├─ event/[id] pinned AnnouncementBanner  (tap → event chat)
        └─ event group chat  (highlighted ChatBubble)
```

## Testing (TDD, matching sub-project E coverage)

- `utils/announcementHelpers.test.ts` — `formatSentSummary` across recent/old times, singular/plural recipients, null `createdAt`.
- `services/announcements.test.ts` — mocked Firestore; assert the three-part batch (announcement doc fields, chat message carries `kind: 'announcement'`, meta merge with `messageCount` increment); assert empty/whitespace text is a no-op.

## Out of scope (YAGNI)

- **Push notifications** — deferred to a later phase. The composer copy is made honest ("in-app / pinned notice") rather than faked; no push token storage or send path is built.
- **Edit / delete announcements** — create-only this sub-project.
- **Per-user read receipts** ("N read") — recipient snapshot only.
- Any new attender list/inbox screen — the event chat is the full-history surface.
