# User Profiles & Identity — Design Spec
_Date: 2026-06-25 · Phase 2, Sub-project A of 6_

## Context

Phase 1 translated the Claude Design mockup into RN/Expo screens using per-screen `MOCK_*` data. Phase 2 connects those screens to live Firebase data. "Connect everything" spans six independent backend subsystems:

| # | Subsystem | Status |
|---|-----------|--------|
| **A** | **User Profiles & Identity** | **This spec** |
| B | Discover & Filters | later |
| C | Chat & Messaging | later |
| D | Points & Badges | later |
| E | Social graph (follows/connections) | later |
| F | Venue Announcements | later |

Each subsystem gets its own spec → plan → implementation cycle. **A is foundational** — most other screens read profile data — so it goes first.

### Current backend (before this work)
- `users/{uid}` → `{ role, registeredEventIds }`; readable/writable by owner only.
- `venues/{uid}` → venue fields; public read, owner write.
- `events/{eventId}` → public read; `registrations/{uid}` readable by registrant or event owner only.
- No Cloud Functions. No Firebase Storage. All logic is client SDK + security rules.

## Goal

Make every profile/identity surface real:
- Sign-up profile creation writes a real profile (photo, bio, interests, neighborhood, DOB).
- Profile self-view, Member (`[uid]`) profile, guest list, and event "who's going" read real profile/registration data.
- A new Edit Profile screen lets users change everything later.
- Real photo upload via Firebase Storage.

No mock data remains on these screens. Fields owned by later subsystems (points, tier, connections) render real, neutral defaults until D/E populate them.

## Approach

**Pure client SDK + security rules + denormalized counters. No Cloud Functions** (consistent with the existing codebase; Functions are deferred to sub-project D where server-authoritative points are genuinely required).

## Data model

### `profiles/{uid}` — NEW public collection
Any signed-in user can read; only the owner writes.

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | from the auth account |
| `photoURL` | string \| null | Storage download URL |
| `vibePhotos` | string[] | 0–3 Storage URLs |
| `bio` | string | ≤300 chars |
| `interests` | string[] | ≥3 (enforced at sign-up) |
| `neighborhood` | string | |
| `borough` | Borough | reuse existing `Borough` union |
| `age` | number | derived from DOB at write time (display only) |
| `eventsCount` | number | default 0; denormalized, ± on register/cancel |
| `points` | number | default 0; sub-project D populates |
| `tier` | string | default `'Newcomer'`; sub-project D |
| `verified` | boolean | default false; cosmetic — real ID-verification is future |
| `joinedAt` | Timestamp | `serverTimestamp()` at creation |

### `users/{uid}` — stays private (owner-only)
Gains `birthdate: Timestamp` (kept private for future 18+/21+ age-gating; public `age` is derived from it). Keeps `role`, `registeredEventIds`.

### `venues/{uid}`
Gains `eventsCount: number` (denormalized; ± in `createEvent`/`deleteEvent`) so the guest-list "Hosting · N events" line is real.

### `events/{eventId}/registrations/{uid}`
Gains a **denormalized profile snippet** written from the registrant's own profile at registration time, so the guest list renders without N profile reads:
`{ displayName (existing), photoURL, age, neighborhood, interestsPreview: string[] }`.

> **Staleness:** the snippet is not refreshed if the user later edits their profile; it updates on next registration. Accepted for v1.

## Security rules

Added to `firestore.rules`:

```
match /profiles/{uid} {
  allow read: if signedIn();
  allow create: if signedIn() && request.auth.uid == uid;
  // Owner may edit content fields, but not verified / points / tier
  // (prevents self-tampering before sub-project D makes points authoritative).
  allow update: if signedIn() && request.auth.uid == uid
    && !request.resource.data.diff(resource.data)
         .affectedKeys().hasAny(['verified', 'points', 'tier']);
}
```

`events/{eventId}/registrations/{uid}` read is relaxed to add **co-attendee** access:
```
allow read: if signedIn() && (
  request.auth.uid == uid ||
  isEventOwner(eventId) ||
  exists(/databases/$(database)/documents/events/$(eventId)/registrations/$(request.auth.uid))
);
```
Non-registered users see only the public `registeredCount` on the event doc → the "register to unlock" blur gate.

`users/{uid}` and its new `birthdate` stay under the existing self-only rule.

### Firebase Storage rules — NEW `storage.rules`
```
match /profilePhotos/{uid}/{file} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.uid == uid
    && request.resource.size < 5 * 1024 * 1024
    && request.resource.contentType.matches('image/.*');
}
```

## Services & hooks

### `services/profiles.ts` — NEW
- `createProfile(uid, data)` — when the attender finishes `create-profile`; batched with the `users/{uid}` `birthdate` write.
- `updateProfile(uid, partial)` — Edit Profile screen.
- `subscribeProfile(uid, cb, onErr)` — realtime (self).
- `getProfile(uid)` — one-shot (viewing others).

### `hooks/useProfile.ts` — NEW
`useProfile(uid)` → `{ profile, loading, hasError }`. Realtime when `uid` is the current user; one-shot `getProfile` otherwise. Mirrors `useVenue` (incl. the `hasError` flag distinguishing "absent" from "read failed").

