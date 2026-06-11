# Role Dashboards — Attender Feed & Hoster (Venue Partner) Portal

**Date:** 2026-06-10
**Status:** Approved by founder
**Sources:** ThirdSpace Functional Req Doc v2.0 (sections B2, B3, B8), ThirdSpace Business Plan (pricing strategy)

## Goal

Replace the placeholder `(app)/index.tsx` screen with working, role-specific dashboards
backed by real Firestore data. This build delivers the **core product loop**:

> A venue partner creates an event → it appears in the attender event feed →
> an attender registers (free events only) → the venue sees the registration
> count and attendee names.

## Decisions Made

| Question | Decision |
|----------|----------|
| Who is the "hoster" role? | The **venue partner** from FRD B8 (a small business), not the Phase-2 premium user host |
| Build depth | Working core loop with real data. Excluded: payments, blurred attendee photos, group chats, ID verification, analytics charts, announcements |
| Navigation | Bottom tabs per role. Attender: Feed / My Events / Profile. Hoster: Overview / Events / Venue |
| Venue identity | Quick setup gate after role select: venue name, borough + neighborhood, one-line description. Required before creating events |
| Data model | Approach A: events collection with denormalized venue fields + registrations subcollection (see below) |
| Event cost | All events are **Free** in this build. No cost field in the create form; cards and detail pages render the literal label "Free" |

## 1. Routing & Architecture

```
app/(app)/
├── _layout.tsx              → reads role via useAuth, renders the matching tab
│                              group; redirects cross-role navigation
├── (attender)/
│   ├── _layout.tsx          → bottom tabs: Feed | My Events | Profile
│   ├── index.tsx            → Event Feed
│   ├── my-events.tsx        → registered events (Upcoming / Past)
│   └── profile.tsx          → name, email, role badge, sign out
├── (hoster)/
│   ├── _layout.tsx          → bottom tabs: Overview | Events | Venue
│   ├── index.tsx            → Overview dashboard
│   ├── events.tsx           → hoster's event list + Create button
│   └── venue.tsx            → venue profile view/edit
├── event/[id].tsx           → event detail; renders attender mode (register)
│                              or hoster-owner mode (attendee list, cancel event)
├── create-event.tsx         → create-event form, hoster only, modal presentation
└── venue-setup.tsx          → one-time venue setup gate
```

**Guards:**
- Hoster with no `venues/{uid}` doc → redirected to `venue-setup` before any hoster screen.
- Attender opening a hoster route (or vice versa) → redirected to their own home tab.
- Existing root-level auth guard (signed out → marketing/auth flow) is unchanged.

**Code organization:**
- `components/`: `EventCard`, `CategoryTabs`, `EmptyState`, `Banner` (shared UI)
- `services/events.ts`, `services/venues.ts`: all Firestore reads/writes. Screens never
  import Firestore directly.
- `utils/eventHelpers.ts`: date formatting, "Starting Soon" logic, spots-left text.
- Visual language follows the existing auth screens: `#FBF7F2` background, `#C4614A`
  accent, `#2C1810` text, DM Serif Display headings, DM Sans body.

## 2. Firestore Data Model

```
venues/{uid}                       — doc ID = hoster's auth UID
  name: string
  borough: string                  — Brooklyn | Manhattan | Queens | Bronx | Staten Island
  neighborhood: string
  description: string
  createdAt: Timestamp

events/{eventId}
  title: string
  description: string
  category: string                 — one of the 9 FRD feed categories (below)
  startsAt: Timestamp
  capacity: number                 — 1..500
  ageRequirement: '18+' | '21+'
  venueId: string                  — owner's UID
  venueName: string                — denormalized at creation
  neighborhood: string             — denormalized at creation
  registeredCount: number
  createdAt: Timestamp

events/{eventId}/registrations/{uid}
  displayName: string
  registeredAt: Timestamp

users/{uid}                        — existing doc, adds:
  registeredEventIds: string[]
```

**Categories (FRD B2.1 feed tabs):** Creative Arts, Fitness, Social, Nightlife,
Food & Drink, Music, Outdoors, Learning, Wellness.

**Denormalization trade-off (accepted):** `venueName`/`neighborhood` are copied onto
events at creation. Renaming a venue does not retroactively update existing event
cards. Fixable later with a batch update if needed.

## 3. Screens

### Attender

