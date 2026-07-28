# The Third Space — Codemap
_Generated: 2026-07-28. Re-run `/update-codemaps` after major structural changes._

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 / React Native 0.81 (New Architecture enabled) |
| Language | TypeScript 5.7 |
| Navigation | expo-router v6 (file-based, Stack + Tabs, `typedRoutes: true`) |
| Backend / Auth | Firebase v11 (Auth + Firestore + Storage) |
| Cloud Functions | `functions/` workspace — push fan-out triggers (excluded from app tsconfig) |
| Auth Providers | Email/password, Apple Sign-In, Google OAuth |
| Push | expo-notifications + Expo Push API (sender lives in Cloud Functions) |
| Fonts | Poppins 400/500/600/700/800 (expo-google-fonts) |
| Styling | React Native StyleSheet + NativeWind |
| Storage | AsyncStorage (auth session persistence) |
| Tests | Jest (jest-expo) — 37 suites / 216 tests; `@firebase/rules-unit-testing` for rules |

**Firebase project**: `the-third-space-626e8` (see `.firebaserc`). App display name: "Your Third Space".

---

## Build Status (2026-07-28)

- `npx tsc --noEmit` — **clean**
- `npx jest` — **216/216 pass**, 37 suites
- **No mock data remains.** Phase 1 (UI), Phase 2 A–F (profiles, discover, chat, points, social, announcements), Phase 3 (push), and ID verification are all live-wired to Firestore.
- Firestore rules **have an undeployed fix** (conversations read on a non-existent doc). Deploy before testing DMs.
- Firebase rules otherwise **deployed**. Firebase **Storage is NOT provisioned** (free Spark plan) — photo uploads fail gracefully to colored-initials avatars.
- In flight (uncommitted): password strength + change-password + `authRoute` guard extraction.

---

## Source Tree

