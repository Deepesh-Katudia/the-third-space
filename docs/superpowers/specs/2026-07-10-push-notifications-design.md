# Push Notifications — Design Spec
_Date: 2026-07-10 · Phase 3, Sub-project 1 (first of the post–Phase-2 stage)_

## Context

Phase 2 connected all six everyday-experience areas (A Profiles, B Discover, C Chat, D Points/Badges, E Social graph, F Announcements) to live Firebase. Every one of those was built **pure client SDK + Firestore security rules, no Cloud Functions**. Delivery of messages and announcements is therefore **in-app only** — nothing reaches a user whose app is closed or backgrounded.

Push notifications are the explicitly-deferred seam across sub-projects C and F. This spec covers the **first** sub-project of the post–Phase-2 stage. Two sibling pieces (feature follow-ups, launch preparation) are separate sub-projects and are out of scope here.

### Current state (before this work)

- No push infrastructure of any kind. `expo-notifications` / `expo-device` are **not installed**.
- No server-side code exists; there is no `functions/` directory.
- No settings screen exists. The attender **Profile** screen hosts sign-out; hosters have no profile tab (their tabs are Overview / Events / Venue).
- In-app surfaces already exist for the v1 triggers: DMs and event group chats (`services/chat.ts`, `chat/[id]`), announcements (`services/announcements.ts`, pinned banner on `event/[id]`), and the social graph (`services/follows.ts`).
- The Firebase project (`the-third-space-626e8`) is on the free Spark plan.

## Goal

- A registered user receives an OS-level push notification — even when the app is closed — for three high-signal events: **a new direct message**, **a venue announcement** for an event they're registered for, and **a new follower / new mutual connection**.
- Tapping a notification deep-links to the relevant existing screen.
- Users have a single global **"Push notifications" on/off** control, and already-muted DM threads stay silent.
- A user is **never** pushed for their own action.
- The push send path is **trusted server-side** (Firebase Cloud Functions); clients never gain the ability to read another user's push tokens or send arbitrary pushes.
- Dead/unregistered tokens are pruned automatically so they don't accumulate.

## Decisions (settled during brainstorming)

| Decision | Choice |
|----------|--------|
| Server model | **Firebase Cloud Functions** (Firestore-triggered) calling the Expo Push API. Requires upgrading the project to the **Blaze** billing plan. |
| Functions structure | **One thin function per trigger + a shared sender/recipient util** (Approach A), not a single dispatcher. |
| v1 triggers | **New direct message**, **venue announcement**, **new follower / mutual connection**. |
| Excluded trigger | **Event group-chat messages** — highest volume, needs throttling; deferred. |
| User controls | **Global toggle** (`users/{uid}.pushEnabled`) + **honor existing DM per-thread mute**. No per-category toggles. |
| Token storage | `users/{uid}/pushTokens/{token}` **subcollection** (token = doc ID), so multiple devices work. |
| Settings home | New shared **`(app)/settings.tsx`** screen with the single toggle, reachable from attender Profile and hoster Venue. |
| Author exclusion | Every trigger excludes the actor from recipients. |

## Architecture

**Pure Firestore-trigger fan-out.** The app writes documents exactly as it does today (unchanged). Cloud Functions observe those writes, resolve recipients server-side (via the Admin SDK, which bypasses security rules), and call the Expo Push API. The app and the functions never import each other — they communicate only through Firestore.

```
Client (Expo app)                        Firebase
─────────────────                        ────────
expo-notifications                       Firestore onCreate triggers → Cloud Functions
  ├ ask OS permission (post sign-in)       ├ onNewDirectMessage
  ├ get Expo push token                    ├ onNewAnnouncement    → sendPush() → Expo Push API
  ├ write users/{uid}/pushTokens/{tok}     └ onNewFollow               │
  └ tap → deep link (chat/event/profile)                              └ prune dead tokens
                                           reads (Admin SDK): pushTokens,
                                           user.pushEnabled, chatReads.muted,
                                           event registrations
```

