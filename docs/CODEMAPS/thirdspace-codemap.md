# The Third Space — Codemap
_Generated: 2026-08-06. Re-run `/update-codemaps` after major structural changes._

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
| Fonts | Bebas Neue 400 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta (expo-google-fonts) |
| Styling | React Native StyleSheet + NativeWind |
| Storage | AsyncStorage (auth session persistence) |
| Vector | react-native-svg 15.12.1 — reward mascots only; bundled in Expo Go, no local rebuild |
| Media | expo-image-picker + expo-video (playback) + expo-video-thumbnails (posters) + expo-image-manipulator (compression) — all bundled in Expo Go, no config plugin, no rebuild |
| Tests | Jest (jest-expo) — 69 suites / 559 tests; `@firebase/rules-unit-testing` for rules (52/52) |

**Firebase project**: `the-third-space-626e8` (see `.firebaserc`). App display name: "Your Third Space".

---

## Build Status (2026-08-11)

- `npx tsc --noEmit` — **clean**
- `npx jest` — **559/559 pass**, 69 suites
- `npm run test:rules` — **52/52 pass** (38 Firestore + 14 Storage)
- `cd functions && npx jest` — **23/23 pass**, 9 suites
- **No mock data remains.** Phase 1 (UI), Phase 2 A–F (profiles, discover, chat, points, social, announcements), Phase 3 (push), and ID verification are all live-wired to Firestore.
- Firestore rules are **deployed** as of 2026-09-03 — the conversations read on a non-existent doc, the
  `profiles/{uid}/private/socials` mutual-follow gate and the write-once `role` split on `users/{uid}`
  all went out together via `npx firebase-tools deploy --only firestore:rules` (run from
  `thirdspace-app/`). So DMs, the Socials section and the handle editor all behave on device now.
- Media uploads (profile avatar + vibe, event cover, venue gallery, chat attachments) are **code-complete
  and untestable on device**: the bucket `the-third-space-626e8.firebasestorage.app` does not exist yet.
  Someone must click Firebase Console → Build → Storage → Get started. Until then every upload fails and
  degrades — `utils/avatar.ts` renders colored initials, `TicketCard` draws its "No photo yet" band, and
  the vibe/venue/cover slots stay empty.
- `storage.rules` is written and emulator-tested but **not deployed**. It ships with the two pending
  Firestore changes: `npx firebase-tools deploy --only firestore:rules,storage`.

---

## Source Tree

```
thirdspace-app/
├── firebase/config.ts        # Firebase init; exports auth, db, storage
├── types/models.ts           # All shared TypeScript types
├── hooks/                    # 17 hooks
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
│   ├── useUserLocation.ts      # Module store (useSyncExternalStore) for location resolution
│   ├── useSocials.ts           # Instagram/TikTok/X handles for mutual-follow gated profiles
│   └── useReduceMotion.ts      # OS reduce-motion flag; defaults to true while probing
├── services/                 # 13 services
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
│   ├── location.ts             # detectBorough() (5s timeout, never throws)
│   └── cloudPromptsSeen.ts     # Which cloud prompts a device has shown (AsyncStorage, per uid)
├── components/               # 26 components + 7 under components/ui/ design primitives
│   ├── AmbientBackdrop.tsx     # App-wide animated field; mounted by Screen
│   ├── Mascot.tsx              # Generic renderer for the 25 reward figures (react-native-svg)
│   ├── RewardUnlock.tsx        # The unlock ceremony — purple void, rays, halos, motes
│   ├── RewardWatcher.tsx       # Fires the ceremony app-wide; mounted in the attender tabs
│   ├── RewardGrid.tsx          # Roster grid, earned + locked
│   ├── CloudPrompt.tsx         # The buttery-gold thought cloud — comet trail, overshoot landing
│   └── CloudPromptWatcher.tsx  # Raises one per route entry; mounted in BOTH tab layouts
├── constants/                # design.ts (DESIGN TOKENS — nearly the only file with colors),
│                             #   categories, filters, rewards (redeemables),
│                             #   achievements.ts (roster meta + prompts),
│                             #   mascotFigures.ts (the 25 figures as data),
│                             #   cloudPrompts.ts (the prompt catalogue — coaching + nudges)
├── utils/                    # 20 pure modules (all unit-tested)
├── functions/src/            # Cloud Functions: sendPush, recipients,
│                             #   onNewDirectMessage, onNewFollow, onNewAnnouncement
├── firestore.rules           # Deployed 2026-09-03: conversations guard + socials gate + write-once role
├── shared/mediaLabel.ts      # The ONE attachment label. Zero imports — compiled by BOTH workspaces
├── storage.rules             # All four media surfaces. Emulator-tested, NOT deployed (no bucket yet)
└── app/                      # expo-router routes (37 files)
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
        ├── verify-identity.tsx
```