```
thirdspace-app/
├── firebase/config.ts        # Firebase init; exports auth, db, storage
├── types/models.ts           # All shared TypeScript types
├── hooks/                    # 14 hooks
│   ├── useAuth.ts              # Auth state + live role/profile subscriptions
│   ├── useGoogleAuth.ts        # Google OAuth (placeholder client id if unset)
│   ├── useProfile.ts           # profiles/{uid} subscription
│   ├── useVenue.ts             # venues/{uid} subscription (hasError flag)
│   ├── useUpcomingEvents.ts    # Live event feed
│   ├── useDiscoverFilters.ts   # Module store (useSyncExternalStore) for filters+query
│   ├── useChatList.ts          # Group + DM threads, unified
│   ├── useThreadMessages.ts    # Messages for one thread
│   ├── useMessageRequests.ts   # Pending DM requests
│   ├── useFollowStatus.ts      # Follow edge status for one target
│   ├── useConnections.ts       # Mutual connections (following ∩ followers)
│   ├── useAttendanceStats.ts   # Points/tier/events attended
│   ├── usePushRegistration.ts  # Expo push token register + deep-link on tap
│   └── useUserLocation.ts      # Module store (useSyncExternalStore) for location resolution
├── services/                 # 11 services
│   ├── auth.ts                 # changePassword (reauth then update)
│   ├── preferences.ts          # onboarding opt-ins (AsyncStorage)
│   ├── events.ts               # Event CRUD + registrations + subscriptions
│   ├── venues.ts               # saveVenue, getVenue
│   ├── profiles.ts             # Profile CRUD, points, redemptions, submitVerification
│   ├── photos.ts               # Firebase Storage uploads (degrade on failure)
│   ├── chat.ts                 # Group chats + DMs + read state
│   ├── follows.ts              # Follow edge writes + subscriptions
│   ├── announcements.ts        # sendAnnouncement (batch), subscribeAnnouncements
│   ├── pushTokens.ts           # users/{uid}/pushTokens CRUD
│   └── location.ts             # detectBorough() (5s timeout, never throws)
├── components/               # 22 components + components/ui/ design primitives
├── constants/                # design.ts (DESIGN TOKENS — the only file with colors), categories, filters, rewards
├── utils/                    # 15 pure modules (all unit-tested)
├── functions/src/            # Cloud Functions: sendPush, recipients,
│                             #   onNewDirectMessage, onNewFollow, onNewAnnouncement
├── firestore.rules           # deployed, EXCEPT the pending conversations-read null guard
├── storage.rules             # NOT deployed (Storage not provisioned)
└── app/                      # expo-router routes (36 files)
    ├── _layout.tsx             # Fonts + useAuth + AuthRedirect guard
    ├── index.tsx               # Immediate redirect
    ├── (auth)/
    │   ├── onboarding.tsx      # Home base for any not-fully-set-up account
    │   ├── sign-in.tsx  sign-up.tsx  forgot-password.tsx
    │   ├── role-select.tsx     # Writes users/{uid}.role
    │   └── create-profile.tsx  # Attenders only; writes profiles/{uid}
    └── (app)/
        ├── _layout.tsx         # Stack; create-event/filters/message-requests are modals
        ├── index.tsx           # Redirects to role sub-group
        ├── (attender)/         # Tabs: Discover | My Events | Chats | Profile
        │   ├── index.tsx  my-events.tsx  chats.tsx  profile.tsx
        ├── (hoster)/           # Tabs: Overview | Events | Venue
        │   ├── index.tsx  events.tsx  venue.tsx
        │   └── announcement/[id].tsx   # href: null (not a tab)
        ├── event/[id].tsx      # Detail + register/unregister + announcement banner
        ├── chat/[id].tsx       # Unified group+dm via `kind` route param
        ├── member/[uid].tsx    # Public profile + Follow + Message
        ├── guest-list/[id].tsx # Who's going (gated)
        ├── create-event.tsx  venue-setup.tsx  edit-profile.tsx
        ├── filters.tsx  connections.tsx  badges.tsx
        ├── borough-picker.tsx  # Borough selection modal (Discover → location override)
        ├── message-requests.tsx  message-privacy.tsx
        ├── settings.tsx  change-password.tsx
        ├── become-host.tsx  verify-identity.tsx
```

---

## Design System (two-tone orange ticket / Antonio)

Source comp: `docs/events-redesign-mockup.html`. Spec + plan:
`docs/superpowers/specs/2026-07-25-antonio-ticket-redesign-design.md`,
`docs/superpowers/plans/2026-07-25-antonio-ticket-redesign.md`.
**`constants/design.ts` is the only file in which a color may be written.**

| Token | Value | Use |
|-------|-------|-----|
| `orangeDeep` | `#F3B27A` | Browse/list screen background |
| `orangeLight` | `#FCE3C0` | Ticket / card fill, tab bar, inputs |
| `cream` | `#FBF3E9` | Forms, chat threads, all `(auth)` routes |
| `ink` | `#2B2015` | Headings; also the one high-contrast surface (CTAs, heroes) with cream text |
| `inkSoft` | `#584C3C` | Secondary text. Comp's `#5C4F3F` was 4.33:1 on deep — under AA |
| `clay` | `#853615` | Accent + "error" semantics. Comp's `#C4501F` was 2.54:1 on deep |
| `sage` | `#49513E` | Meta accent + "success" semantics. Comp's `#6E7A5E` was 2.49:1 |
| `rule` | `rgba(43,32,21,0.20)` | Dashed tear lines, hairline borders |

- **No literal hex anywhere under `app/` or `components/`** — enforced by
  `__tests__/constants/tokens.test.ts`, whose allowlist is now empty. Changing a token
  really does repaint the app.
- **White never appears on orange** (1.83:1). Ink-on-orange, cream-on-ink.
- **No red/green in the palette.** Error → `clay`, success → `sage`; both are AA on all
  three surfaces. The password meter conveys its four levels by filled-segment count.