### New dependencies

- **Client:** `expo-notifications`, `expo-device`. Requires a dev/production build (push does not work in Expo Go on SDK 54, nor on simulators).
- **Backend:** a new top-level `functions/` directory — TypeScript, Firebase Functions **v2**, Firebase Admin SDK, `expo-server-sdk`. Deployed with `firebase deploy --only functions`.

### Unit boundaries (each independently testable)

**Backend (`functions/src/`):**
- `sendPush.ts` — `sendPush(messages): Promise<string[]>`. Chunks to the Expo Push API (≤100/chunk), reads tickets, returns token strings that came back `DeviceNotRegistered` for pruning. Knows nothing about DMs/announcements/follows.
- `recipients.ts` — resolution + filtering helpers: `activeTokensFor(uids)` (reads `pushTokens`, drops any uid with `pushEnabled === false`), plus the DM mute filter and mutual-follow detection. Returns `{ uid, token }[]`.
- `onNewDirectMessage.ts`, `onNewAnnouncement.ts`, `onNewFollow.ts` — each: resolve recipients → build payload → `sendPush` → prune returned dead tokens.
- `index.ts` — exports the three functions.

**Client:**
- `services/pushTokens.ts` — `upsertPushToken(uid, token, platform)`, `deletePushToken(uid, token)`, `setPushEnabled(uid, enabled)`.
- `hooks/usePushRegistration.ts` — permission prompt, token capture, Android channel, foreground handler, tap→route listener, sign-out cleanup. Mounted once in the authed layout.
- `utils/pushRouting.ts` — pure `routeForNotification(data): Href | null` mapping `data.type` → route (`dm`→`chat/[id]`, `announcement`→`event/[id]`, `follow`→`member/[uid]`). Unit-tested.
- `app/(app)/settings.tsx` — the global toggle screen.

### Data model

| Path | Shape | Notes |
|------|-------|-------|
| `users/{uid}/pushTokens/{token}` | `{ token: string; platform: 'ios' \| 'android'; updatedAt: Timestamp }` | token string is the doc ID → idempotent upsert; multi-device |
| `users/{uid}` (new field) | `pushEnabled?: boolean` | global toggle. **Absent = treated as enabled** so existing users are not silently opted out. |

No change to `conversations`, `events/*/announcements`, `follows`, or `chatReads` shapes — the functions read what's already written.

### Client capture flow (`usePushRegistration`)

1. On authenticated mount, if `Device.isDevice` is false → no-op (simulator).
2. `getPermissionsAsync()`; if undetermined, `requestPermissionsAsync()`. Denied → stop silently (no token written).
3. On grant: `getExpoPushTokenAsync()` → `upsertPushToken(uid, token, Platform.OS)`.
4. Set the Android notification channel (required for Android display).
5. Foreground handler shows a banner while the app is open; a response listener calls `routeForNotification(data)` and navigates on tap.
6. On **sign-out**, `deletePushToken(uid, currentToken)` so a shared device stops receiving the previous user's pushes.

### The three trigger functions

All recipient resolution runs through `recipients.ts`, enforcing the two global rules: **skip any uid with `pushEnabled === false`**, and only target uids that have ≥1 token. Every function excludes the actor.

| Function | Trigger (onCreate) | Recipients | Payload: title / body / data |
|----------|-------------------|------------|------------------------------|
| `onNewDirectMessage` | `conversations/{cid}/messages/{mid}` | other participant(s), minus author, minus anyone with `users/{uid}/chatReads/{cid}.muted === true` | `{authorName}` / message text (≤140) / `{ type:'dm', convId }` |
| `onNewAnnouncement` | `events/{eid}/announcements/{aid}` | all `events/{eid}/registrations/{uid}`, minus the author (host) | `📣 {eventTitle}` / announcement text (≤140) / `{ type:'announcement', eventId }` |
| `onNewFollow` | `follows/{fid}` | the `target` uid | `{followerName} started following you` — or `You're now connected with {followerName}` if the reverse follow exists / `{ type:'follow', uid: followerUid }` |

