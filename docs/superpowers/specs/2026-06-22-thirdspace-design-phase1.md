# ThirdSpace — Design Phase 1 Spec
_Date: 2026-06-22 · Source design: claude.ai/design/p/9a61392d-6479-499c-9fdb-200a73910259_

## Goal

Translate the Claude Design mockup into working React Native / Expo screens (UI only, mock data). Phase 2 will swap mock data for Firebase reads/writes. No backend changes in this phase.

---

## Scope

### Navigation change — attender tab group

```
Before:  Feed | My Events | Profile         (3 tabs)
After:   Discover | My Events | Chats | Profile   (4 tabs)
```

Hoster tab group unchanged: Overview | Events | Venue.
Venue Announcement accessible from Hoster Events screen.

### 16 deliverables

| # | Screen / Component | Route / Path | Type |
|---|-------------------|-------------|------|
| 1 | Attender tab bar | `(attender)/_layout.tsx` | Redesign |
| 2 | Onboarding | `(auth)/onboarding.tsx` | Redesign |
| 3 | Profile creation step | `(auth)/sign-up.tsx` | Add step |
| 4 | Discover (editorial feed) | `(attender)/index.tsx` | Redesign |
| 5 | Search & filters modal | `(app)/filters.tsx` | New |
| 6 | Event detail | `(app)/event/[id].tsx` | Redesign |
| 7 | Registration confirmation | inline overlay in `event/[id].tsx` | New |
| 8 | Full guest list | `(app)/guest-list/[id].tsx` | New |
| 9 | My Events | `(attender)/my-events.tsx` | Redesign |
| 10 | Chats inbox | `(attender)/chats.tsx` | New tab |
| 11 | Group chat | `(app)/chat/[id].tsx` | New |
| 12 | Message requests | `(app)/message-requests.tsx` | New |
| 13 | Profile self-view | `(attender)/profile.tsx` | Redesign |
| 14 | Points & badges | `(app)/badges.tsx` | New |
| 15 | Member/public profile | `(app)/member/[uid].tsx` | New |
| 16 | Venue announcement | `(app)/(hoster)/announcement/[id].tsx` | New |

---

## New components

| Component | File | Props summary |
|-----------|------|--------------|
| `FeaturedEventCard` | `components/FeaturedEventCard.tsx` | `event, onPress` |
| `CompactEventRow` | `components/CompactEventRow.tsx` | `event, onPress` |
| `AttendeeAvatarStack` | `components/AttendeeAvatarStack.tsx` | `uids[], count, size?` |
| `InterestChip` | `components/InterestChip.tsx` | `label, selected, onPress` |
| `ChatRow` | `components/ChatRow.tsx` | `chat, onPress` |
| `ChatBubble` | `components/ChatBubble.tsx` | `message, isSelf, isSystem?` |
| `FilterSheet` | `components/FilterSheet.tsx` | `visible, filters, onChange, onApply` |
| `BadgeGrid` | `components/BadgeGrid.tsx` | `badges[]` |
| `MemberProfileCard` | `components/MemberProfileCard.tsx` | `member` |

All existing components (`EventCard`, `AuthButton`, `FormInput`, `Banner`, `EmptyState`, `LoadingView`, `CategoryTabs`) remain unchanged.

---

## Design tokens

No changes to `constants/theme.ts` — the design uses the existing palette exactly:
- Background: `#FBF7F2` (light) / `#2C1810` (dark)
- Primary: `#C4614A`
- Sage: `#7A8C6E`
- Muted text: `#8C7B70`
- Warm border: `rgba(242,197,160,0.5)`

---

## Screen-by-screen details

### 1. Attender tab bar (`(attender)/_layout.tsx`)
Four tabs: Discover (◎), My Events (▦), Chats (◈), Profile (◐).
Active tab color: `#C4614A`. Inactive: `#8C7B70`.
Tab bar background: `rgba(255,249,244,0.92)` with `backdropFilter: blur(10px)`.
Chats tab shows unread badge (hardcoded `3` in Phase 1).