- **No gradients.** Depth comes from tone (ink vs orangeLight vs cream), not blending.
- **Ticket notches are for event surfaces only** — `EventCard`, `CompactEventRow`, and the
  `event/[id]` hero. `ChatRow` deliberately has none.
- **Avatar tints are the one deliberate palette exemption** (`utils/avatar.ts`) — they
  encode identity. Guarded separately by `__tests__/components/contrast.test.ts`.
- **Fonts** — Antonio 600/700 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
  Uppercase is a token (`eyebrow`, `stubDay`), never an inline `textTransform`.

### `components/ui/` primitives

`Screen` (tone: deep|cream), `Display`/`Body`/`Meta` (one type face each, role unions
narrowed per face), `TicketCard` (tear line + tone-matched notches), `ChipRow`, `CityChip`,
`IconButton`, `BackButton`.

- **`BackButton` is the only back affordance** — every pushed screen uses it, so the arrow
  looks and behaves the same everywhere. It falls back to `router.replace(fallbackHref)`
  when `canGoBack()` is false, which matters because push notifications `router.push()`
  straight into `chat/[id]`, `event/[id]` and `member/[uid]`: on a cold start from a
  notification those screens have no history and a bare `back()` is a dead button.
- **Tab roots and setup gates deliberately have none.** The 7 tab screens have no back
  destination, and `role-select` / `create-profile` / `venue-setup` are forward-only
  steps guarded by `resolveAuthRoute` — a back there would fight the auth redirect.

---

## Auth & Routing

`hooks/useAuth.ts` returns `{ user, role, hasProfile, loading }`. It subscribes **live** (not one-shot) to
`users/{uid}` and `profiles/{uid}` so writes from role-select / create-profile reflect immediately;
`loading` clears only once both first snapshots (or errors) arrive.

Routing decisions are a **pure function**: `utils/authRoute.ts → resolveAuthRoute(state)` returns a target
href or `null` to stay put. `AuthRedirect` in `app/_layout.tsx` is a thin effect wrapper around it.

```
setupComplete = hasUser && role && (role !== 'attender' || hasProfile)

setupComplete        → '/(app)' unless already in (app)
!hasUser             → '/(auth)/onboarding' unless already in (auth)
signed in, no role   → next step 'role-select'
signed in, no profile→ next step 'create-profile'   (attenders only)
```

**Principle**: onboarding is home base for any account that isn't fully set up. Setup steps are reached by
*forward* navigation — never dumped on the user at cold start. Onboarding is an allowed resting place even
when signed in with setup incomplete.

---

## Firestore Collections

| Path | Shape | Notes |
|------|-------|-------|
| `users/{uid}` | `{ role }` | Written by role-select |
| `users/{uid}/pushTokens/{token}` | Expo push token | Pruned on dead-token response |
| `users/{uid}/chatReads/{threadId}` | `{ readCount, muted }` | Drives unread + mute |
| `profiles/{uid}` | `Profile` | Includes points, tier, verified, messagePrivacy |
| `profiles/{uid}/redemptions/{id}` | `Redemption` | Append-only log |
| `venues/{uid}` | `Venue` | Keyed by hoster uid — 1:1 |
| `events/{eventId}` | `CommunityEvent` | `cancelled: true` rather than deleted |
| `events/{id}/registrations/{uid}` | `Registration` + profile snippet | |
| `events/{id}/announcements/{id}` | `Announcement` | Read: chat members. Create: event owner |
| `eventChats/{eventId}` | `EventChatMeta` | Lazily created on first message |
| `eventChats/{id}/messages/{id}` | `Message` | Membership = registrant OR hoster |
| `conversations/{convId}` | `Conversation` | convId = sorted uid pair |
| `conversations/{id}/messages/{id}` | `Message` | Participant-gated incl. delete |
| `follows/{follower_target}` | `Follow` | One edge doc; no counters |

---

## Key Invariants & Gotchas

