# The Third Space — Codemap
_Generated: 2026-06-18. Re-run `/code-review-graph` after major structural changes._

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 / React Native 0.81 |
| Language | TypeScript 5.7 |
| Navigation | expo-router v6 (file-based, Stack + route groups) |
| Backend / Auth | Firebase v11 (Auth + Cloud Firestore) |
| Auth Providers | Email/password, Apple Sign-In, Google OAuth |
| Fonts | DM Serif Display, DM Sans (expo-google-fonts) |
| Styling | React Native StyleSheet + NativeWind (Tailwind classes) |
| Storage | AsyncStorage (auth session persistence) |

---

## Source Tree

```
thirdspace-app/
├── firebase/
│   └── config.ts          # Firebase app init; exports auth, db
├── types/
│   └── models.ts          # All shared TypeScript types
├── hooks/
│   ├── useAuth.ts         # Firebase Auth state + Firestore role lookup
│   ├── useGoogleAuth.ts   # Google OAuth (expo-auth-session + expo-web-browser)
│   └── useVenue.ts        # Firestore venue subscription for a uid
├── services/
│   ├── events.ts          # Firestore CRUD + realtime subscriptions for events
│   └── venues.ts          # Firestore write helper for venues
├── components/
│   ├── OnboardingSlide.tsx  # Slide for onboarding carousel
│   ├── FormInput.tsx        # Labelled text input
│   ├── AuthButton.tsx       # Primary/secondary CTA button with loading state
│   ├── Banner.tsx           # Inline error/info banner
│   ├── EmptyState.tsx       # Zero-results placeholder
│   ├── LoadingView.tsx      # Full-screen spinner
│   ├── CategoryTabs.tsx     # Horizontal category filter tabs
│   ├── EventCard.tsx        # Event list/feed card
│   └── VenueForm.tsx        # Venue setup/edit form fields
├── utils/
│   ├── validation.ts        # Generic field validators
│   ├── crypto.ts            # Hashing / crypto helpers
│   ├── eventHelpers.ts      # Event date/time formatting helpers
│   └── eventValidation.ts   # Event-form field validators
├── constants/
│   ├── theme.ts             # Color palette, spacing, font tokens
│   └── categories.ts        # EventCategory list + icon mappings
└── app/                     # expo-router file-based routes
    ├── _layout.tsx          # Root layout: loads fonts, runs AuthRedirect guard
    ├── index.tsx            # Root → redirects immediately into (auth) or (app)
    ├── (auth)/              # Unauthenticated route group (no tab bar)
    │   ├── _layout.tsx      # Stack for auth screens
    │   ├── onboarding.tsx   # Onboarding carousel (first launch)
    │   ├── sign-in.tsx      # Email + Google + Apple sign-in
    │   ├── sign-up.tsx      # Email registration
    │   ├── forgot-password.tsx # Password reset
    │   └── role-select.tsx  # First-time role picker (attender | hoster)
    └── (app)/               # Authenticated route group
        ├── _layout.tsx      # Stack; create-event is modal
        ├── index.tsx        # Redirects to role-based sub-group
        ├── venue-setup.tsx  # Hoster: create/edit their venue (gate before events)
        ├── create-event.tsx # Hoster: event creation form (modal)
        ├── event/[id].tsx   # Event detail + register/unregister (attender & hoster view)
        ├── (hoster)/        # Hoster tab group
        │   ├── _layout.tsx  # Tab bar: Overview | Events | Venue
        │   ├── index.tsx    # Overview: stats + next event
        │   ├── events.tsx   # Events list with cancel/delete
        │   └── venue.tsx    # Venue profile view/edit
        └── (attender)/      # Attender tab group
            ├── _layout.tsx  # Tab bar: Feed | My Events | Profile
            ├── index.tsx    # Feed: searchable, filterable live event list
            ├── my-events.tsx  # Attender's registrations (prunes cancelled events)
            └── profile.tsx  # Attender profile + sign-out
```

