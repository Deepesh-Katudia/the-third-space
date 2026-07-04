# Social Graph (Follows & Connections) — Design Spec
_Date: 2026-07-04 · Phase 2, Sub-project E of 6_

## Context

Phase 2 connects the Phase-1 mock screens to live Firebase across six subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| A | User Profiles & Identity | done |
| B | Discover & Filters | done |
| C | Chat & Messaging | done |
| D | Points & Badges | done |
| **E** | **Social graph (follows/connections)** | **This spec** |
| F | Venue Announcements | later |

### Current state (before this work)

- **`components/MemberProfileCard.tsx`** — the Follow / Following button is a local `useState(false)` toggle; nothing persists anywhere.
- **`app/(app)/(attender)/profile.tsx`** — the "Connections" stat is hardcoded to `0`.
- **`utils/badges.ts`** — the 🤝 Connector badge is permanently `earned: false`, explicitly waiting for this sub-project.
- There is no followers/following list screen in the Phase 1 mockup.
- No Cloud Functions exist in this project; everything is client SDK + Firestore security rules.

## Goal

- Follow is real: tapping Follow/Following on a member profile persists a follow edge and survives restarts; the button reflects live state.
- "Connections" (mutual follows — you follow each other) is real on the profile stat row, and tapping it opens a new connections list screen.
- The 🤝 Connector badge unlocks at **3+ mutual connections**.
- No mock/fake social state remains.

## Decisions (resolved during brainstorming)

- **Social model:** instant one-way follows (Instagram-style) — matches the existing one-tap toggle UI; no accept flow.
- **"Connections" definition:** mutual follows only (A follows B *and* B follows A).
- **Connector badge:** earned at `connectionsCount >= 3` — same number as the profile stat, one concept on two surfaces.
- **List UI:** yes — a new `connections.tsx` screen listing mutual connections, each row navigating to `member/[uid]`. (A *followers* list stays out of scope.)
- **Storage:** top-level `follows` collection, one doc per edge with a deterministic composite ID (chosen over mirrored subcollections + counters, and over a `following` array on the profile doc — cleanest rules, zero cross-user writes, no counter drift, mirrors the `conversations` ID pattern).

## Data model

One new top-level collection:

```
follows/{followerUid_targetUid}
  { follower: string, target: string, createdAt: Timestamp }
```

- Deterministic doc ID makes follow/unfollow idempotent and "am I following X?" a single-doc subscription (no query).
- **Connections are never stored.** They are the client-side intersection of two live queries — "who I follow" (`where follower == uid`) and "who follows me" (`where target == uid`) — so they can't drift and need no counters.
- Single-field filters, no `orderBy` → **no composite indexes required**.

## New / changed units

### `types/models.ts` — ADD
```typescript
interface Follow { follower: string; target: string; createdAt: Timestamp | null }
```
(`createdAt` is `null` in the local snapshot window before `serverTimestamp()` resolves, same convention as `Message`.)

### `utils/follows.ts` — NEW (pure, fully unit-tested)
- `followDocId(follower: string, target: string): string` → `` `${follower}_${target}` ``
- `mutualConnections(followingUids: string[], followerUids: string[]): string[]` — set intersection, preserving `followingUids` order.

### `services/follows.ts` — NEW
- `followUser(followerUid, targetUid)` — `setDoc(follows/{followDocId}, { follower, target, createdAt: serverTimestamp() })`; throws on self-follow.
- `unfollowUser(followerUid, targetUid)` — `deleteDoc` on the same ID.
- `subscribeFollowStatus(followerUid, targetUid, onData, onError)` — single-doc `onSnapshot`; emits a boolean.
- `subscribeFollowing(uid, onData, onError)` — `where('follower', '==', uid)`; emits target uids.
- `subscribeFollowers(uid, onData, onError)` — `where('target', '==', uid)`; emits follower uids.

### `hooks/useFollowStatus.ts` — NEW
`useFollowStatus(targetUid: string | undefined): { isFollowing: boolean; loading: boolean; hasError: boolean; toggle: () => Promise<void> }` — subscribes to the single edge doc for (me → target); `toggle` awaits `followUser`/`unfollowUser` and rethrows so the caller can surface the failure. No-ops when signed-out or `targetUid` is self/undefined.

### `hooks/useConnections.ts` — NEW
`useConnections(uid: string | undefined): { connectionUids: string[]; loading: boolean; hasError: boolean }` — runs both subscriptions, intersects via `mutualConnections`. Loading until both first snapshots arrive; `hasError` if either errors.

### `components/MemberProfileCard.tsx` — MODIFY
Local `useState` toggle removed. New props: `isFollowing: boolean`, `onToggleFollow: () => void`, plus `showActions: boolean` (Follow + Message row hidden when viewing your own profile). Pure presentation; no Firebase imports.

### `app/(app)/member/[uid].tsx` — MODIFY
Wires `useFollowStatus(uid)` into the card; `showActions = user.uid !== uid`. A follow/unfollow write failure shows the existing `Banner` pattern.