### 2. Onboarding (`(auth)/onboarding.tsx`)
Dark background `#2C1810`. Radial gradient blobs (terracotta top-right, sage bottom-left).
Three slides with dot/pill progress indicator.
Slide 1 content: "A real third place — for a city that forgot how to meet."
Hero image slot placeholder, floating avatar stack overlay ("1,240 in Brooklyn").
Bottom: "Get started" primary button + "Already a member? Sign in" link.

### 3. Profile creation step (`(auth)/sign-up.tsx`)
Insert as Step 2 of 3 (between account creation and role-select).
Progress bar at 66%. Title: "Make yourself real."
Fields: circular photo upload slot, bio textarea (300-char limit with counter), interest chip grid (min 3 required, shown as ✓ when selected).
Phase 1: tapping Continue just navigates to role-select. No Firestore write yet.

### 4. Discover — editorial feed (`(attender)/index.tsx`)
Header: location subtitle + "Discover" serif title + user avatar circle + search bar.
Category filter chips (All, Creative, Nightlife, Wellness, …).
Featured card: `FeaturedEventCard` with full-width image, category badge, time badge, event title, venue/neighborhood, `AttendeeAvatarStack`, capacity/price row.
Section label "More this week" + list of `CompactEventRow` items (date block + category badge + title + venue + count).
Tapping search bar opens filters modal.
Mock data: 1 featured event + 4 compact rows.

### 5. Search & filters modal (`(app)/filters.tsx`)
Presented as a bottom sheet (modal stack route or `expo-router` modal).
Sections: Date (This weekend / Today / This week / Pick dates), Neighborhood (multi-select chips), Price & age (Free only toggle, Hide 21+ toggle), Category (multi-select chips).
Footer: "Clear all" text + "Show N events" primary button.
Phase 1: filters are local state; count is hardcoded.