---

## Architecture Layers

### Entry Points
- `app/_layout.tsx` — Root layout. Loads fonts, calls `useAuth`, mounts `AuthRedirect` guard. Renders a Stack navigator.
- `app/index.tsx` — Immediately redirects; never visible to the user.

### Auth & Session
- `firebase/config.ts` — Initialises Firebase app once (guards against double-init). Exports `auth` (with AsyncStorage persistence) and `db`.
- `hooks/useAuth.ts` — Subscribes to `onAuthStateChanged`; on login fetches `users/{uid}` from Firestore to resolve the role.
- `hooks/useGoogleAuth.ts` — Handles Google OAuth redirect flow via expo-auth-session.
- `AuthRedirect` (inline in `app/_layout.tsx`) — Guards all navigation based on `{ user, role, loading }`:
  - No user → `/(auth)/onboarding`
  - User, no role → `/(auth)/role-select`
  - User + role → `/(app)`

### Routing / Navigation
- expo-router file-based routing; route groups `(auth)`, `(app)`, `(hoster)`, `(attender)` create logical navigation silos.
- `(app)/_layout.tsx` — Stack; `create-event` opens as a modal.
- `(hoster)/_layout.tsx` — Tab navigator with tabs: Overview, Events, Venue.
- `(attender)/_layout.tsx` — Tab navigator with tabs: Feed, My Events, Profile.
- `event/[id].tsx` — Dynamic segment; shared between roles.

### Screens / Pages

| Screen | Path | Role | Purpose |
|--------|------|------|---------|
| Onboarding | `(auth)/onboarding` | Any | First-launch carousel |
| Sign In | `(auth)/sign-in` | Any | Email / Google / Apple login |
| Sign Up | `(auth)/sign-up` | Any | Email registration |
| Forgot Password | `(auth)/forgot-password` | Any | Password reset |
| Role Select | `(auth)/role-select` | New user | Writes role to Firestore |
| Venue Setup | `(app)/venue-setup` | Hoster | Gate screen before event creation |
| Create Event | `(app)/create-event` | Hoster | Modal event form |
| Event Detail | `(app)/event/[id]` | Both | Detail + register / unregister |
| Hoster Overview | `(app)/(hoster)/index` | Hoster | Stats + next upcoming event |
| Hoster Events | `(app)/(hoster)/events` | Hoster | Full event list + cancel / delete |
| Hoster Venue | `(app)/(hoster)/venue` | Hoster | Venue profile view/edit |
| Attender Feed | `(app)/(attender)/index` | Attender | Search + filter upcoming events |
| My Events | `(app)/(attender)/my-events` | Attender | Registered events; prunes cancelled |
| Attender Profile | `(app)/(attender)/profile` | Attender | Profile + sign-out |

### Shared Components

| Component | Props summary | Used by |
|-----------|--------------|---------|
| `EventCard` | `event: CommunityEvent, onPress` | Feed, Hoster Overview, My Events |
| `AuthButton` | `label, onPress, variant, loading` | All auth + action screens |
| `FormInput` | `label, value, onChangeText, ...` | All forms |
| `CategoryTabs` | `selected, onSelect` | Attender Feed |
| `VenueForm` | `value, onChange` | Venue Setup, Hoster Venue |
| `Banner` | `message` | Any screen with inline errors |
| `EmptyState` | `message` | Feed, My Events, Events list |
| `LoadingView` | — | Any screen during async fetch |
| `OnboardingSlide` | `title, body, image` | Onboarding carousel |

### Hooks

| Hook | Firestore reads | Returns |
|------|----------------|---------|
| `useAuth` | `users/{uid}` (one-shot on login) | `{ user, role, loading }` |
| `useGoogleAuth` | — (OAuth) | `{ promptAsync, request }` |
| `useVenue` | `venues/{uid}` (realtime snapshot) | `{ venue, loading, hasError }` |