### `app/(app)/(attender)/profile.tsx` — MODIFY
- Connections stat = `connectionUids.length` from `useConnections(user?.uid)`; shows `—` while loading or on error (never a silent fake `0`).
- The Connections stat becomes tappable → `router.push('/(app)/connections')`.

### `app/(app)/connections.tsx` — NEW screen
- Header "Connections" + back, matching existing detail screens.
- Rows: avatar (photo or initials fallback via `utils/avatar`), display name, neighborhood, chevron → `member/[uid]`.
- Each row resolves its profile via the existing `useProfile(uid)` in a per-row component; a row whose profile fails to load renders a neutral placeholder (list never crashes).
- Zero connections → friendly `EmptyState`; subscription error → error-variant `EmptyState` (existing patterns).

### `utils/badges.ts` + `app/(app)/badges.tsx` — MODIFY
- `computeBadges(attendedEvents, tier, connectionsCount: number)` — Connector: `earned: connectionsCount >= CONNECTOR_THRESHOLD` (constant = 3). Top rated / Host hero remain permanently locked.
- `badges.tsx` adds `useConnections(user?.uid)` and passes the count through.

### `firestore.rules` — MODIFY (manual deploy required)
```
match /follows/{followId} {
  allow read: if signedIn();
  allow create: if signedIn()
    && request.resource.data.follower == request.auth.uid
    && request.resource.data.target != request.auth.uid
    && followId == request.auth.uid + '_' + request.resource.data.target;
  allow delete: if signedIn() && resource.data.follower == request.auth.uid;
}
```
No `update` rule — an edge exists or it doesn't. Both the ID shape and the `follower` field are enforced, so nobody can forge a follow *from* someone else; followers lists, the Connections count, and the Connector badge are therefore unspoofable.

## Data flow

```
Follow:      MemberProfileCard tap ─► useFollowStatus.toggle ─► followUser / unfollowUser
                                                                  └► follows/{me_target}

Status:      subscribeFollowStatus(me, target) ─► button label Follow/Following

Connections: subscribeFollowing(me) ──┐
             subscribeFollowers(me) ──┴► mutualConnections() ─► profile.tsx stat
                                                              ─► connections.tsx list
                                                              ─► badges.tsx Connector badge
```

## Error handling & edge cases

- **Self-follow** — blocked at three layers: button hidden in UI, `followUser` throws, rules deny.
- **Double-tap follow** — idempotent `setDoc` on the deterministic ID; no duplicate edges possible.
- **Unfollow a non-existent edge** — `deleteDoc` on a missing doc is a no-op; harmless.
- **Follow write fails** (offline, rules) — button state reverts with the next snapshot (it renders subscription state, not optimistic local state); `Banner` shown on `member/[uid]`.
- **Connections read error** — `hasError` → profile stat renders `—`, connections screen renders error `EmptyState`; never silently swallowed.
- **Connection whose profile is missing/unreadable** — row renders a neutral placeholder; navigation still works (member screen has its own unavailable state).
- **Signed-out / undefined uid** — hooks return inert defaults, no subscriptions started.

## Testing

- **Unit (`utils/follows.ts`):** `followDocId` shape; `mutualConnections` on empty, disjoint, partial, full overlap, and order preservation.
- **Unit (`utils/badges.ts`):** Connector locked at 2, earned at 3; existing badges unaffected by the new param.
- **Service (`services/follows.test.ts`):** correct doc path/ID and payload for follow; delete path for unfollow; self-follow throws before any write; subscriptions map snapshots to uid arrays. Mirrors the existing Firestore-mock pattern in `services/*.test.ts`.
- **Hooks:** `useConnections` intersects live results, `loading` until both snapshots, `hasError` on either error; `useFollowStatus` toggle calls the right service fn and rethrows on failure. Mirrors existing hook-test patterns.
- **Rules (`firestore.rules.test.ts`):** owner creates own edge ✓; forged `follower` field ✗; mismatched doc ID ✗; self-follow ✗; owner deletes own edge ✓; deleting someone else's edge ✗; any signed-in read ✓.
- **Type/build:** `npx tsc --noEmit` clean; existing Jest suite stays green.
- **Manual smoke (2 accounts):** A follows B → button flips to Following and persists across restart; B follows A back → both see Connections = 1 and each other in the connections list; unfollow → connection disappears for both; third mutual connection → Connector badge unlocks.

## New dependencies & infra

- **No new packages.**
- **`firestore.rules` change → manual deploy required** (`firebase deploy --only firestore:rules`), same as sub-projects C and D.
- **No composite indexes.**

## Out of scope (v1)

- Follow notifications (push or in-app).
- A *followers* / *following* browse screen (only the mutual-connections list ships).
- Pagination on the connections list (client-side intersection is fine at current scale).
- Block-list enforcement on follows (the "Block or report" button is still a stub from Phase 1).
- Hoster-specific follow surfaces (venues are followed-by-proxy via events, not directly).
- Follower counts shown on other people's profiles (`MemberProfileCard` chips unchanged).
