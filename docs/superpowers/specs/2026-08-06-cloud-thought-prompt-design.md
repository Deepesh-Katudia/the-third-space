# Cloud Thought Prompt — Design

_2026-08-06. Source comp: `docs/cloud-thought-prompt.html`._

## Problem

The app teaches nothing. A member lands on Discover and has to infer that a ticket is
tappable, that My Events is where their RSVPs went, that a group chat exists at all. And
once they do know, nothing ever pulls them back toward the thing they were one tap away
from — an event tonight they registered for, a chat nobody has opened, a profile with no
face on it.

Both problems want the same affordance: a small piece of the app that speaks up at the
right moment, in a voice that is clearly the product's own rather than a system alert.

The comp answers it with a buttery-gold thought cloud that arrives as a *moment* — a
comet trail traces its path, it lands with an overshoot, its puffs bloom in one by one, a
shimmer sweeps across it, and only then does the text fade in. That layering is the whole
point: it should read as the app thinking at you, not as a dialog.

## Scope

**In:** the cloud component at comp fidelity; a catalogue of prompts covering both
navigation coaching and behavioural nudges; the eligibility rules that decide which one
fires; per-prompt memory so nothing nags.

**Out:** server-driven prompt content, A/B testing, analytics on dismissal, any prompt
that needs data the app does not already subscribe to.

## Decisions

### One cloud per screen entry, from two sources

Every route entry is an opportunity for exactly one cloud. Two sources feed it:

- **Coaching** — fires the first time an account reaches a surface, then never again.
  Self-limiting by construction.
- **Nudges** — fire when a condition over live data holds. *Not* self-limiting, which is
  the whole reason the cooldown below exists.

Coaching wins when both are eligible: a first-time visitor needs to be told what the
screen is before being told what to do on it.

### Nudges carry a per-id cooldown, coaching carries a seen-set

A nudge whose condition stays true — "you have no profile photo" — would otherwise fire
on every single Profile visit, which is the fastest way to make someone turn the feature
off. Each nudge records when it last fired and stays silent for **3 days**. Nudges that
get acted on never return anyway, because their condition goes false.

Coaching stores a flat seen-set instead. There is no cooldown because there is no second
showing.

Both live in one AsyncStorage record per uid:

```
cloudPrompts:<uid> → { coaching: string[], nudges: { [id]: ISO8601 } }
```

Local rather than Firestore, for the same reasons `services/rewardsSeen.ts` is local: this
decides whether a *presentation* plays, not what is true about the account. A new device
replaying one coaching hint is harmless; a Firestore write here would mean new rules, new
failure modes, and a hint lost to a dropped connection. A corrupt read degrades to empty.

### Route-driven watcher, not per-screen calls

`CloudPromptWatcher` mounts once per tab navigator, beside it rather than inside it —
the same position `RewardWatcher` already occupies, and for the same reason: the cloud is
a `Modal` and has to be able to land over a pushed route.

It reads `usePathname()` and consults the catalogue on each change. **No route file is
edited.** The alternative — a `useCloudPrompt('discover')` call in each screen — scatters
policy across eleven files and makes every new screen a place to forget.

### The catalogue is keyed on route *and* role

`(attender)/index.tsx` and `(hoster)/index.tsx` both resolve to pathname `/`. Keying on
pathname alone would show attenders the hoster's Overview hint. Each watcher is mounted
inside a role-specific layout and therefore already knows its role, so it passes that in
and catalogue entries carry a `role` field.

### Mounted for both roles

Unlike `RewardWatcher` — which hosters skip because every trackable reward keys off
attendance — navigation coaching is for everybody. The watcher mounts in
`(attender)/_layout.tsx` and `(hoster)/_layout.tsx`. Not in `(auth)`: onboarding does its
own explaining, and a cloud over a sign-in form is noise.

### Gold is a self-contained token group

The comp's palette — `#FFF3D2`, `#FFE9B0`, `#5C4108`, `#A87A0F`, `#8A6B17` — is not in
`palette` and must not be added to it. It goes into a `cloud` group in
`constants/design.ts`, exactly as `reward` did, so `__tests__/constants/tokens.test.ts`
keeps its empty allowlist and no literal hex enters `app/` or `components/`.

### Two deliberate departures from the comp