**Feed (home):**
- Horizontal category chip row: All + 9 categories; tapping filters instantly (FRD B2.1).
- Search box filters by event title, venue name, or neighborhood — client-side.
- Live list via `onSnapshot`: upcoming events (`startsAt >= now`) ordered by date.
- Event card (FRD B2.2 subset): title, color-coded category chip, venue name +
  neighborhood, date and time, "Free", "X going", "Starting Soon" badge when the
  event begins within 24 hours, "21+" badge when applicable.

**Event detail (`event/[id]`):**
- Full description, venue + neighborhood, date/time, capacity with "X spots left".
- Primary CTA: Register → atomic batch write → inline "You're in!" confirmation.
- Already registered → button becomes "Cancel registration".
- Full event → disabled "Sold out" state.

**My Events:** Upcoming and Past sections resolved from `users/{uid}.registeredEventIds`.
IDs whose event doc no longer exists (event was cancelled by the venue) are silently
skipped and pruned from the array on load.

**Profile:** display name, email, role badge, sign out. (Moves today's placeholder
content into a tab.)

### Hoster (venue partner)

**Venue setup gate (one-time):** venue name, borough picker, neighborhood, one-line
description. Creates `venues/{uid}`. Required before any other hoster screen.

**Overview (home):** greeting with venue name, "next event" card with live
registration count, totals row (events created, total registrations), prominent
Create Event button.

**Events:** list of own events (upcoming first) with per-event registration counts.
Tapping opens `event/[id]` in owner mode.

**Event detail — owner mode:** event info, attendee list showing **display names
only** (FRD B8: venue sees name and confirmation, not full profile), Cancel Event
action (with confirm prompt; deletes the event and its registrations).

**Create event (modal):** title, description, category picker, date + time picker,
capacity (numeric), 18+/21+ toggle. Validation: all fields required, `startsAt`
must be in the future, capacity 1–500. On success → back to Events list with the
new event visible.

**Venue:** view and edit the venue-setup fields.

## 4. Registration Flow & Data Integrity

- **Register:** one atomic `writeBatch`:
  1. create `events/{id}/registrations/{uid}`
  2. `increment(1)` on `events/{id}.registeredCount`
  3. `arrayUnion(eventId)` on `users/{uid}.registeredEventIds`
- **Cancel:** the inverse batch (delete, `increment(-1)`, `arrayRemove`).
- Capacity is checked client-side before the write; the Register button is disabled
  at `registeredCount >= capacity`. (Server-enforced capacity via rules/functions is
  deferred — acceptable at current scale.)
- All service functions return typed results and surface failures to a shared
  `Banner` component with user-friendly copy, consistent with the auth screens.

## 5. Firestore Security Rules (`firestore.rules`, shipped with this build)

- `users/{uid}`: read/write only by that user.
- `venues/{uid}`: read by any signed-in user; create/update only by that user.
- `events/{id}`: read by any signed-in user; create only when `venueId == auth.uid`
  and a `venues/{auth.uid}` doc exists; update/delete only by the owning venue.
- `events/{id}/registrations/{uid}`: create/delete only by the matching user;
  read by the registrant and the event's venue owner.
- No unauthenticated access anywhere (FRD: zero anonymous access).

## 6. Error Handling

- Every Firestore call wrapped with try/catch in the service layer; screens show
  banner messages ("Couldn't load events. Check your connection.", "Registration
  failed. Try again.").
- Empty states designed for: feed with no events, My Events empty, hoster with no
  events yet — each with a friendly prompt and (for hoster) a Create CTA.
- Loading states: skeleton/spinner per screen, never a blank screen.

## 7. Testing

- **Unit (jest-expo, existing setup):** create-event validation rules; event
  helpers (Starting Soon boundary, spots-left text, date formatting); registration
  service batch composition with mocked Firestore.
- **Component:** `EventCard` render states — normal, sold out, 21+, starting soon.
- **Manual device pass (Expo Go):** full loop — hoster signs up → venue setup →
  creates event → attender account sees it in feed → registers → appears in
  hoster's attendee list → cancel registration reflects everywhere.

## Out of Scope (deferred, per FRD phase boundaries)

Payments/ticketing, blurred attendee photos and unlock logic, group chats, private
messaging, ID verification, push notifications, points/badges, analytics charts,
venue announcements, billing tiers, premium user hosting, Android-specific work
beyond what Expo gives for free.