- **Location resolves through a chain, never blocks** — `hooks/useUserLocation.ts` is a module
  store (like `useDiscoverFilters`, because the picker is a separate route from Discover) that
  resolves `manual > gps > profile > default`. `services/location.ts` never throws: opt-out,
  denial, GPS failure, a 5s timeout and non-NYC locations all resolve to `null` and fall through.
- **`CommunityEvent.borough` is optional and that is load-bearing** — events created before
  location filtering have none, and `filterByBorough` shows those in EVERY borough rather than
  hiding them. Making it required needs a backfill first.
- **The feed widens rather than emptying** — a borough with no events falls back to all of NYC
  with an on-screen explanation, so the entry screen is never blank.
- **A manual borough pick is permanent until changed** — GPS never silently overrides it, and
  "All of NYC" is a real stored choice (`{ borough: null }`), distinct from never having chosen.
- **Venue keyed by uid** — `venues/{uid}` uses the hoster's UID as doc id. 1:1 hoster → venue.
- **Denormalized event fields** — `venueName` + `neighborhood` copied at creation so cards render
  without a join. `borough` intentionally NOT copied; feed filters by category/search only.
- **`registeredCount` is an atomic counter** — `increment()` inside a batch alongside the registration doc.
  Rules use `registersSelf`/`unregistersSelf` + `existsAfter` to gate it.
- **Cancelled events stay in Firestore** — `cancelled: true`; `subscribeUpcomingEvents` filters server-side,
  `my-events.tsx` prunes client-side.
- **Delete is batched** — `deleteEvent` batches in chunks of 400 (Firestore limit).
- **Connections are computed client-side** — intersection of following ∩ followers. No counters, no
  Cloud Functions. Connector badge unlocks at 3 mutuals.
- **Rules that dereference `resource.data` must guard `resource == null`** — a read of a doc that does
  not exist yet evaluates the rule with `resource == null`, and dereferencing it throws → PERMISSION_DENIED
  rather than an empty snapshot. `conversations` read allows `resource == null` so the first DM can probe
  `getDoc` before creating the request. Same trap applies to any future collection read before create.
- **DM create is two sequential writes, not a batch** — rules `get()` sees pre-batch state, so batching
  conversation-create + first message gets denied. Conversation first, then message.
- **Discover filtering is entirely client-side** over one subscription — no composite indexes anywhere in
  this app. All Firestore queries use single-field `where` only.
- **`verified` is owner-set (simulated)** — `verify-identity.tsx` captures ID + selfie **on-device, never
  uploaded**, then `submitVerification` sets `profiles/{uid}.verified` from the client. Rules permit this
  because there is no real KYC. Skippable, attenders-only. Move to server-set if real KYC lands.
- **Storage is not provisioned** — free Spark plan. `services/photos.ts` failures are caught; `photoURL`
  falls back to `null` and `utils/avatar.ts` renders deterministic colored initials.
- **No `expo-blur`** — blur effects faked with semi-transparent overlays to avoid a native rebuild.
- **Dynamic routes use object form** — `router.push({ pathname: '/(app)/x/[id]', params })`. The typedRoutes
  generator races the dev server and transiently drops the string-template form for new routes.
- **Typed routes go stale when route files are added** — run `npx expo start` ~25s, kill it, then `tsc`.
- **Env vars** — all `EXPO_PUBLIC_FIREBASE_*` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. `.env` is gitignored;
  `.env.example` lists the keys.
- **Google OAuth placeholder** — unset client id would be `undefined` and crash the auth screen, so
  `useGoogleAuth` substitutes `'google-auth-not-configured'`; it is never sent to Google.

---

## Commands

| Task | Command (from `thirdspace-app/`) |
|------|----------------------------------|
| Dev server | `npx expo start` |
| Unit tests | `npx jest` |
| Rules tests | `npm run test:rules` (needs Firebase CLI + Java) |
| Typecheck | `npx tsc --noEmit` |
| Deploy rules | `npx firebase-tools deploy --only firestore:rules` |
