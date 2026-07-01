# Points & Badges — Design Spec
_Date: 2026-07-01 · Phase 2, Sub-project D of 6_

## Context

Phase 2 connects the Phase-1 mock screens to live Firebase across six subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| A | User Profiles & Identity | done |
| B | Discover & Filters | done |
| C | Chat & Messaging | done |
| **D** | **Points & Badges** | **This spec** |
| E | Social graph (follows/connections) | later |
| F | Venue Announcements | later |

### Current state (before this work)
- **`(app)/badges.tsx`** — renders `MOCK_POINTS`, `MOCK_TIER`, `MOCK_NEXT_TIER`, `MOCK_PROGRESS`, `MOCK_BADGES`, `MOCK_REWARDS`; nothing persists.
- **`Profile` model** already has `points: number` and `tier: string` fields, defaulted to `0` / `'Newcomer'` at `createProfile`, but nothing ever changes them.
- **`firestore.rules`** already blocks any owner update to `profiles/{uid}` that touches `points`, `tier`, or `verified` — written ahead of this phase to keep those fields tamper-proof by default.
- **`event/[id].tsx`** has a local, unused `POINTS_PER_EVENT = 50` constant, shown as cosmetic "+50 points earned" text in `RegistrationConfirmation` — never written anywhere.
- **`services/events.ts`** — `registerForEvent` already fetches the profile doc (for photoURL/age/etc.) and batches a `profiles/{uid}.eventsCount` increment; `cancelRegistration` batches the symmetric decrement but does not read the profile first.
- **`profile.tsx`** computes an inline "Attended" stat via a local `useEffect` + `getMyRegisteredEvents`, filtering to `startsAt < now` — the only existing "real attendance" logic in the app.
- **`member/[uid].tsx`** and `MemberProfileCard` already read `profile.points` / `profile.tier` directly (built ahead of this phase) — they go live automatically once those fields are real.
- No Firebase Cloud Functions exist in this project; everything is client + Firestore rules.

## Goal

- Points are real, stored, and awarded the moment a user registers for an event (matching the existing "+50 points earned" confirmation copy — there is no check-in/attendance-verification mechanism, so registration is the only feasible award trigger).
- Cancelling a registration symmetrically revokes the points it earned.
- Tier (Newcomer / Regular / Insider) is derived from points and stored alongside them.
- The badge grid reflects real attendance history (past registered events), with three badges that depend on subsystems that don't exist yet (Connector, Top rated, Host hero) kept as permanently-locked roadmap placeholders.
- The Redeem section is real: tapping "Use" deducts points from the stored balance and logs the redemption.
- No mock data remains on the badges screen.

## Approach

**Points ride the same trusted batch that already exists for `eventsCount`.** `registerForEvent` and `cancelRegistration` already read/write the profile doc as part of a `writeBatch`; this phase adds `points: increment(±50)` and a freshly computed `tier` string to those same batches. No new reads beyond one added `getDoc` in `cancelRegistration` (registerForEvent already fetches the profile).