---

## Design System (two-tone orange ticket / Bebas Neue)

Source comp: `docs/events-redesign-mockup.html`. Spec + plan:
`docs/superpowers/specs/2026-07-25-antonio-ticket-redesign-design.md`,
`docs/superpowers/plans/2026-07-25-antonio-ticket-redesign.md`.
**`constants/design.ts` is the only file in which a color may be written.**

| Token | Value | Use |
|-------|-------|-----|
| `orangeDeep` | `#F3B27A` | Top stop of the app-wide ambient field |
| `orangeLight` | `#FCE3C0` | Bottom stop of the field; ticket / card fill, tab bar, inputs |
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
- **The ambient field is the app's background, and it is the only gradient.** Source comp:
  `docs/ambient-background-splash-and-home.html`. `components/AmbientBackdrop.tsx` renders
  orangeDeep → orangeLight with five warm glows drifting through it and five twinkling
  sparks. Every *surface above it* — tickets, sheets, the tab bar, the cream veil — is
  still flat tone, so "depth comes from tone, not blending" still holds everywhere except
  the background itself.
- **Ticket notches are for event surfaces only** — `EventCard`, `CompactEventRow`, and the
  `event/[id]` hero. `ChatRow` deliberately has none.
- **Avatar tints are the one deliberate palette exemption** (`utils/avatar.ts`) — they
  encode identity. Guarded separately by `__tests__/components/contrast.test.ts`.
- **Fonts** — Bebas Neue 400 display, Inter 400/500/600 body, IBM Plex Mono 500/600 meta.
- **Every type role is uppercase, app-wide** — chrome and user-written content alike,
  including text being typed into a field. It is a token on all ten roles in
  `constants/design.ts`, never an inline `textTransform`. The transform is
  display-only: stored values and the accessibility tree keep the casing the user
  typed, so backing caps off long-form copy later is a one-line change per role.
  The single exception is `FormInput`'s password field, which sets
  `textTransform: 'none'` so the Show toggle cannot misrepresent a credential.
  See `docs/superpowers/specs/2026-08-02-uppercase-typography-design.md`.
- **The display face has ONE weight and no lowercase.** `font.display` is deliberately a
  single key — a second key pointing at the same file would imply a weight axis Bebas does
  not have. Hierarchy inside the display face comes from size alone, and every display
  string (screen titles, event names, member names, tab labels) renders uppercase. That is
  the intent, not a bug. `__tests__/constants/design.test.ts` guards both properties.

### `components/ui/` primitives