### `services/photos.ts` — NEW (Firebase Storage)
- `pickImage(aspect)` — `expo-image-picker` with crop (avatar square, vibe 4:5).
- `uploadProfilePhoto(uid, kind, uri)` — compress/resize → upload to `profilePhotos/{uid}/…` → return download URL.
- New dependency: **`expo-image-picker`**. `firebase/config.ts` initializes Storage (`getStorage`).
- Upload has its own progress/spinner state; failure is non-blocking (retry; profile saves without changing `photoURL`).

### `hooks/useAuth.ts` — extended
Also surfaces `hasProfile` (does `profiles/{uid}` exist) so `AuthRedirect` can route profile-less users to `create-profile`. Minimal change to the auth/routing core; covered by tests.

### `services/events.ts` — extended (no new functions)
- `registerForEvent` batch also `increment(+1)` on `profiles/{uid}.eventsCount` and writes the registration snippet (reads the registrant's own profile first).
- `cancelRegistration` batch `increment(-1)` on `profiles/{uid}.eventsCount`.
- `createEvent` / `deleteEvent` `increment(±1)` on `venues/{venueId}.eventsCount`.

### `utils/profile.ts` — NEW
- `ageFromDOB(date)` — DOB → integer age.

## Screen wiring

| Screen | Change |
|--------|--------|
| Sign-up profile step | **Promoted to a dedicated, attender-only `(auth)/create-profile` route that runs _after_ role-select.** The profile (bio/interests/vibe photos/neighborhood/age) is an attender concept — hosters set up a venue instead — so it is gated to `role === 'attender'`. `sign-up.tsx` reverts to account-only (the Phase 1 inline "Step 2 of 3" profile step is removed). Collects photo + vibe + bio + interests **+ neighborhood/borough + DOB**. On Continue → `createProfile()` + `users.birthdate`, then enters the app. This guarantees every attender (email **and** Google/Apple) completes a profile. |
| Edit Profile | **New `(app)/edit-profile` route**, wired to the existing "Edit profile & photos" button. Loads `useProfile(self)`, edits all fields incl. photos, saves via `updateProfile()`. |
| Profile self-view | `MOCK_STATS`/`MOCK_NEIGHBORHOOD` → `useProfile(self)`. `attended` = past count from `registeredEventIds` (client); `hosted` = 0; `connections` = 0; `points`/`tier` from profile. Real name/photo/neighborhood/interests. |
| Member `[uid]` | `MOCK_MEMBER` → `getProfile(uid)`. Real bio/interests/photos/age/neighborhood; tier/points chips show defaults; `eventsCount` real. Follow / Message-request remain inert (E/C) — noted in-screen. |
| Guest list `[id]` | `MOCK_*` → real registrations (co-attendee rule) rendered from the denormalized snippet; host section reads `venues/{venueId}.eventsCount`. Avatars fall back to initials when `photoURL` is null. |
| Event detail "who's going" | Registered users see real attendee avatars (from registration snippets) + "See all →"; non-registered keep the count-only blur gate. Mock seeds removed. |

**Routing guard (`AuthRedirect`):**
```
!user                                          → onboarding
user && !role                                  → role-select
user && role === 'attender' && !hasProfile     → create-profile
user && role === 'hoster'                      → app  (existing (hoster) layout gates venue-setup)
else                                           → app
```
Role is resolved first; the attender profile gate sits just before an attender enters the app. Hosters never hit `create-profile` — their setup is `venue-setup` (unchanged). `useAuth` exposes `hasProfile` to drive this.

**Out of scope (noted):** onboarding's "1,240 in Brooklyn" stays a static decorative number; Follow/DM actions belong to sub-projects E/C.

## Error handling & edge cases

- **Existing Phase 1 attenders** (role `attender`, no profile) → routed to `create-profile` on next launch. No manual migration. (Existing hosters are unaffected — they have no attender profile.)
- **Abandoned create-profile** (auth + role set, profile step closed) → same guard re-routes the attender to `create-profile`.
- **Photo upload failure** → non-blocking; retry; profile saves with existing `photoURL`.
- **Min age** → DOB picker enforces 18+ at sign-up.
- **Snippet staleness** → guest-list entry refreshes on next registration (accepted).
- **Co-attendee read** → cancelling a registration drops guest-list access (expected).
- **Counters** → updated inside atomic batches; cannot half-update.

## Testing

- **Unit:** `profiles` service, `ageFromDOB`, `useProfile` (self-realtime vs other-one-shot), counter increments.
- **Rules tests:** other user can read a profile but not write it; update cannot change `verified`/`points`/`tier`; co-attendee can read registrations, non-attendee cannot.
- **Integration:** register → `eventsCount` ++ and snippet written; cancel → `eventsCount` −−.
- **Manual smoke:** signup → create-profile → app; edit-profile round-trip; member profile; guest list real attendees; who's-going gate. Existing 35 tests stay green (Phase 1 components unchanged).

## New dependencies & infra

- `expo-image-picker` (npm).
- Firebase Storage enabled + `storage.rules` deployed.
- `firestore.rules` updated (profiles + registrations co-attendee read).

## Out of scope for this sub-project

- Points/tier computation (sub-project D) — defaults only here.
- Follows / connections count (sub-project E) — renders 0 here.
- Real ID verification / KYC — `verified` is cosmetic.
- Chat/DM actions (sub-project C).
- Onboarding live member count.