1. **Title and body render uppercase.** The comp sets them sentence case ("Don't just
   scroll. Show up."). The app's uppercase rule is app-wide, tokenised on all ten roles,
   and specified in `2026-08-02-uppercase-typography-design.md`. A single component
   opting out would be the first crack in it. Sizes still match the comp exactly (21 /
   9.5 / 9px) via per-role overrides, the way `RewardUnlock` overrides its own title.
2. **The two ✦ twinkles move outside the clip.** In the comp they sit inside
   `.cloud-body`, which is `overflow:hidden`, so they never render. Read as an accident
   and fixed rather than faithfully reproduced as invisible elements.

One departure is forced rather than chosen: **the entrance blur is dropped.** `cornerIn`
animates `filter: blur(9px) → 0`, and there is no animatable blur in React Native without
`expo-blur`, which the project deliberately does not carry. The overshoot, rotation,
translation and scale all survive, which is where the character of the landing actually
lives.

## Components

### `constants/design.ts` — `cloud` and `cloudMotion`

`cloud` holds the gold surface stops, the glow colour, type colours, CTA fill, trail and
comet colours, and the scrim. `cloudMotion` holds every timing from the comp in one
readable block, so the sequence can be asserted in order:

```
cometStagger 90 · cometFlash 700 · enterIn 1350 · bobCycle 5000 · bobDelay 1900
puffBloom 600 · puffStagger 100 · shimmerDelay 1150 · shimmerSweep 1100
eyebrowDelay 950 · titleDelay 1050 · bodyDelay 1150 · ctaDelay 1250 · trailDelay 1400
```

### `constants/cloudPrompts.ts` — the catalogue

One table, both kinds, one shape:

```ts
interface CloudPrompt {
  id: string
  kind: 'coaching' | 'nudge'
  role: 'attender' | 'hoster'
  routes: readonly string[]
  eyebrow: string
  title: string
  body: string
  cta: string
  href?: Href           // CTA navigates when present, otherwise just closes
  priority?: number     // nudges only; absent sorts last, ties broken by catalogue order
  condition?: (s: PromptState) => boolean   // nudges only
}
```

`PromptState` is the read-only snapshot the conditions run against, assembled by the
watcher from hooks that already exist — no new subscriptions:

```ts
interface PromptState {
  photoURL: string | null
  attendedCount: number
  upcomingRegistrations: readonly CommunityEvent[]
  unopenedEventChatIds: readonly string[]
  connectionsCount: number
}
```

Coaching, one per surface — attender: Discover, My Events, Chats, Profile. Hoster:
Overview, Events, Venue.

Nudges, all five over data the app already subscribes to:

| id | condition | route |
|---|---|---|
| `event-today` | a registered event starts today | Discover |
| `rsvp-chat-unopened` | registered for an upcoming event whose chat has never been read | My Events |
| `no-rsvp-yet` | zero attended, zero upcoming registrations | Discover |
| `no-connections` | zero mutual connections | Chats |
| `no-photo` | `profile.photoURL` is null | Profile |

Priority runs in that order. `event-today` outranks the rest because it expires.

### `utils/cloudPrompts.ts` — eligibility, pure

```ts
pickPrompt(input: {
  route: string
  role: Role
  state: PromptState
  seen: SeenPrompts
  now: Date
}): CloudPrompt | null
```

Strict order: an unseen coaching entry matching route+role wins; otherwise the
highest-priority nudge matching route+role whose `condition` holds and whose cooldown has
expired; otherwise `null`. No I/O, no hooks — the same split as `utils/authRoute.ts`, and
the reason nearly all the testing lands here.

### `services/cloudPromptsSeen.ts`

`getSeenPrompts(uid)` / `markCoachingSeen(uid, id)` / `markNudgeFired(uid, id, when)`.
Mirrors `rewardsSeen.ts`: union-not-append so repeats are idempotent, and every failure
path degrades to empty rather than throwing, because an unreadable record must never
block a screen.

Marked on **queue**, not on dismiss — a force-quit mid-animation should not mean the same
cloud every launch, which is the lesson already encoded in `RewardWatcher`.

### `components/CloudPrompt.tsx`

Presentational and fully driven by props: `prompt`, `onDismiss`, `onAct`. Renders in a
`Modal` with `statusBarTranslucent` so it covers the tab bar — a cloud that left
navigation chrome visible would be a toast, not a moment.

Structure, outside-in: scrim (`cloud.scrim`, a translucent wash in the field's own tone,
standing in for the comp's `opacity: 0.4` backdrop, which a `Modal` cannot apply to the
screen beneath) → six comet dots → cloud wrap → SVG glow → gradient body with clipped
puffs and shimmer → text cascade → trail dots.

Motion, beat by beat:

| Beat | Implementation |
|---|---|
| comet trail | 6 `Animated` dots + concentric halo rings — no `box-shadow` in RN, same trick `AmbientBackdrop` uses for its glows |
| `cornerIn` | `Easing.bezier(.2,.75,.15,1.15)`; the >1 control point produces the overshoot for free |
| `cloudBob` | composed onto the entrance translateY with `Animated.add`, so both transforms survive |
| glow | `react-native-svg` `RadialGradient`, 300×240, as `RewardUnlock` does for its halo |
| puffs | `Easing.bezier(.3,1.4,.4,1)`, 100ms stagger, **clipped by the body's `overflow:hidden`** exactly as in the comp |
| shimmer | `LinearGradient` band, `skewX(-18deg)` + animated translateX, once |
| text | four staggered fades, translateY 6 → 0 |

Every animation uses the native driver.

**Reduced motion collapses the whole sequence to a straight fade** — no comet, no bob, no
shimmer, no bloom. Something must still mark the arrival or the cloud blinks into
existence, which is the rule `RewardUnlock` already follows. `useReduceMotion` starts at
`true`, so the in-flight probe counts as reduced and no loop ever starts at a user who
asked not to be animated at.

Dismissal: the CTA calls `onAct` (which navigates when the prompt carries an `href`,
otherwise closes); tapping the scrim calls `onDismiss`; Android back is wired through
`onRequestClose`. The cloud itself swallows taps so a mis-hit inside it does not close it.

### `components/CloudPromptWatcher.tsx`

Assembles `PromptState` from the hooks already in the app — `useProfile`,
`useUpcomingEvents`, `useChatList`, `useAttendanceStats`, `useConnections` — watches
`usePathname()`, and on each change loads the seen record, calls `pickPrompt`, and shows
the result. Clears on uid change so a sign-out mid-cloud does not hand the next account
someone else's prompt.

Only fires on route *entry*: a re-render at the same pathname must not re-raise a cloud.

## Data flow

```
route change ──► CloudPromptWatcher
                   │  reads: pathname, role, live hooks, AsyncStorage seen record
                   ▼
                 pickPrompt()          ← pure, fully unit-tested
                   │  coaching unseen? → that. else eligible nudge? → highest priority. else null
                   ▼
                 mark seen / fired (on queue)
                   ▼
                 <CloudPrompt/>  ── CTA ──► router.push(href)
                                 └─ scrim ─► close
```

## Error handling

- A corrupt or unreadable seen record reads as empty. Worst case is one replayed cloud.
- A failed write means a cloud may repeat next launch. Accepted, and never thrown — an
  exception here would surface as a crash immediately after a friendly moment.
- A prompt whose `href` no longer resolves: `href` is typed as expo-router's `Href`, so a
  dead route is a compile error rather than a runtime one.
- A prompt id present in the seen record but gone from the catalogue is ignored, so
  retiring a prompt needs no migration.

## Testing

Unit, on `utils/cloudPrompts.ts` — the bulk of it, since the logic is pure:

- coaching beats an eligible nudge on the same route
- coaching fires once and never again
- role disambiguates the shared `/` pathname between attender and hoster
- a nudge inside its cooldown is skipped; one exactly at the boundary is eligible
- highest priority wins among several eligible nudges
- no eligible prompt returns `null`
- every catalogue entry's `routes` are real, and `kind: 'nudge'` and the presence of
  `condition` agree in **both** directions — the same two-way guard
  `__tests__/utils/rewards.test.ts` puts on `trackable`

Service: seen-record round trip, idempotent marking, corrupt-JSON degradation.

Component: renders title/body/CTA, CTA and scrim fire their callbacks, reduced motion
renders without starting loops.

Tokens: `design.test.ts` gains a guard on the new group; `tokens.test.ts` must stay green
with its allowlist still empty.

## Follow-up, explicitly not in this change

Prompt content is hardcoded in `constants/cloudPrompts.ts`. If prompts ever need to change
without a release, the catalogue is the seam to move to Firestore — `pickPrompt` takes the
catalogue as data and would not change.