### Services / API

| Service | Firestore operations | Key exports |
|---------|---------------------|-------------|
| `services/events.ts` | `events` collection CRUD + `events/{id}/registrations` sub-collection | `createEvent`, `deleteEvent`, `cancelEvent`, `subscribeUpcomingEvents`, `subscribeVenueEvents`, `registerForEvent`, `unregisterFromEvent` |
| `services/venues.ts` | `venues/{uid}` write | `saveVenue` |

### Data Models (`types/models.ts`)

```typescript
type EventCategory = 'Creative Arts' | 'Fitness' | 'Social' | 'Nightlife' |
                     'Food & Drink' | 'Music' | 'Outdoors' | 'Learning' | 'Wellness'
type AgeRequirement = '18+' | '21+'
type Borough = 'Brooklyn' | 'Manhattan' | 'Queens' | 'Bronx' | 'Staten Island'

interface Venue {
  name: string; borough: Borough; neighborhood: string; description: string
}

interface CommunityEvent {
  id: string; title: string; description: string; category: EventCategory
  startsAt: Timestamp; capacity: number; ageRequirement: AgeRequirement
  venueId: string; venueName: string; neighborhood: string  // denormalized
  registeredCount: number
}

interface Registration {
  uid: string; displayName: string   // stored at events/{id}/registrations/{uid}
}
```

### Utils & Constants

| File | Purpose |
|------|---------|
| `utils/validation.ts` | Generic validators (email, required, length) |
| `utils/crypto.ts` | Hashing helpers |
| `utils/eventHelpers.ts` | Date formatting, capacity checks |
| `utils/eventValidation.ts` | Event-form field validation rules |
| `constants/theme.ts` | Colors (`#2C1810`, `#C4614A`, …), spacing, font sizes |
| `constants/categories.ts` | `EventCategory` list + display labels / icons |

---

## Dependency Graph

```
firebase/config.ts
  ↑
  ├── hooks/useAuth.ts         → types/models (Role)
  ├── hooks/useVenue.ts        → types/models (Venue)
  └── services/events.ts       → types/models (CommunityEvent, Registration, …)
       └── services/venues.ts  → types/models (Venue)

hooks/useAuth.ts
  ↑
  └── app/_layout.tsx (AuthRedirect)

hooks/useVenue.ts
  ↑
  ├── app/(app)/(hoster)/index.tsx
  ├── app/(app)/(hoster)/venue.tsx
  └── app/(app)/venue-setup.tsx

services/events.ts
  ↑
  ├── app/(app)/(hoster)/index.tsx  (subscribeVenueEvents)
  ├── app/(app)/(hoster)/events.tsx (subscribeVenueEvents, deleteEvent, cancelEvent)
  ├── app/(app)/(attender)/index.tsx (subscribeUpcomingEvents)
  ├── app/(app)/(attender)/my-events.tsx (subscribeRegistrations)
  └── app/(app)/event/[id].tsx (registerForEvent, unregisterFromEvent)

components/*
  ↑
  └── used by screens (see Shared Components table above)

constants/theme.ts, constants/categories.ts
  ↑
  └── imported by screens + components as needed

utils/*
  ↑
  └── imported by form screens + services as needed
```

---

## Data / State Flow

### Auth Flow

```
Firebase onAuthStateChanged
  → useAuth sets user + fetches users/{uid}.role
  → AuthRedirect (in app/_layout) reads { user, role, loading }
      │
      ├── !user              → replace /(auth)/onboarding
      ├── user, !role        → replace /(auth)/role-select
      └── user, role         → replace /(app)
                                  │
                                  ├── role === 'hoster'   → (app)/(hoster) tab group
                                  └── role === 'attender' → (app)/(attender) tab group
```

### Data Fetching Pattern