`Screen` (tone: deep|cream — deep shows the field bare, cream veils it), `Display`/`Body`/`Meta` (one type face each, role unions
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

**Role is chosen once, at `role-select`, and never again.** There is no switching: an account is an
attender or a hoster for its whole life, and somebody who wants to host signs up a second account. The
enforcement is `firestore.rules` — `users/{uid}` splits `create` from `update`, and an update whose
post-write `role` differs from the stored one is denied. `become-host.tsx` and the attender My Events
"Hosting" tab were both deleted rather than hidden, since neither could ever do anything again.
Accounts that switched before this landed keep `role: 'hoster'` and an orphaned `profiles/{uid}`;
that was a deliberate call not to migrate.

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
| `profiles/{uid}/private/socials` | `SocialHandles` | Instagram/TikTok/X. Read gated on a proven mutual follow |
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

## Storage Layout

Every path is produced by `utils/media.ts` `mediaPath()`/`thumbPath()`, and `storage.rules`
matches the **filename**, not just the prefix. The two must agree exactly — a path the rules
do not recognise is a permission-denied at runtime, and a prefix-only rule would turn every
member's folder into unbounded free hosting.

| Path | Holds | Writable by |
|------|-------|-------------|
| `profilePhotos/{uid}/avatar.jpg` | Image only | `uid` |
| `profilePhotos/{uid}/vibe[0-2]` (+`_thumb`) | Image or video | `uid` |
| `eventCovers/{hosterUid}/{eventId}/cover` (+`_thumb`) | Image or video | `hosterUid` |
| `venuePhotos/{uid}/[0-5]` (+`_thumb`) | Image or video | `uid` |
| `chatMedia/{authorUid}/{threadId}/{messageId}` (+`_thumb`) | Image or video | `authorUid` |

Reads are `signedIn()` everywhere. Caps: images **under** 5 MB, video **under** 50 MB, both
strict inequalities matching `IMAGE_MAX_BYTES`/`VIDEO_MAX_BYTES` exactly.

---

## Key Invariants & Gotchas

- **`MediaAsset.thumbURL` is ALWAYS populated, and that is what buys one render path** —
  for a photo it IS the image; for a clip it is a generated poster frame. So every surface
  draws exactly one thing and adds a play badge only when `type === 'video'`. The third
  case, `thumbURL === ''`, means poster generation failed on device: `MediaThumb` draws a
  flat ink tile with the badge rather than a broken image. There is deliberately no
  "processing" state — uploads are synchronous from the client.
- **`components/MediaThumb.tsx` is the only way media is drawn, and `MediaViewer` the only
  way it plays** — nothing autoplays inline, which is what keeps a video-capable
  `EventCard` in a scrolling feed as cheap as an image-only one. Four surfaces share both
  so they cannot drift into four slightly different play buttons.
- **`services/media.ts` is the only module that touches Firebase Storage** — and
  `storage.rules` is the only real enforcement. The client caps are a courtesy.
- **Cheap checks run before the file is materialised** — the Firebase JS SDK has no
  streaming upload on React Native, so `fetch(uri).blob()` pulls the whole file into JS
  memory. A 200 MB clip must be rejected from its picker metadata or it is a crash, not an
  error message. `uploadMedia` checks `fileSize`/`durationMs` first for exactly this.
- **Video duration is NOT enforceable in `storage.rules`** — rules see only `size` and
  `contentType`, never media metadata. The 60s cap is a product constraint checked
  client-side; the size ceiling is the only real backstop.
- **Chat media is readable by any signed-in member — a known, asserted limitation** —
  Storage rules cannot `get()` a Firestore document, so a DM attachment cannot be gated on
  conversation membership. It is protected by the unguessable token in its download URL.
  Same posture `profiles/{uid}` already takes. `storage.rules.test.ts` asserts it so the
  trade-off stays visible rather than becoming accidental.
- **Rules split `create, update` from `delete`** — on a delete there is no
  `request.resource`, so a size/contentType check would raise an evaluation error rather
  than returning false. Exactly the split the socials rule in `firestore.rules` makes.
- **Extensions are dropped on every slot that can hold either kind** — content type lives
  in object metadata, and the fixed path means swapping a photo for a clip OVERWRITES
  rather than stranding the old object. That is what makes replacement orphan-free. The
  avatar keeps `.jpg` because it is always an image and existing uploads already live
  there.
- **The event cover is rooted at the HOSTER uid, not the event id** — Storage rules cannot
  ask Firestore who owns an event, so ownership has to be expressible in the path itself.
- **Two ids are minted BEFORE their write, because a storage path contains them** —
  `newEventRef()` (`services/events.ts`) and `newMessageRef()` (`services/chat.ts`).
  `addDoc` cannot give you the id in advance, so both take a caller-supplied ref.
- **Optional fields are SPREAD in, never assigned `undefined`** — `buildEventDoc` writes
  `...(cover ? { cover } : {})`. Firestore rejects an explicit `undefined`, and
  `CommunityEvent.cover` is optional precisely so pre-existing events have no key.
- **Picking a chat attachment STAGES it; nothing uploads until send** — `chat/[id].tsx`
  holds a `staged` PickedMedia (no network yet) and a `pending` optimistic bubble (in
  flight). On failure the upload's result is cleaned up from a variable declared OUTSIDE
  the try: cleaning up the local copy instead would hand `deleteMedia` a `file://` URI,
  which silently does nothing and leaves the real bytes orphaned in the bucket.
- **`shared/mediaLabel.ts` has ZERO imports, and must keep them** — it is compiled twice,
  under the app's Expo tsconfig and the functions' es2021/commonjs one, so anything it
  imported would have to resolve under both. It takes a structural `{ type?: string }`
  rather than `MediaAsset` because `types/models.ts` imports `firebase/firestore` for
  `Timestamp`, and Cloud Functions must not pull in the client SDK. `utils/media.ts`
  `mediaPreviewLabel` is a typed wrapper over it. The dependency points one way: both
  workspaces depend on `shared/`, neither on the other.
- **`functions/tsconfig.json` has `rootDir: ".."`, which moved the build output** — the
  entry point now emits to `lib/functions/src/index.js`, and `functions/package.json`
  `main` follows it. Change one without the other and `firebase deploy` uploads a package
  whose entry point does not exist.
- **`Profile.vibePhotos` was retyped `string[]` → `MediaAsset[]` with no backfill** — it
  was never written by any code path, so every stored value is `[]`. Readers still run
  `coerceLegacyVibe()` anyway, because assuming production data matches your assumptions is
  how you find out it does not.
- **The event detail hero and its tear notches live in one wrapper** — the notches are
  absolutely positioned at `top: HERO_HEIGHT - NOTCH/2`, so before the cover band existed
  they measured from the scroll content's top and happened to be right. A band above would
  slide them into the middle of the cover; `heroWrap` is what pins them to the seam.
- **Two orphan cases are accepted knowingly** — a removed vibe/venue slot whose profile
  save is then abandoned, and an event cover uploaded against a `newEventRef()` the hoster
  never publishes. Both leave one object behind. Reconciling them needs a scheduled
  function; the alternative was blocking the UI on cleanup.

- **The ambient field is mounted by `Screen`, not by individual routes** — that is what
  makes it app-wide, and it is why no screen may replace its background with an opaque
  fill. There are exactly three other mount points, each because the surface does not go
  through `Screen`: `app/(auth)/onboarding.tsx` (full-bleed splash), `LoadingView` (so a
  gate that resolves in 200ms does not flash a flat rectangle between two moving ones),
  and `event/[id]` (full-bleed — its ink hero runs under the status bar). A new
  full-bleed screen is the only reason to add a fifth.
- **`Screen tone="cream"` veils the field, it does not cover it** — `palette.creamVeil` is
  0.88 alpha on purpose. Taking it to 1.0 kills the ambient on every form and chat thread,
  which is half the app.
- **The backdrop sits OUTSIDE the SafeAreaView** — absolutely-positioned children lay out
  against the padding edge, so a backdrop nested inside one stops at the notch and leaves
  the status-bar strip unpainted. `Screen`'s SafeAreaView is transparent for this reason.
- **There is ONE backdrop implementation** — `WelcomeBackdrop` was a near-identical second
  copy scoped to the welcome screen (its own gradient stops, its own glow tokens) and was
  folded into `AmbientBackdrop`. Two backdrops that are meant to look the same eventually
  do not.
- **Glow alphas must stay under ~0.15** — there is no radial gradient in React Native
  (expo-linear-gradient is linear-only and expo-blur is absent; react-native-svg is now
  installed but a full SVG layer per screen is far heavier than this), so the falloff is
  faked with five stacked concentric rings of one colour. Past ~0.15 the outer ring stops being invisible and the blob reads as a
  hard-edged disc. `__tests__/constants/design.test.ts` guards the ceiling.
- **Reduced motion means NO loops, and the in-flight probe counts as reduced** —
  `useReduceMotion` starts at `true`. Starting loops optimistically and stopping them once
  the probe answers animates at exactly the users who asked not to be.
- **The navigators are filled with `navigatorBackground`, never transparent** — that fill
  is only visible mid-transition, but transparent would let modal routes show the screen
  underneath through the gap. React Navigation's own default there is white, which flashes
  hard against the field.
- **Every screen runs its own drift loops** — react-navigation keeps stacked screens
  mounted, so a 3-deep stack has 3 fields looping. They are all native-driver, so this
  costs UI-thread compositing rather than JS, but focus-gating is the lever to reach for
  if a low-end device ever struggles.
- **`event/[id]`'s tear notches no longer match the background exactly** — they are painted
  `orangeDeep` while the field is now a gradient they scroll through. Each is a 7x14px
  half-disc at the hero seam, where the field is within a few percent of orangeDeep, so
  the mismatch is sub-perceptual. Clipping a live copy of the gradient into 14px would
  cost more than it buys.
- **The reward roster is ONE system, not badges plus rewards** — `utils/rewards.ts`
  `computeRewards()` replaced `computeBadges()`, and `RewardGrid` replaced `BadgeGrid`, both
  deleted. `constants/achievements.ts` is the roster (what each reward MEANS, its prompt
  copy and points); `constants/mascotFigures.ts` is what each one LOOKS like.
- **`trackable: false` means there is deliberately no rule** — most of the roster describes
  behaviour the app does not record: message-partner counts, RSVP timing, plan changes,
  introductions. Those ship visible-but-locked rather than earning themselves on adjacent
  data. `__tests__/utils/rewards.test.ts` asserts the rule table and the flags agree in BOTH
  directions, so a `trackable: true` with no rule (unearnable) and a rule on an untrackable
  id (dishonest) both fail. Flip the flag and add the rule together when tracking lands.
- **Three roster blurbs were reworded away from the comp, on purpose** — Consistent One,
  The Connector and Community Legend. The comp's originals ("never missed an RSVP'd event
  for 3 months", "introduced two members who clicked", "messaged 100+ different members")
  claim things the app cannot know. Each carries a comment saying what it used to say.
- **The comp ships two characters for one milestone** — THE WELCOMER and HOST are both
  "hosted your first event". Rather than drop a figure, `host` became the repeat-host
  milestone. Neither is trackable yet: hosted-event counts are not among the inputs.
- **Mascot figures are DATA, in constants/** — 25 characters built from hot pink, cyan and
  lavender, none of which is in the palette. Keeping them in `constants/mascotFigures.ts`
  leaves `components/Mascot.tsx` free of literals so `tokens.test.ts` stays absolute with an
  empty allowlist. Same reasoning as the avatar tints in `utils/avatar.ts`.
- **The unlock frame never varies per reward** — `constants/design.ts` `reward.*` is the one
  dark surface in the app, and only the mascot, title, prompt and points change inside it.
  Per-reward theming would break the "one of these" recognition the ceremony depends on.
- **The ceremony fires from `RewardWatcher`, NOT from the rewards screen** — it is mounted
  beside the navigator in `(app)/(attender)/_layout.tsx`, which stays mounted underneath
  pushed routes; since `RewardUnlock` is a React Native `Modal`, the unlock lands over
  `event/[id]`, a chat thread, or wherever the user actually was. Firing it from
  `badges.tsx` instead would only ever congratulate people for something they went looking
  for. The rewards screen keeps a separate single-slot `replaying` state for tapping an
  earned mascot to watch it again — that path deliberately does NOT touch seen-state.
- **Hosters do not mount the watcher** — every trackable reward keys off attendance,
  connections or tier, so the extra subscriptions would buy a hoster nothing.
- **Seen-unlocks are LOCAL, in AsyncStorage** — `services/rewardsSeen.ts`, keyed per uid.
  The roster itself is derived from real data and correct on every device; this only decides
  whether the ceremony plays. Worst case on a new phone is one replay, which is a pleasant
  surprise — whereas a Firestore write would mean new rules and an unlock lost to a dropped
  connection. Ids are marked seen when the modal is QUEUED, not when dismissed, so a
  force-quit mid-celebration does not replay it forever.
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
- **Event categories are stored as slugs, never display strings** — `constants/categories.ts`
  holds the id/label/blurb/emoji table and `categoryLabel()` resolves it. Rendering
  `event.category` raw is a bug. The point is that copy can be reworded without orphaning
  events, which is exactly what renaming a stored display string would do. There are eight
  categories and no catch-all; `Social` was deliberately dropped.
- **The slugs deliberately no longer resemble their labels** — every category was relabelled
  on 2026-08-05 (`creative-outlet` → Make, `curious-minds` → Learn, `stage-time` → Stage,
  `lets-eat` → Eat, `game-time` → Game Night, `level-up` → Networking) and not one slug
  moved, so not one event moved either. Renaming a slug to match its new label is the
  precise failure the indirection exists to prevent. `__tests__/constants/categories.test.ts`
  pins each pairing.
- **Retired categories keep their labels, out of the picker** — `day-drinks-nightlife` and
  `lets-get-active` were dropped from `EVENT_CATEGORIES` in the same change. They live on in
  a `RETIRED_CATEGORIES` lookup that only `categoryLabel()` reads, so an event filed under
  one before the cut still renders "Day Drinks & Nightlife" instead of a raw slug, while
  `categoryMeta()` returns undefined and no picker, filter or form can offer it again.
  Retiring a category is a copy decision, not licence to corrupt history — and this is why
  no Firestore backfill was needed. The `RetiredEventCategory` type in `types/models.ts`
  is deliberately separate from `EventCategory`.
- **`utils/rewards.ts` matches on category SLUGS** — the Stage/Eat/Touch Grass rewards
  filter on `stage-time` / `lets-eat` / `touch-grass`, which do not resemble their labels.
  `__tests__/utils/rewards.test.ts` pins each one so a rename fails loudly instead of
  quietly making a reward unearnable. Experimenter of Variety iterates `EVENT_CATEGORIES`
  rather than a hardcoded list, so retiring a category cannot strand it.
- **The category list has a suggestion outlet, because it has no catch-all** —
  `components/CategorySuggestion.tsx` sits at the foot of the filter sheet's Category
  section. The address is rendered as visible text rather than hidden behind a link label,
  so it survives `Linking.openURL` rejecting on a device with no mail client. Only the
  filter sheet carries it; `create-event`'s category list does not.
- **There is exactly ONE category filter — the filter sheet** — `components/FilterSheet.tsx`
  is the only reader of `EVENT_CATEGORIES` and the only place a category is chosen. A
  standalone Discover dropdown was built and removed the same day: two entry points for
  one filter is drift, however it is justified. Multi-select; the per-category empty state
  fires only when exactly one is selected.
- **Category counts are borough-scoped but NOT category-scoped** — scoping by the active
  category would make every row but the chosen ones read zero. `filters.tsx` computes them
  and passes them to `FilterSheet` as an optional `counts` prop.
- **Venue keyed by uid** — `venues/{uid}` uses the hoster's UID as doc id. 1:1 hoster → venue.
- **Denormalized event fields** — `venueName`, `neighborhood`, and `borough` are all copied from the
  venue at creation so cards render without a join. `borough` is optional because events created before
  the location feature lack it.
- **`registeredCount` is an atomic counter** — `increment()` inside a batch alongside the registration doc.
  Rules use `registersSelf`/`unregistersSelf` + `existsAfter` to gate it.
- **Cancelled events stay in Firestore** — `cancelled: true`; `subscribeUpcomingEvents` filters server-side,
  `my-events.tsx` prunes client-side.
- **Delete is batched** — `deleteEvent` batches in chunks of 400 (Firestore limit).
- **Connections are computed client-side** — intersection of following ∩ followers. No counters, no
  Cloud Functions. Connector badge unlocks at 3 mutuals.
- **Social handles are off the profile document on purpose** — `profiles/{uid}` is
  `allow read: if signedIn()`, so anything stored there is readable by every signed-in
  member regardless of what the UI renders. Handles live at `profiles/{uid}/private/socials`
  where the read can actually be gated. Moving them onto the profile doc would turn the
  connections-only promise into decoration.
- **The socials gate lives in firestore.rules, not the screen** — `useSocials` translates a
  `permission-denied` read into `visible: false`, and the profile screens render whatever
  came back rather than re-deciding with `useConnections`. Two copies of the check would
  eventually disagree, and the UI copy would be the wrong one.
- **A mutual follow needs BOTH edge docs** — `exists()` on one direction only proves a
  one-way follow. The rules check `follower_target` and `target_follower`; the rules tests
  cover each one-way case separately.
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
- **`react-native-svg` IS installed, as of 2026-08-05** — the earlier "would mean a native
  rebuild" note was over-cautious: it ships inside Expo Go, so dev needs no rebuild and EAS
  picks it up on its next cloud build. It exists for the reward mascots, which are organic
  vector paths with radial gradients that Views cannot approximate. Do NOT reach for it for
  ordinary chrome — everything else in the app is still Views and tokens.
- **Dynamic routes use object form** — `router.push({ pathname: '/(app)/x/[id]', params })`. The typedRoutes
  generator races the dev server and transiently drops the string-template form for new routes.
- **Typed routes go stale when route files are added** — run `npx expo start` ~25s, kill it, then `tsc`.
- **Env vars** — all `EXPO_PUBLIC_FIREBASE_*` + `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. `.env` is gitignored;
  `.env.example` lists the keys.
- **Google OAuth placeholder** — unset client id would be `undefined` and crash the auth screen, so
  `useGoogleAuth` substitutes `'google-auth-not-configured'`; it is never sent to Google.
- **The cloud prompt is ONE presenter with TWO sources** — `constants/cloudPrompts.ts` holds
  both coaching hints (first visit to a surface, then never again) and behavioural nudges
  (a condition over live data, with a 3-day per-id cooldown). `utils/cloudPrompts.ts`
  `pickPrompt()` always prefers coaching: somebody who has never seen a screen needs to be
  told what it IS before what to do on it. `__tests__/constants/cloudPrompts.test.ts`
  asserts the kind flag and the presence of `condition`/`priority` agree in BOTH
  directions, so a nudge with no condition (fires forever) and a coaching entry with one
  (skips the cooldown) both fail.
- **Prompt catalogue entries are keyed on route AND role** — `(attender)/index.tsx` and
  `(hoster)/index.tsx` both resolve to the pathname `/`. Each watcher is mounted inside a
  role-specific layout and passes `role` as a prop; dropping it shows attenders the
  hoster's Overview hint.
- **The cloud fires from `CloudPromptWatcher`, mounted beside BOTH tab navigators** —
  unlike `RewardWatcher`, which hosters skip because every trackable reward keys off
  attendance, navigation coaching is for everybody. No route file is edited to make this
  work; `usePathname()` plus the catalogue is the whole mapping.
- **A nudge is judged only once the account state has SETTLED** — every source behind
  `PromptState` (`useProfile`, `useChatList`, `useAttendanceStats`, `useConnections`, the
  registrations fetch) starts empty and fills in later, while AsyncStorage answers in a
  tick. Deciding on that first snapshot describes a member with no photo, no events and no
  connections — precisely the shape `no-photo`, `no-rsvp-yet` and `no-connections` test
  for — so a veteran gets told they have never been to anything, AND the firing burns the
  3-day cooldown that was meant to protect the real nudge. The watcher gates on a `ready`
  flag over the four `loading` flags plus the fetch. A FAILED fetch still counts as
  settled: otherwise one Firestore outage silences every nudge forever.
- **The watcher's route effect excludes `state` and keys on `ready` instead** — `state`
  churns as subscriptions arrive, and depending on it would re-run mid-visit and raise a
  second cloud on one screen. `ready` flips once, from "nothing has loaded" to "this is
  the account". Because it is in the dep list, a `raisedFor` ref caps it at one cloud per
  `uid:pathname` visit — a token refresh retriggers `useProfile`'s loading flag, which
  would otherwise put back a cloud the user had just dismissed.
- **Hosters get the watcher but NOT its subscriptions** — every hoster catalogue entry is
  coaching with no condition, so no hoster decision reads `PromptState`. The watcher hands
  all four hooks `undefined` when `role !== 'attender'`, which is the same reasoning that
  keeps `RewardWatcher` off the hoster layout entirely.
- **The cloud ANCHORS to a tab — it is a thought bubble, not a dialog** — the body sits
  just above the tab bar over the tab the prompt is about, and a tail of three shrinking
  dots points at that icon. `tabAnchor()` in `constants/cloudPrompts.ts` resolves it: the
  tab the CTA leads to when that is a tab (so "they are already talking" points at Chats
  while being shown on My Events), otherwise the tab it is speaking on. `TAB_ORDER` must
  match the `<Tabs.Screen>` order in each role's `_layout.tsx` — the component turns an
  index into an x position, so a reordered bar would point at the wrong icon silently, on
  device only. `__tests__/constants/cloudPrompts.test.ts` pins both lists.
- **The body is clamped to the screen; the TAIL is not** — a first or last tab would push
  the 230pt body off-screen, so the body slides back while the tail stays on the icon and
  the cloud leans toward its tab. Tying the tail to the body's centre is the exact bug
  this arrangement prevents, and three component tests fail if it is reintroduced.
- **The cloud's scrim stops at the top of the tab bar** — it is pointing AT a tab, and a
  tab washed to 0.62 is a poor thing to point at. The press target stays full-screen, so
  the undimmed strip still dismisses instead of looking live while the Modal swallows the
  touch. This is why `cloud.scrim` is painted by an inset child rather than by the
  `Pressable` itself.
- **The comet path ends at the anchor, not at fixed window fractions** — the sparks trace
  the path the cloud then travels, so an endpoint pinned to mid-screen would stream toward
  one place while the cloud landed in another.
- **`CloudPrompt` is the app's only `useSafeAreaInsets()` caller** — it needs the real
  home-indicator inset to clear the bar (`tabBar.height + insets.bottom`; React Navigation
  lays the bar out at the height given and pads the inset in underneath, so they add).
  This works because expo-router's own `ExpoRoot` wraps the app in a `SafeAreaProvider` —
  nothing in `app/` does. Tests that render the cloud in isolation must supply one, which
  is what the `SafeAreaProvider initialMetrics={...}` wrapper in both cloud component
  test files is for. Everything else in the app uses the native `SafeAreaView`, which
  needs no provider — that is why this trap had not come up before.
- **Two of the comp's golds were darkened for AA** — `#A87A0F` was 3.49:1 and `#8A6B17`
  was 4.18:1 on the cloud's own body, both at 9px. They became `#856010` and `#7A5A14`.
  Same treatment the palette already gave the comp's `#5C4F3F`, `#C4501F` and `#6E7A5E`,
  and guarded by `__tests__/constants/design.test.ts` against BOTH gradient stops.
- **The cloud's puffs are MEANT to be clipped** — `overflow: 'hidden'` on the body is the
  comp's own behaviour and is what turns them from cartoon bumps into a bloom of texture
  inside the top edge. The two `✦` twinkles are the opposite case: in the comp they sit
  inside that clip and never render, which was read as an accident and fixed by moving
  them into the wrap.
- **The cloud's entrance overshoot lives in the INTERPOLATIONS, not the easing** — the
  comp stacks `cubic-bezier(.2,.75,.15,1.15)` on top of a `82% { scale: 1.045 }` keyframe.
  Reproducing both in RN doubles the bounce and pushes rotate/translate past zero, which
  the comp's keyframes never do. `Easing.out(Easing.cubic)` plus literal keyframe stops is
  the faithful version. The entrance blur is dropped outright — not animatable without
  `expo-blur`, which this project does not carry.
- **Cloud seen-state is LOCAL, in AsyncStorage** — `services/cloudPromptsSeen.ts`, keyed
  per uid, two halves because the kinds forget differently (coaching a flat set, nudges a
  timestamp map). Same trade as `rewardsSeen.ts`: this decides whether a presentation
  plays, not what is true about the account. Marked on QUEUE, not dismiss.

---

## Commands

| Task | Command (from `thirdspace-app/`) |
|------|----------------------------------|
| Dev server | `npx expo start` |
| Unit tests | `npx jest` |
| Rules tests | `npm run test:rules` (Firestore + Storage emulators; needs Firebase CLI + Java) |
| Functions tests | `cd functions && npx jest` |
| Typecheck | `npx tsc --noEmit` |
| Deploy rules | `npx firebase-tools deploy --only firestore:rules,storage` |