### 6. Event detail redesign (`(app)/event/[id].tsx`)
Hero image (280px) with gradient overlay, back button, save (♡) button, category chip.
Event title (DM Serif Display 30px), venue/neighborhood subtitle.
Two info cards: When (date + time) and Spots (available / Free or price).
"Who's going" row: 3 visible avatars + 2 blurred avatars + dashed "Register to unlock" prompt.
About section (body text, light weight).
Sticky footer: price/spots + "Register" primary button.
On Register tap: show `RegistrationConfirmation` overlay (see #7). Toggle `isRegistered` local state — blurred avatars clear, "See all →" becomes active.

### 7. Registration confirmation (inline overlay in `event/[id].tsx`)
Full-screen dark overlay (`#2C1810`) with radial gradient.
Large ✓ icon (sage circle), "You're in!" serif heading.
Event summary card (date block + time + venue + points earned line).
Two actions: "See who's going" → guest list, "Join the group chat" → chat screen.
Phase 1: animated in via `Animated.spring` opacity + scale.

### 8. Full guest list (`(app)/guest-list/[id].tsx`)
Header: "Who's going" + event name + count.
Green "You're going" confirmation banner.
Host section: avatar + name + hosting stats + Message button.
Attendees list: avatar + name + age + neighborhood + interests preview + message icon per row.
Footer: "Open group chat" dark button.

### 9. My Events redesign (`(attender)/my-events.tsx`)
Header: "My events" serif title.
Three tab pills: Upcoming · N, Hosting · N, Past.
Upcoming tab: dark "Next up · in N days" highlight card (title, date, venue, avatar stack, "Open chat" button) + "Also coming up" compact rows with "Going" badge.
Past tab: compact rows with "Rate ★" action.
Hosting tab: same compact row style with "Going" count badge.
Mock data: 2 upcoming, 1 hosting, 1 past.

### 10. Chats inbox (`(attender)/chats.tsx`)
Header: "Chats" serif title.
Filter pills: All / Event groups / Direct.
List of `ChatRow` items: group chats show rounded-square avatar, DMs show circle avatar.
Each row: name, last message preview, timestamp, unread badge (when applicable), muted icon.
Mock data: 2 group chats + 2 DMs.

### 11. Group chat (`(app)/chat/[id].tsx`)
Header: event initials square avatar + event title + participant count + attendee avatar stack.
Message list: `ChatBubble` for each message (other = white bubble, self = terracotta bubble, system = centered pill).
"You registered · welcome to the chat" system message at top.
Input row: + attachment button, text input, send button.
Mock data: 4 messages.

### 12. Message requests (`(app)/message-requests.tsx`)
Accessible via Chats inbox header (small "Requests" link).
Info banner: "Requests stay here until you accept. Decline quietly — they're never notified."
Request cards: avatar + name + shared-interest badge + message preview + Accept / Decline buttons.
Mock data: 2 requests.

### 13. Profile self-view redesign (`(attender)/profile.tsx`)
Header: "You" serif title + settings gear icon.
Row: avatar + name + verified badge + neighborhood.
"Edit profile & photos" outline button.
Stats row: attended / hosted / connections (DM Serif numbers).
Account section (list rows): Interests & preferences, Neighborhoods, Become a host (with "New" badge).
Privacy section: Who can message me (current: "Event-mates"), Notifications toggle.
Sign out link at bottom.

### 14. Points & badges (`(app)/badges.tsx`)
Accessible from profile (future; Phase 1 can be a direct route for testing).
Points hero card (gradient terracotta, total points in DM Serif 52px, tier badge, progress bar to next tier).
Badges grid (4 columns): earned badges full opacity, locked badges at 40% opacity with dashed border.
Redeem section: reward row with "Use" button.
Mock data: 6 earned badges, 2 locked.

### 15. Member/public profile (`(app)/member/[uid].tsx`)
Cover photo (140px) + overlapping avatar (96px, 4px cream border).
Name + age, neighborhood.
Social proof chips: tier badge, points, event count.
Follow + Message request buttons.
Bio text, "Looking to meet" green highlight box.
Interests chips, vibe photo strip (3 photos).
"Block or report" text link at bottom.

### 16. Venue announcement (`(app)/(hoster)/announcement/[id].tsx`)
Header: "Send announcement" + "To N registered attendees".
Event summary card.
Message textarea (active, editable).
"Sends as push + in-app message" caption.
Quick templates: What to bring / Location change / Running late / Thank you chips.
Recent announcement preview card (text + delivery stats).
Footer: "Send to N attendees" primary button.

---

## Mock data strategy

Each screen defines a `MOCK_*` constant at the top of its file. No shared mock module. Phase 2 replaces each constant with a hook or service call. Example:

```typescript
// Phase 1
const MOCK_FEED_EVENTS: CommunityEvent[] = [ /* ... */ ]

// Phase 2 swap
const { events } = useUpcomingEvents()
```

---

## Out of scope for Phase 1

- Firestore reads/writes for any new screen
- Real image upload (photo slots render placeholder `image-slot` style grey boxes)
- Push notifications
- Real-time chat updates
- Points calculation logic
- Follow/block/report backend actions
- Suggested subgroups algorithm

---

## Build order

1. Tab bar update + stub screens (navigation works immediately)
2. Onboarding redesign + profile creation step
3. Discover feed + filters modal
4. Event detail redesign + registration confirmation + guest list
5. My Events redesign
6. Chats inbox + group chat + message requests
7. Profile redesign + badges + member profile
8. Venue announcement

---

## Testing notes (Phase 1)

- No unit tests required for pure UI screens
- Existing `EventCard` tests remain green (component unchanged)
- Manual smoke test: all 4 attender tabs reachable, all new routes navigable, no TypeScript errors (`pnpm tsc --noEmit`)