- **Realtime subscriptions** via `onSnapshot` (events feed, hoster's own events, venue).
- Pattern: service exports `subscribe*` that accepts a `setState` callback and returns the unsubscribe fn — screens call this in `useEffect` and return the cleanup.
- **One-shot reads** via `getDoc` (event detail, registration check).
- **Writes** are fire-and-forget (`addDoc`, `updateDoc`, `deleteDoc`, `writeBatch`) with local error state.

### Navigation Flow

```
app/index.tsx         (no visible screen — immediate redirect)
  ↓
AuthRedirect decides:
  ↓
(auth)/onboarding → sign-in / sign-up → role-select
                                              ↓
                                     writes users/{uid}.role
                                              ↓
                                     AuthRedirect fires again
                                              ↓
                         ┌────────────────────┴────────────────────┐
                   role=hoster                               role=attender
                         ↓                                         ↓
               (hoster) tab group                       (attender) tab group
               Overview | Events | Venue                Feed | My Events | Profile
                         ↓                                         ↓
                  Hoster: venue-setup gate             Attender: event/[id] detail
                  (checks useVenue; redirects          (register / unregister)
                  to venue-setup if no venue)
                         ↓
                  create-event (modal)
```

---

## Firestore Collections

| Collection / Path | Document shape | Who reads | Who writes |
|-------------------|---------------|-----------|-----------|
| `users/{uid}` | `{ role: 'attender'\|'hoster' }` | `useAuth` | `(auth)/role-select` |
| `venues/{uid}` | `{ name, borough, neighborhood, description, updatedAt }` | `useVenue` | `services/venues.saveVenue` |
| `events/{eventId}` | `CommunityEvent` fields + `venueId`, `registeredCount` | `services/events` subscriptions + `event/[id]` | `services/events.createEvent`, `cancelEvent`, `deleteEvent` |
| `events/{eventId}/registrations/{uid}` | `{ uid, displayName }` | `services/events` (for counts + "is registered" check) | `services/events.registerForEvent`, `unregisterFromEvent` |

**Security rules summary**: Hosters can write only to their own venue and events (`venueId === request.auth.uid`). Attenders can write only to their own registration sub-documents. Public reads on events collection (upcoming, non-cancelled).

---

## Key Invariants & Gotchas

- **Venue is keyed by uid** — `venues/{uid}` uses the hoster's Firebase UID as the document ID. There is a 1:1 hoster → venue relationship.
- **Denormalized fields on events** — `venueName` and `neighborhood` are copied from the venue at event-creation time so feed cards render without a join. `borough` is intentionally NOT copied; feed filtering is by category and text search only.
- **`registeredCount` is an atomic counter** — incremented/decremented via Firestore `increment()` inside a batch alongside the registration sub-document write.
- **Cancelled events stay in Firestore** — events get a `cancelled: true` field rather than being deleted. `my-events.tsx` prunes these client-side; `subscribeUpcomingEvents` filters them server-side via a `where` clause.
- **Delete is batched** — `deleteEvent` uses `writeBatch` + `getDocs` to delete the event and all its registration sub-documents in batches of 400 (Firestore batch limit).
- **Auth persistence via AsyncStorage** — `initializeAuth` uses `getReactNativePersistence(AsyncStorage)`. Double-init is guarded by `getApps().length` check.
- **useVenue `hasError` flag** — distinguishes "venue confirmed absent (null)" from "read error" so the venue-setup redirect gate never fires incorrectly on a network error.
- **Env vars** — All Firebase config values must be set as `EXPO_PUBLIC_FIREBASE_*` env vars (see `firebase/config.ts`). No `.env` file is committed.
- **`verified` is owner-set (simulated)** — the ID-verification flow (`app/(app)/verify-identity.tsx`) captures an ID + selfie on-device (never uploaded) and, after a simulated review, calls `submitVerification` to set `profiles/{uid}.verified` + `verifiedAt` directly from the client. Firestore rules allow the owner to write `verified` because there is no real KYC. Verification is skippable and attenders-only. If real verification is added later, move `verified` back to a server-set model.