**Send + prune.** `sendPush` chunks messages (≤100), submits to the Expo Push API, inspects tickets, and the calling function deletes any `pushTokens` docs whose tokens returned `DeviceNotRegistered`.

**Fan-out safety.** Announcement recipients are bounded by event capacity; the registrations subcollection is read once and sent in chunks — no unbounded work.

### Deep-linking

Client response listener maps `data.type` to an existing route (reusing built screens):
- `dm` → `/(app)/chat/[id]` (`convId`)
- `announcement` → `/(app)/event/[id]` (`eventId`) — the pinned announcement banner is already there
- `follow` → `/(app)/member/[uid]` (`followerUid`) — the existing other-member profile screen

### Security rules (`firestore.rules`)

`pushTokens` are per-user secrets — owner-only, no cross-user reads:

```
match /users/{uid}/pushTokens/{token} {
  allow read, write: if signedIn() && request.auth.uid == uid;
}
```

`pushEnabled` rides on the existing `users/{uid}` doc, already gated to `request.auth.uid == uid` — no rule change. Cloud Functions read recipient tokens/prefs via the **Admin SDK, which bypasses rules**, so clients can never read another user's tokens while the trusted server still fans out. **Manual deploy required** (`firebase deploy --only firestore:rules`), same operational note as prior sub-projects.

## Data flow

```
User A sends a DM to User B (unchanged client write)
  → conversations/{cid}/messages/{mid} created
  → onNewDirectMessage fires
      ├ resolve B (participant, not author)
      ├ skip if B.pushEnabled === false OR B muted this thread
      ├ activeTokensFor(B) → tokens
      └ sendPush(tokens, "{A}: {text}", { type:'dm', convId })
  → B's phone shows a banner; tap → /(app)/chat/[cid]
  (announcement + follow flows are analogous)
```

## Testing (TDD, matching prior sub-project coverage)

**Functions (Jest in `functions/`, Expo SDK + Admin SDK mocked):**
- `sendPush` — chunking at the 100 boundary; returns `DeviceNotRegistered` tokens for pruning; empty-input no-op.
- `recipients` — `pushEnabled === false` filtered out; `pushEnabled` absent treated as enabled; DM mute filter; author excluded; mutual-follow detection for the connection copy.
- Each trigger — asserts the correct recipient set and payload from a mocked document event.

**Client:**
- `services/pushTokens.test.ts` — upsert path/shape, delete, `setPushEnabled`.
- `utils/pushRouting.test.ts` — every `data.type` → correct route; unknown type → null.
- `usePushRegistration` and `settings.tsx` verified by `tsc --noEmit` + manual device smoke (matches the repo's existing test surface).

**Manual (final checklist):** a **2-physical-device** test — A messages B, a host announces to a registered B, A follows B → each yields a push with the app backgrounded; tapping deep-links correctly; toggling `pushEnabled` off and muting a thread each suppress the expected push.

## Out of scope (YAGNI)

- **Event group-chat message pushes** — needs throttling/batching; deferred to a later sub-project.
- **Per-category notification toggles** — global toggle only.
- **Badge counts, rich media/images, notification grouping, scheduled/quiet hours.**
- **Delivery/open analytics and read receipts.**
- **Web push** — native iOS/Android only.

## Operational notes

- Requires upgrading the Firebase project to the **Blaze** pay-as-you-go plan (Cloud Functions; generous free tier).
- Adds `firebase deploy --only functions` as a second manual deploy step alongside the rules deploy.
- `expo-notifications` requires a **dev/production build** (EAS or local) — it will not deliver push in Expo Go on SDK 54, nor on simulators.
- Push token capture and delivery can only be verified on **physical devices**.