**Tier is a pure function of points, computed client-side, but still stored (not purely derived).** A new `utils/points.ts` holds `POINTS_PER_EVENT`, the tier thresholds, `tierForPoints(points)`, and `tierProgress(points)` (for the hero card's progress bar). Every write that changes `points` also sets `tier = tierForPoints(newPoints)` in the same batch, so the two fields never drift apart.

**Badges are computed live from real data, never stored.** A new `utils/badges.ts` takes the user's attended events (past registrations) + their tier and returns the 8-entry grid. A new `hooks/useAttendanceStats.ts` extracts the "past registered events" logic already written inline in `profile.tsx` (via the existing `getMyRegisteredEvents` service call) so both `profile.tsx` and `badges.tsx` share it instead of duplicating.

**Redemption reuses the same pattern as points-earning.** A new `redeemReward(uid, reward, currentPoints)` in `services/profiles.ts` batches a `points: increment(-cost)` + recomputed `tier` on the profile, plus a new document in `profiles/{uid}/redemptions/{id}` as an append-only log. The reward catalog itself is a hardcoded array (`constants/rewards.ts`), not a Firestore collection — there is no hoster-facing reward-management UI, and adding one is out of scope.

**Firestore rules move from "block entirely" to "bounded and self-consistent."** The existing rule blanket-denies any owner write touching `points`/`tier`/`verified`. This phase narrows it instead of removing it: `verified` stays fully locked (no legitimate client flow ever changes it); `points`/`tier` may change only when the point delta equals one of the four values a real action can produce (`+50` register, `-50` cancel, `-500`/`-800` the two fixed reward costs) **and** the resulting `tier` matches what that resulting point total should be, via a rules-side mirror of `tierForPoints`. This still allows a determined client to farm points by rapid register/cancel cycling (accepted trade-off — same trust level the app already extends to `eventsCount`/`registeredCount`), but blocks outright escalation like setting `points` to an arbitrary value in one write.

## Decisions (resolved during brainstorming)

- **Award trigger:** points are earned at registration time, not at verified attendance — there's no check-in feature to detect real-world attendance, and the existing confirmation UI already promises the points instantly.
- **Cancellation:** revokes the points symmetrically, mirroring the existing `eventsCount` increment/decrement pattern.
- **Tier:** stored (not purely derived), recomputed and written in the same batch as every points change.
- **Badge unlocks:** First event (1+ attended), 5 in a row (5+ attended total — a count milestone, not a true consecutive-week streak, since no such tracking exists; keeps the existing label/icon), Creative soul (3+ attended "Creative Arts" events), Night owl (1+ attended event starting at 9pm or later), Insider (tier === 'Insider'). Connector / Top rated / Host hero stay permanently locked (🔒) — they depend on the social graph (E), a ratings system (doesn't exist), and hoster-side attendance tracking (out of scope), respectively.
- **Reward catalog:** hardcoded (`Free drink at Cellar 9` – 500 pts, `$10 off any ticketed event` – 800 pts), not hoster-configurable. Each redemption writes a log entry; "Use" is disabled when the balance is insufficient.
- **Rules trust model:** bounded-delta + tier-consistency check, not a full open door — accepted as "good enough" given this is a client-only app with no backend, same spirit as existing counters.

## New / changed units

### `types/models.ts` — MODIFY / ADD
- `Profile.tier: string` → `Profile.tier: Tier` where `type Tier = 'Newcomer' | 'Regular' | 'Insider'`.
- `Reward { id: string; label: string; cost: number }`.
- `Redemption { id: string; rewardId: string; label: string; cost: number; redeemedAt: Timestamp }`.

### `constants/rewards.ts` — NEW
`REWARDS: Reward[]` — the two hardcoded catalog entries.

### `utils/points.ts` — NEW (pure, fully unit-tested)
- `POINTS_PER_EVENT = 50`.
- `tierForPoints(points: number): Tier` — thresholds: Newcomer < 500, Regular 500–1499, Insider 1500+.
- `tierProgress(points: number): { tier: Tier; nextTier: Tier | null; pointsToNext: number; progress: number }` — `nextTier`/`pointsToNext` are `null`/`0` and `progress` is `1` once at Insider (top tier, nothing further to show).

### `utils/badges.ts` — NEW (pure, fully unit-tested)
- `computeBadges(attendedEvents: CommunityEvent[], tier: Tier): Badge[]` — returns all 8 grid entries (5 computed from real data, 3 permanently locked).

### `hooks/useAttendanceStats.ts` — NEW
`useAttendanceStats(uid: string | undefined): { attendedEvents: CommunityEvent[]; loading: boolean }` — wraps the existing `getMyRegisteredEvents` service call, filtering to `startsAt < now`. Same loading/effect shape as `profile.tsx`'s current inline logic.

### `services/events.ts` — MODIFY
- `registerForEvent`: batch gains `points: increment(POINTS_PER_EVENT)` and `tier: tierForPoints(currentPoints + POINTS_PER_EVENT)` on the existing `profiles/{uid}` write (currentPoints read from the profile snapshot already fetched at the top of the function).
- `cancelRegistration`: adds one `getDoc` on `profiles/{uid}` to read current points, then batches `points: increment(-POINTS_PER_EVENT)` and the recomputed `tier` (clamped so points never goes below 0) alongside the existing `eventsCount` decrement.

### `services/profiles.ts` — MODIFY
- New `redeemReward(uid: string, reward: Reward, currentPoints: number): Promise<void>` — batch: `profiles/{uid}` gets `points: increment(-reward.cost)` + recomputed `tier`; `profiles/{uid}/redemptions/{new id}` gets `{ rewardId, label, cost, redeemedAt: serverTimestamp() }`.

### `app/(app)/badges.tsx` — MODIFY
- `useProfile(user.uid)` replaces `MOCK_POINTS`/`MOCK_TIER`/`MOCK_NEXT_TIER`/`MOCK_PROGRESS` (via `tierProgress(profile.points)`).
- `useAttendanceStats(user.uid)` + `computeBadges` replaces `MOCK_BADGES`.
- `REWARDS` constant replaces `MOCK_REWARDS`; "Use" calls `redeemReward`, disabled when `profile.points < reward.cost`, shows a `Banner` on failure (mirrors existing screens' error pattern).

### `app/(app)/(attender)/profile.tsx` — MODIFY
Replaces the local `attendedCount` `useState`/`useEffect` with `useAttendanceStats(user?.uid)`; "Attended" stat = `attendedEvents.length`. No visible behavior change.

### `app/(app)/event/[id].tsx` — MODIFY
Local `POINTS_PER_EVENT` constant removed in favor of the import from `utils/points.ts` (single source of truth now that it's actually written, not just displayed).

### `firestore.rules` — MODIFY (deploy required)
- `profiles/{uid}` update rule: `verified` stays fully blocked. `points`/`tier` may change only if `request.resource.data.points - resource.data.points` is one of `{50, -50, -500, -800}` and `request.resource.data.tier == tierFor(request.resource.data.points)` (a new rules helper mirroring `tierForPoints`'s thresholds).
- New `match /profiles/{uid}/redemptions/{id}`: `allow read, create: if signedIn() && request.auth.uid == uid` (no update/delete — append-only log).

## Data flow

```
Register:  registerForEvent ──► profiles/{uid} { eventsCount++, points+=50, tier=tierFor(points) }
Cancel:    cancelRegistration ──► profiles/{uid} { eventsCount--, points-=50, tier=tierFor(points) }
Redeem:    redeemReward ──► profiles/{uid} { points-=cost, tier=tierFor(points) }
                          └─► profiles/{uid}/redemptions/{id} (log entry)

Badges:    getMyRegisteredEvents ──► useAttendanceStats (filter past) ──► computeBadges(events, tier) ──► badges.tsx grid
Points UI: useProfile ──► tierProgress(points) ──► badges.tsx hero card
```

## Error handling & edge cases

- **Cancel before any profile doc exists** — can't happen in practice (registration requires a profile), but `cancelRegistration`'s new `getDoc` treats a missing profile as `currentPoints = 0` defensively.
- **Redeem with insufficient points** — "Use" button is disabled client-side; the batch is never attempted. (Rules don't independently re-check sufficiency beyond the fixed-delta whitelist — accepted, matches the existing trust level.)
- **Rapid register/cancel cycling** — bounded per-write but not rate-limited; explicitly accepted trade-off (see Approach).
- **Badge computation with zero attended events** — all 5 real badges render locked; no crash on an empty array.
- **Tier at max (Insider)** — `tierProgress` returns `nextTier: null`, `progress: 1`; the badges hero card shows a "top tier" state instead of "X pts to Y" when `nextTier` is `null`.
- **Read error on profile/attendance subscriptions** — mirrors existing `hasError` → `Banner`/`EmptyState` pattern; no crash.

## Testing

- **Unit (`utils/points.ts`):** `tierForPoints` at every boundary (499/500, 1499/1500); `tierProgress` fractions at low/mid/high points and the "already Insider" case.
- **Unit (`utils/badges.ts`):** each of the 5 real badges' earn/lock boundary (0, 1, 3, 5 attended; category filter; time-of-day filter); the 3 placeholder badges always locked regardless of input.
- **Hook test (`useAttendanceStats`):** filters to past events only, exposes `loading`, mirrors `useUpcomingEvents`/`useProfile` mock patterns.
- **Service tests (`services/events.test.ts`):** `registerForEvent` batch includes the new `points`/`tier` writes with correct computed values; `cancelRegistration` reads the profile then batches the symmetric decrement + recomputed tier.
- **Service tests (`services/profiles.test.ts`):** `redeemReward` batches the points decrement + tier recompute + redemption log entry with the right shape.
- **Rules tests (`firestore.rules.test.ts`):** replace the current blanket "owner cannot escalate points/tier" test with: a valid `+50`/matching-tier update succeeds; an arbitrary `points: 9999` (unmatched delta or mismatched tier) still fails; `verified` stays blocked; a redemption log create succeeds for the owner and fails for another uid.
- **Type/build:** `npx tsc --noEmit` clean; existing Jest suite stays green.
- **Manual smoke:** register for an event → points +50 and tier updates on the badges screen; cancel → points -50; redeem a reward with enough points → balance drops and the row reflects it; redeem attempt without enough points → button disabled; badges unlock as attendance criteria are met.

## New dependencies & infra

- **No new packages.**
- **`firestore.rules` change → manual deploy required** (`firebase deploy --only firestore:rules`), same as sub-project C.
- **No new composite indexes** (redemptions are read as a simple owner-scoped collection, no cross-field queries).

## Out of scope (v1)

- Real "streak" tracking for the "5 in a row" badge (consecutive-week attendance) — simplified to a total-count milestone.
- Connector, Top rated, Host hero badges — permanently locked until E (social graph), a ratings system, and hoster-side attendance tracking exist, respectively.
- Hoster-managed / dynamic reward catalog — the 2 rewards are hardcoded constants.
- Rate-limiting or server-side verification of point-earning actions (no Cloud Functions in this project).
- Displaying the redemption log/history anywhere in the UI (it's written for audit purposes but not surfaced).
- Points/tier changes from any source other than register/cancel/redeem (e.g. no admin adjustment tool).
