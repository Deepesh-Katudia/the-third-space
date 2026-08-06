# Cloud Thought Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A buttery-gold thought cloud that arrives over any tab screen to teach navigation on first visit and nudge behaviour thereafter, at the fidelity of `docs/cloud-thought-prompt.html`.

**Architecture:** One `CloudPromptWatcher` per tab navigator reads `usePathname()` and asks a pure `pickPrompt()` which entry of a static catalogue — if any — should fire, given the account's live state and an AsyncStorage record of what has already been shown. The chosen entry renders through a presentational `CloudPrompt` modal. No route file is edited.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, expo-router v6, `Animated` (native driver throughout), `react-native-svg` (radial glow), `expo-linear-gradient` (body + shimmer), AsyncStorage, Jest (jest-expo) + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-08-06-cloud-thought-prompt-design.md`

## Global Constraints

- **All work happens in `thirdspace-app/`.** Every path below is relative to it; every command runs from it.
- **No literal hex outside `constants/design.ts`.** `__tests__/constants/tokens.test.ts` scans `app/` and `components/` for quoted hex and its allowlist is empty and must stay empty.
- **Every type role is uppercase, app-wide.** Never write `textTransform` inline — use the `Display`/`Body`/`Meta` primitives from `components/ui/Text`, which carry it via the role token.
- **`useReduceMotion()` starts at `true`.** The in-flight probe counts as reduced. Never start a loop optimistically.
- **Every animation uses `useNativeDriver: true`.**
- **Dynamic routes use object form**: `router.push({ pathname: '/(app)/x/[id]', params })`. Static routes may use the string form.
- **Commit after every task.** Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`.
- **Verification commands:** `npx tsc --noEmit` and `npx jest`. Baseline before this plan: tsc clean, 413/413 tests passing across 57 suites.

---

### Task 1: Cloud design tokens

**Files:**
- Modify: `constants/design.ts` (append after the `rewardMotion` block, before `export const font`)
- Test: `__tests__/constants/design.test.ts` (append a new `describe`)

**Interfaces:**
- Consumes: nothing.
- Produces: `cloud` (colour tokens) and `cloudMotion` (timings, ms) exported from `constants/design.ts`. Every later task imports from here.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/constants/design.test.ts`. Note the existing `contrast()` and `luminance()` helpers at the top of that file — reuse them, do not redefine them. Also add `cloud, cloudMotion` to the existing import on line 1.

```ts
describe('cloud prompt tokens', () => {
  const BODY_STOPS = [cloud.bodyTop, cloud.bodyBottom]

  it('reads every type colour at AA on BOTH gradient stops of the cloud body', () => {
    // The body is a 180deg gradient, so one value has to work at the top and the
    // bottom alike — a component must never pick a variant based on its position.
    // The comp's own #A87A0F (3.49:1) and #8A6B17 (4.18:1) both failed this and
    // were darkened. See the spec's contrast table.
    for (const stop of BODY_STOPS) {
      expect(contrast(cloud.eyebrow, stop)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(cloud.title, stop)).toBeGreaterThanOrEqual(4.5)
      expect(contrast(cloud.body, stop)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('reads the CTA label at AA on the CTA fill', () => {
    expect(contrast(cloud.ctaLabel, cloud.ctaFill)).toBeGreaterThanOrEqual(4.5)
  })

  it('orders the entrance so text lands only after the body has', () => {
    // The whole point of the comp is layering. If text beat the puffs in, it would
    // read as a slide-in with a caption rather than something forming.
    expect(cloudMotion.puffFirstDelay).toBeLessThan(cloudMotion.eyebrowDelay)
    expect(cloudMotion.eyebrowDelay).toBeLessThan(cloudMotion.titleDelay)
    expect(cloudMotion.titleDelay).toBeLessThan(cloudMotion.bodyDelay)
    expect(cloudMotion.bodyDelay).toBeLessThan(cloudMotion.ctaDelay)
    expect(cloudMotion.ctaDelay).toBeLessThan(cloudMotion.trailDelay)
  })

  it('starts the bob only after the entrance has finished', () => {
    // Overlapping them would fight the landing's overshoot.
    expect(cloudMotion.bobDelay).toBeGreaterThanOrEqual(cloudMotion.enterIn)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/constants/design.test.ts`
Expected: FAIL — TypeScript/module error, `cloud` is not exported from `constants/design`.

- [ ] **Step 3: Write the tokens**

Append to `constants/design.ts`, immediately after the `rewardMotion` block:

```ts
/**
 * The cloud thought prompt. Source comp: docs/cloud-thought-prompt.html. Spec:
 * docs/superpowers/specs/2026-08-06-cloud-thought-prompt-design.md
 *
 * Buttery gold, and deliberately NOT in `palette` — same arrangement as `reward` above.
 * The cloud is the app speaking up rather than a surface the app is made of, so it gets
 * its own closed set of values that nothing else may reach for.
 *
 * Two of the comp's golds were darkened because they failed AA on the cloud's own body:
 * the eyebrow was #A87A0F (3.49:1) and the body text #8A6B17 (4.18:1), both at 9px,
 * which is the worst case in the design. Exactly what the palette already did to the
 * comp's #5C4F3F, #C4501F and #6E7A5E. The title and CTA keep their comp values.
 */
export const cloud = {
  /**
   * Washes the screen underneath toward the field's own tone. The comp fades its
   * backdrop to 0.4 opacity, which a Modal cannot do to the screen beneath it, so the
   * same result is reached from the other side with a translucent wash in orangeDeep.
   */
  scrim: 'rgba(243,178,122,0.62)',

  /** The body's 180deg gradient, top and bottom stop. */
  bodyTop: '#FFF3D2',
  bodyBottom: '#FFE9B0',
  /** Inset hairline and drop shadow that lift the body off the scrim. */
  bodyRim: 'rgba(255,255,255,0.5)',
  bodyShadow: 'rgba(138,58,23,0.22)',

  /**
   * Three puffs across the top. They are CLIPPED by the body's own rounded corners —
   * that is the comp's behaviour, not an oversight, and it is what turns them from
   * cartoon bumps into a faint bloom of texture inside the top edge.
   */
  puffLight: '#FFF3D2',
  puffMid: '#FFEEC0',

  /** Radial halo behind the whole cloud. Needs real SVG, like the reward glow. */
  glowCore: 'rgba(255,214,140,0.55)',
  glowEdge: 'rgba(255,214,140,0)',

  /**
   * Comet dot and the ring faking its glow — there is no box-shadow in React Native,
   * so falloff is a concentric ring, the same trick AmbientBackdrop uses.
   *
   * Very nearly white, which the palette forbids over orange for TEXT (1.83:1). These
   * carry no information, so contrast does not apply. Do not "fix" this by darkening it.
   */
  comet: '#FFF8E8',
  cometHalo: 'rgba(255,238,190,0.35)',
  /** The two ✦ above the cloud. Decorative, same exemption. */
  twinkle: '#FFF8E8',

  /** Shimmer band, swept across the body exactly once after it lands. */
  shimmerEdge: 'rgba(255,255,255,0)',
  shimmerCore: 'rgba(255,255,255,0.75)',

  /** Type inside the cloud. Eyebrow and body darkened from the comp for AA. */
  eyebrow: '#856010',
  title: '#5C4108',
  body: '#7A5A14',

  /** The CTA inverts: dark gold fill, pale gold label. */
  ctaFill: '#5C4108',
  ctaLabel: '#FFF3D2',

  /** Three shrinking dots below the cloud — the thought-bubble tail. */
  trail: '#FFE9B0',
} as const

/**
 * Cloud motion, in milliseconds, lifted from the comp's keyframes. Held in one block
 * so the ordering of the five beats is readable at a glance and assertable in tests.
 *
 * The beats: comets trace the path, the cloud lands with an overshoot, the puffs bloom
 * in one by one, a shimmer sweeps across once, and the text arrives last. Collapse any
 * of that ordering and it stops being a moment and becomes a slide-in.
 */
export const cloudMotion = {
  /** Six sparks along the path, each a single flash. */
  cometFlash: 700,
  cometStagger: 90,

  /** The landing, and the idle bob that takes over once it has settled. */
  enterIn: 1350,
  bobDelay: 1900,
  bobCycle: 5000,

  /** The halo fades up during the landing, then breathes. */
  glowInDelay: 300,
  glowIn: 1350,
  glowCycle: 4000,

  /** Puffs, blooming individually so the cloud reads as still forming. */
  puffBloom: 600,
  puffFirstDelay: 620,
  puffStagger: 100,

  /** One sweep, once, after it has settled. */
  shimmerDelay: 1150,
  shimmerSweep: 1100,

  /** Text cascade, last. */
  textIn: 550,
  eyebrowDelay: 950,
  titleDelay: 1050,
  bodyDelay: 1150,
  ctaDelay: 1250,
  trailDelay: 1400,

  /** The two ✦, long after everything else. */
  twinkleDelay: 2200,
  twinkleCycle: 3000,

  /** Reduced motion: one fade for the whole thing, and no loops at all. */
  reducedIn: 200,
} as const
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/constants/ && npx tsc --noEmit`
Expected: PASS. `tokens.test.ts` must still pass — the new hex all lives in `constants/`, which that scanner does not walk.

- [ ] **Step 5: Commit**

```bash
git add constants/design.ts __tests__/constants/design.test.ts
git commit -m "feat: add cloud prompt tokens, with the comp's two failing golds darkened for AA"
```

---

### Task 2: The prompt catalogue

**Files:**
- Create: `constants/cloudPrompts.ts`
- Test: `__tests__/constants/cloudPrompts.test.ts`

**Interfaces:**
- Consumes: `CommunityEvent` from `types/models`, `Href` from `expo-router`.
- Produces:
  - `type PromptKind = 'coaching' | 'nudge'`
  - `type PromptRole = 'attender' | 'hoster'`
  - `interface PromptState { photoURL: string | null; attendedCount: number; upcomingRegistrations: readonly CommunityEvent[]; unopenedEventChatIds: readonly string[]; connectionsCount: number }`
  - `interface CloudPrompt { id; kind; role; routes; eyebrow; title; body; cta; href?; priority?; condition? }`
  - `const CLOUD_ROUTES` — every pathname the catalogue may reference
  - `const CLOUD_PROMPTS: readonly CloudPrompt[]`
  - `function startsToday(event: CommunityEvent, now: Date): boolean`

- [ ] **Step 1: Write the failing test**

Create `__tests__/constants/cloudPrompts.test.ts`:

```ts
import { CLOUD_PROMPTS, CLOUD_ROUTES, startsToday } from '../../constants/cloudPrompts'
import type { CommunityEvent } from '../../types/models'
import { Timestamp } from 'firebase/firestore'

function eventAt(date: Date): CommunityEvent {
  return {
    id: 'e1', title: 'T', description: '', category: 'touch-grass',
    startsAt: Timestamp.fromDate(date), capacity: 10, ageRequirement: 'all-ages',
    venueId: 'v1', venueName: 'V', neighborhood: 'N', registeredCount: 1,
  }
}

describe('cloud prompt catalogue', () => {
  it('gives every entry a unique id', () => {
    const ids = CLOUD_PROMPTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only references routes that are in the route table', () => {
    for (const prompt of CLOUD_PROMPTS) {
      for (const route of prompt.routes) {
        expect(CLOUD_ROUTES).toContain(route)
      }
    }
  })

  // Two-way guard, the same shape as __tests__/utils/rewards.test.ts puts on `trackable`.
  // A nudge with no condition would fire forever; a coaching entry WITH one would be a
  // nudge wearing the wrong label and would skip the cooldown. Both must fail here.
  it('gives every nudge a condition and a priority, and every coaching entry neither', () => {
    for (const prompt of CLOUD_PROMPTS) {
      if (prompt.kind === 'nudge') {
        expect(typeof prompt.condition).toBe('function')
        expect(typeof prompt.priority).toBe('number')
      } else {
        expect(prompt.condition).toBeUndefined()
        expect(prompt.priority).toBeUndefined()
      }
    }
  })

  it('gives each role exactly one coaching entry per route it owns', () => {
    for (const role of ['attender', 'hoster'] as const) {
      const coaching = CLOUD_PROMPTS.filter((p) => p.kind === 'coaching' && p.role === role)
      const routes = coaching.flatMap((p) => p.routes)
      expect(new Set(routes).size).toBe(routes.length)
    }
  })

  it('gives nudges distinct priorities so ordering never depends on catalogue order', () => {
    const priorities = CLOUD_PROMPTS.filter((p) => p.kind === 'nudge').map((p) => p.priority)
    expect(new Set(priorities).size).toBe(priorities.length)
  })
})

describe('startsToday', () => {
  it('is true for an event later the same calendar day', () => {
    const now = new Date('2026-08-06T09:00:00Z')
    expect(startsToday(eventAt(new Date('2026-08-06T20:00:00Z')), now)).toBe(true)
  })

  it('is false for tomorrow, however few hours away', () => {
    const now = new Date('2026-08-06T23:00:00Z')
    expect(startsToday(eventAt(new Date('2026-08-07T01:00:00Z')), now)).toBe(false)
  })

  it('is false for an event earlier the same day', () => {
    // "Tonight's the night" must not fire at 11pm about a brunch that already happened.
    const now = new Date('2026-08-06T23:00:00Z')
    expect(startsToday(eventAt(new Date('2026-08-06T10:00:00Z')), now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/constants/cloudPrompts.test.ts`
Expected: FAIL — `Cannot find module '../../constants/cloudPrompts'`.

- [ ] **Step 3: Write the catalogue**

Create `constants/cloudPrompts.ts`:

```ts
import type { Href } from 'expo-router'
import type { CommunityEvent } from '../types/models'

/**
 * Everything the cloud can say, in one table. Source comp: docs/cloud-thought-prompt.html.
 * Spec: docs/superpowers/specs/2026-08-06-cloud-thought-prompt-design.md
 *
 * Two kinds share one shape. COACHING fires the first time an account reaches a surface
 * and then never again — self-limiting by construction. NUDGES fire on a condition over
 * live data and are NOT self-limiting, which is the entire reason `utils/cloudPrompts.ts`
 * puts a cooldown in front of them.
 *
 * Content is hardcoded on purpose. If prompts ever need to change without a release,
 * this table is the seam to move to Firestore — `pickPrompt` already takes the catalogue
 * as data and would not change.
 */

export type PromptKind = 'coaching' | 'nudge'
export type PromptRole = 'attender' | 'hoster'

/**
 * The snapshot a nudge's condition runs against. Deliberately a closed set of five
 * fields, all assembled from hooks and services that already exist — a nudge must not
 * be able to quietly demand a new Firestore subscription.
 */
export interface PromptState {
  photoURL: string | null
  attendedCount: number
  upcomingRegistrations: readonly CommunityEvent[]
  unopenedEventChatIds: readonly string[]
  connectionsCount: number
}

export interface CloudPrompt {
  id: string
  kind: PromptKind
  /**
   * `(attender)/index` and `(hoster)/index` BOTH resolve to the pathname '/'. Keying on
   * route alone would show attenders the hoster's Overview hint. Each watcher is mounted
   * inside a role-specific layout, so it supplies this.
   */
  role: PromptRole
  routes: readonly string[]
  eyebrow: string
  title: string
  body: string
  cta: string
  /** When present the CTA navigates here; otherwise it just closes the cloud. */
  href?: Href
  /** Nudges only. Lower fires first. */
  priority?: number
  /**
   * Nudges only. Takes the clock as an argument rather than calling `new Date()` —
   * a condition that reads the wall clock itself is untestable through `pickPrompt`.
   */
  condition?: (state: PromptState, now: Date) => boolean
}

/**
 * Every pathname the catalogue may reference. expo-router strips group segments, so
 * `(app)/(attender)/my-events.tsx` is '/my-events' and both index routes are '/'.
 */
export const CLOUD_ROUTES = [
  '/',            // attender Discover, hoster Overview
  '/my-events',
  '/chats',
  '/profile',
  '/events',      // hoster
  '/venue',       // hoster
] as const

/** Same calendar day AND still ahead — an event that already ended is not "tonight". */
export function startsToday(event: CommunityEvent, now: Date): boolean {
  const start = event.startsAt.toDate()
  if (start.getTime() < now.getTime()) return false
  return (
    start.getFullYear() === now.getFullYear() &&
    start.getMonth() === now.getMonth() &&
    start.getDate() === now.getDate()
  )
}

export const CLOUD_PROMPTS: readonly CloudPrompt[] = [
  // ── Coaching: attender ──────────────────────────────────────────────────
  {
    id: 'coach-discover',
    kind: 'coaching',
    role: 'attender',
    routes: ['/'],
    eyebrow: 'just a thought',
    title: 'This is the whole point.',
    body: 'Every ticket is a real room, on a real night. Tap one to see who else said yes.',
    cta: 'Got it',
  },
  {
    id: 'coach-my-events',
    kind: 'coaching',
    role: 'attender',
    routes: ['/my-events'],
    eyebrow: 'just a thought',
    title: 'Everything you said yes to.',
    body: 'Upcoming, hosting and past all live here — each with its own group chat.',
    cta: 'Got it',
  },
  {
    id: 'coach-chats',
    kind: 'coaching',
    role: 'attender',
    routes: ['/chats'],
    eyebrow: 'just a thought',
    title: 'The room before the room.',
    body: 'Joining an event opens its group chat. Someone has to speak first.',
    cta: 'Got it',
  },
  {
    id: 'coach-profile',
    kind: 'coaching',
    role: 'attender',
    routes: ['/profile'],
    eyebrow: 'just a thought',
    title: 'This is how people find you.',
    body: 'A photo, a neighbourhood, a few things you are into. Keep it honest.',
    cta: 'Got it',
  },

  // ── Coaching: hoster ────────────────────────────────────────────────────
  {
    id: 'coach-overview',
    kind: 'coaching',
    role: 'hoster',
    routes: ['/'],
    eyebrow: 'just a thought',
    title: 'Your nights, at a glance.',
    body: 'Who registered, what is coming up, and the announcements you have sent.',
    cta: 'Got it',
  },
  {
    id: 'coach-events',
    kind: 'coaching',
    role: 'hoster',
    routes: ['/events'],
    eyebrow: 'just a thought',
    title: 'Everything you have put on.',
    body: 'Create, edit or cancel. A cancelled night stays on the books rather than vanishing.',
    cta: 'Got it',
  },
  {
    id: 'coach-venue',
    kind: 'coaching',
    role: 'hoster',
    routes: ['/venue'],
    eyebrow: 'just a thought',
    title: 'People come for the room.',
    body: 'Name it and place it once — every event you create inherits all of it.',
    cta: 'Got it',
  },

  // ── Nudges: attender only ───────────────────────────────────────────────
  // Priority is explicit and distinct so ordering never depends on this array's order.
  {
    id: 'event-today',
    kind: 'nudge',
    role: 'attender',
    routes: ['/'],
    priority: 1, // outranks everything: it expires at midnight
    eyebrow: 'just a thought',
    title: 'Tonight is the night.',
    body: 'You said yes to something today. It is still on.',
    cta: "I'm going",
    href: '/(app)/(attender)/my-events',
    condition: (s, now) => s.upcomingRegistrations.some((e) => startsToday(e, now)),
  },
  {
    id: 'rsvp-chat-unopened',
    kind: 'nudge',
    role: 'attender',
    routes: ['/my-events'],
    priority: 2,
    eyebrow: 'just a thought',
    title: 'They are already talking.',
    body: 'One of your events has a chat you have not opened yet.',
    cta: 'Open it',
    href: '/(app)/(attender)/chats',
    condition: (s) => s.unopenedEventChatIds.length > 0,
  },
  {
    id: 'no-rsvp-yet',
    kind: 'nudge',
    role: 'attender',
    routes: ['/'],
    priority: 3,
    // The comp's own copy. This is the prompt the whole design was drawn for.
    eyebrow: 'just a thought',
    title: "Don't just scroll. Show up.",
    body: "There's a spot open tonight. You know the one.",
    cta: "I'm in",
    // No href: they are already looking at the answer.
    condition: (s) => s.attendedCount === 0 && s.upcomingRegistrations.length === 0,
  },
  {
    id: 'no-connections',
    kind: 'nudge',
    role: 'attender',
    routes: ['/chats'],
    priority: 4,
    eyebrow: 'just a thought',
    title: 'Nobody is a stranger twice.',
    body: 'Follow someone who follows you back and you can message them directly.',
    cta: 'Got it',
    condition: (s) => s.connectionsCount === 0,
  },
  {
    id: 'no-photo',
    kind: 'nudge',
    role: 'attender',
    routes: ['/profile'],
    priority: 5,
    eyebrow: 'just a thought',
    title: 'Put a face to the name.',
    body: 'A photo makes it far likelier someone says hi when you walk in.',
    cta: 'Add one',
    href: '/(app)/edit-profile',
    condition: (s) => s.photoURL === null,
  },
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/constants/cloudPrompts.test.ts && npx tsc --noEmit`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add constants/cloudPrompts.ts __tests__/constants/cloudPrompts.test.ts
git commit -m "feat: add the cloud prompt catalogue — 7 coaching hints, 5 nudges"
```

---

### Task 3: The seen/fired record

**Files:**
- Create: `services/cloudPromptsSeen.ts`
- Test: `__tests__/services/cloudPromptsSeen.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface SeenPrompts { coaching: string[]; nudges: Record<string, string> }`
  - `getSeenPrompts(uid: string): Promise<SeenPrompts>`
  - `markCoachingSeen(uid: string, id: string): Promise<void>`
  - `markNudgeFired(uid: string, id: string, when: Date): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `__tests__/services/cloudPromptsSeen.test.ts`. This mirrors `__tests__/services/rewardsSeen.test.ts` — read that file first for the AsyncStorage mocking convention.

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../../services/cloudPromptsSeen'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const getItem = AsyncStorage.getItem as jest.Mock
const setItem = AsyncStorage.setItem as jest.Mock

describe('cloudPromptsSeen', () => {
  beforeEach(() => {
    getItem.mockReset()
    setItem.mockReset()
    setItem.mockResolvedValue(undefined)
  })

  it('returns an empty record for an account that has seen nothing', async () => {
    getItem.mockResolvedValue(null)
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('keys storage per uid, so two accounts on one phone do not collide', async () => {
    getItem.mockResolvedValue(null)
    await markCoachingSeen('u1', 'coach-discover')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: ['coach-discover'], nudges: {} }),
    )
  })

  it('unions coaching ids rather than appending, so repeat calls stay idempotent', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['coach-discover'], nudges: {} }))
    await markCoachingSeen('u1', 'coach-discover')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: ['coach-discover'], nudges: {} }),
    )
  })

  it('overwrites a nudge timestamp rather than accumulating them', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: [], nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' } }))
    await markNudgeFired('u1', 'no-photo', new Date('2026-08-06T12:00:00.000Z'))
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: [], nudges: { 'no-photo': '2026-08-06T12:00:00.000Z' } }),
    )
  })

  it('keeps the two halves independent', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['coach-chats'], nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' } }))
    await markCoachingSeen('u1', 'coach-profile')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({
        coaching: ['coach-chats', 'coach-profile'],
        nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' },
      }),
    )
  })

  it('degrades unreadable JSON to empty rather than throwing', async () => {
    // An unreadable record must never block a screen. Worst case is one replayed cloud.
    getItem.mockResolvedValue('{ not json')
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('degrades a record of the wrong shape to empty', async () => {
    getItem.mockResolvedValue(JSON.stringify(['coach-discover']))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('drops non-string members rather than trusting the record wholesale', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['ok', 7, null], nudges: { a: 3, b: '2026-08-01T00:00:00.000Z' } }))
    expect(await getSeenPrompts('u1')).toEqual({
      coaching: ['ok'],
      nudges: { b: '2026-08-01T00:00:00.000Z' },
    })
  })

  it('swallows a failed write', async () => {
    // A throw here would surface as a crash immediately after a friendly moment.
    getItem.mockResolvedValue(null)
    setItem.mockRejectedValue(new Error('disk full'))
    await expect(markNudgeFired('u1', 'no-photo', new Date())).resolves.toBeUndefined()
  })

  it('reads through a failed read as empty', async () => {
    getItem.mockRejectedValue(new Error('unavailable'))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/cloudPromptsSeen.test.ts`
Expected: FAIL — `Cannot find module '../../services/cloudPromptsSeen'`.

- [ ] **Step 3: Write the service**

Create `services/cloudPromptsSeen.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Which cloud prompts this device has already shown.
 *
 * Local, not Firestore, for the same reason `services/rewardsSeen.ts` is local: this
 * decides whether a PRESENTATION plays, not what is true about the account. A new
 * device replaying one coaching hint is harmless — whereas a Firestore write here
 * would mean new rules, new failure modes, and a hint lost to a dropped connection.
 *
 * Two halves, because the two kinds forget differently. Coaching is a flat seen-set:
 * there is no second showing, so there is nothing to time. Nudges keep a timestamp per
 * id, because their condition can stay true indefinitely and something has to stop
 * "you have no profile photo" from firing on every single Profile visit.
 *
 * Keyed per uid so two accounts on one phone do not eat each other's prompts.
 */
const KEY_PREFIX = 'cloudPrompts:'

export interface SeenPrompts {
  /** Coaching ids already shown. Order is insertion order; nothing depends on it. */
  coaching: string[]
  /** Nudge id -> ISO8601 of its last firing. */
  nudges: Record<string, string>
}

const empty = (): SeenPrompts => ({ coaching: [], nudges: {} })

function key(uid: string): string {
  return KEY_PREFIX + uid
}

/**
 * Narrows an unknown parsed record field by field. A partially corrupt record keeps
 * whatever is still well-formed rather than being thrown away wholesale — losing one
 * bad entry replays one cloud, losing the record replays all of them.
 */
function parse(raw: string): SeenPrompts {
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return empty()

  const record = parsed as { coaching?: unknown; nudges?: unknown }

  const coaching = Array.isArray(record.coaching)
    ? record.coaching.filter((id): id is string => typeof id === 'string')
    : []

  const nudges: Record<string, string> = {}
  if (typeof record.nudges === 'object' && record.nudges !== null && !Array.isArray(record.nudges)) {
    for (const [id, when] of Object.entries(record.nudges as Record<string, unknown>)) {
      if (typeof when === 'string') nudges[id] = when
    }
  }

  return { coaching, nudges }
}

export async function getSeenPrompts(uid: string): Promise<SeenPrompts> {
  try {
    const raw = await AsyncStorage.getItem(key(uid))
    if (!raw) return empty()
    return parse(raw)
  } catch {
    // An unreadable record must not block the screen. Treating it as empty replays a
    // cloud at worst; throwing would take the route down with it.
    return empty()
  }
}

async function write(uid: string, next: SeenPrompts): Promise<void> {
  try {
    await AsyncStorage.setItem(key(uid), JSON.stringify(next))
  } catch {
    // A failed write means the cloud may repeat next launch. Acceptable; a thrown error
    // here would surface as a crash right after a friendly moment.
  }
}

/** Union, not append — repeated calls with the same id stay idempotent. */
export async function markCoachingSeen(uid: string, id: string): Promise<void> {
  const existing = await getSeenPrompts(uid)
  if (existing.coaching.includes(id)) {
    await write(uid, existing)
    return
  }
  await write(uid, { ...existing, coaching: [...existing.coaching, id] })
}

/** Overwrites, not accumulates — only the most recent firing can start a cooldown. */
export async function markNudgeFired(uid: string, id: string, when: Date): Promise<void> {
  const existing = await getSeenPrompts(uid)
  await write(uid, { ...existing, nudges: { ...existing.nudges, [id]: when.toISOString() } })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/cloudPromptsSeen.test.ts && npx tsc --noEmit`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add services/cloudPromptsSeen.ts __tests__/services/cloudPromptsSeen.test.ts
git commit -m "feat: record which cloud prompts a device has shown"
```

---

### Task 4: Eligibility — `pickPrompt`

**Files:**
- Create: `utils/cloudPrompts.ts`
- Test: `__tests__/utils/cloudPrompts.test.ts`

**Interfaces:**
- Consumes: `CLOUD_PROMPTS`, `CloudPrompt`, `PromptRole`, `PromptState` from `constants/cloudPrompts`; `SeenPrompts` from `services/cloudPromptsSeen`.
- Produces:
  - `const NUDGE_COOLDOWN_DAYS = 3`
  - `interface PickPromptInput { route: string; role: PromptRole; state: PromptState; seen: SeenPrompts; now: Date; catalogue?: readonly CloudPrompt[] }`
  - `pickPrompt(input: PickPromptInput): CloudPrompt | null`

- [ ] **Step 1: Write the failing test**

Create `__tests__/utils/cloudPrompts.test.ts`:

```ts
import { pickPrompt, NUDGE_COOLDOWN_DAYS } from '../../utils/cloudPrompts'
import type { CloudPrompt, PromptState } from '../../constants/cloudPrompts'
import type { SeenPrompts } from '../../services/cloudPromptsSeen'

const NOTHING: PromptState = {
  photoURL: 'https://example.test/a.jpg',
  attendedCount: 4,
  upcomingRegistrations: [],
  unopenedEventChatIds: [],
  connectionsCount: 3,
}

const FRESH: SeenPrompts = { coaching: [], nudges: {} }

const base = { eyebrow: 'e', title: 't', body: 'b', cta: 'c' } as const

const coach: CloudPrompt = { id: 'coach', kind: 'coaching', role: 'attender', routes: ['/'], ...base }
const hosterCoach: CloudPrompt = { id: 'hoster-coach', kind: 'coaching', role: 'hoster', routes: ['/'], ...base }
const loud: CloudPrompt = { id: 'loud', kind: 'nudge', role: 'attender', routes: ['/'], priority: 1, condition: () => true, ...base }
const quiet: CloudPrompt = { id: 'quiet', kind: 'nudge', role: 'attender', routes: ['/'], priority: 9, condition: () => true, ...base }
const never: CloudPrompt = { id: 'never', kind: 'nudge', role: 'attender', routes: ['/'], priority: 2, condition: () => false, ...base }

const pick = (catalogue: CloudPrompt[], over: Partial<Parameters<typeof pickPrompt>[0]> = {}) =>
  pickPrompt({ route: '/', role: 'attender', state: NOTHING, seen: FRESH, now: new Date('2026-08-06T12:00:00Z'), catalogue, ...over })

describe('pickPrompt', () => {
  it('returns null when nothing matches the route', () => {
    expect(pick([coach], { route: '/chats' })).toBeNull()
  })

  it('shows an unseen coaching hint', () => {
    expect(pick([coach])?.id).toBe('coach')
  })

  it('prefers coaching over an eligible nudge on the same route', () => {
    // A first-time visitor needs to be told what the screen IS before what to do on it.
    expect(pick([loud, coach])?.id).toBe('coach')
  })

  it('never shows a coaching hint twice', () => {
    const seen: SeenPrompts = { coaching: ['coach'], nudges: {} }
    expect(pick([coach], { seen })).toBeNull()
  })

  it('falls through to a nudge once the coaching hint has been seen', () => {
    const seen: SeenPrompts = { coaching: ['coach'], nudges: {} }
    expect(pick([coach, loud], { seen })?.id).toBe('loud')
  })

  it('uses role to disambiguate the shared "/" pathname', () => {
    // (attender)/index and (hoster)/index both resolve to '/'. Without the role check
    // an attender would be shown the hoster's Overview hint.
    expect(pick([hosterCoach, coach])?.id).toBe('coach')
    expect(pick([hosterCoach, coach], { role: 'hoster' })?.id).toBe('hoster-coach')
  })

  it('skips a nudge whose condition is false', () => {
    expect(pick([never])).toBeNull()
  })

  it('picks the lowest priority number among eligible nudges', () => {
    expect(pick([quiet, loud])?.id).toBe('loud')
    expect(pick([loud, quiet])?.id).toBe('loud')
  })

  it('ignores priority order for a nudge whose condition is false', () => {
    expect(pick([never, quiet])?.id).toBe('quiet')
  })

  it('silences a nudge inside its cooldown', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const seen: SeenPrompts = { coaching: [], nudges: { loud: oneDayAgo.toISOString() } }
    expect(pick([loud], { seen, now })).toBeNull()
  })

  it('releases a nudge exactly at the cooldown boundary', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const exactly = new Date(now.getTime() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
    const seen: SeenPrompts = { coaching: [], nudges: { loud: exactly.toISOString() } }
    expect(pick([loud], { seen, now })?.id).toBe('loud')
  })

  it('falls past a cooled-down nudge to the next eligible one', () => {
    const now = new Date('2026-08-06T12:00:00Z')
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const seen: SeenPrompts = { coaching: [], nudges: { loud: oneDayAgo.toISOString() } }
    expect(pick([loud, quiet], { seen, now })?.id).toBe('quiet')
  })

  it('treats an unparseable timestamp as no cooldown rather than a permanent silence', () => {
    const seen: SeenPrompts = { coaching: [], nudges: { loud: 'not a date' } }
    expect(pick([loud], { seen })?.id).toBe('loud')
  })

  it('defaults to the real catalogue when none is supplied', () => {
    // Smoke test that the wiring works against constants/cloudPrompts.ts.
    const result = pickPrompt({
      route: '/profile', role: 'attender', state: NOTHING, seen: FRESH, now: new Date(),
    })
    expect(result?.id).toBe('coach-profile')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/cloudPrompts.test.ts`
Expected: FAIL — `Cannot find module '../../utils/cloudPrompts'`.

- [ ] **Step 3: Write the picker**

Create `utils/cloudPrompts.ts`:

```ts
import { CLOUD_PROMPTS, type CloudPrompt, type PromptRole, type PromptState } from '../constants/cloudPrompts'
import type { SeenPrompts } from '../services/cloudPromptsSeen'

/**
 * Which cloud — if any — should fire on this route, for this account, right now.
 *
 * Pure, and takes its catalogue and its clock as arguments, which is the same split
 * `utils/authRoute.ts` uses: all the policy is testable without a renderer, a device or
 * a Firestore connection, and the watcher above it is a thin effect wrapper.
 */

/** How long a nudge stays quiet after firing. */
export const NUDGE_COOLDOWN_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface PickPromptInput {
  /** `usePathname()`, with group segments already stripped by expo-router. */
  route: string
  role: PromptRole
  state: PromptState
  seen: SeenPrompts
  now: Date
  /** Injectable for tests. Defaults to the real catalogue. */
  catalogue?: readonly CloudPrompt[]
}

function cooldownExpired(lastFired: string | undefined, now: Date): boolean {
  if (!lastFired) return true
  const at = Date.parse(lastFired)
  // An unparseable timestamp must not silence a nudge forever — a corrupt record is
  // not a statement that the user has seen something.
  if (Number.isNaN(at)) return true
  return now.getTime() - at >= NUDGE_COOLDOWN_DAYS * DAY_MS
}

export function pickPrompt(input: PickPromptInput): CloudPrompt | null {
  const catalogue = input.catalogue ?? CLOUD_PROMPTS
  const here = catalogue.filter((p) => p.role === input.role && p.routes.includes(input.route))

  // Coaching first, always. Somebody who has never seen this screen needs to know what
  // it is before being told what to do on it.
  const coaching = here.find((p) => p.kind === 'coaching' && !input.seen.coaching.includes(p.id))
  if (coaching) return coaching

  const eligible = here.filter(
    (p) =>
      p.kind === 'nudge' &&
      (p.condition?.(input.state, input.now) ?? false) &&
      cooldownExpired(input.seen.nudges[p.id], input.now),
  )
  if (eligible.length === 0) return null

  // Lower number wins. `<` is strict, so a tie keeps the earlier catalogue entry —
  // though the catalogue test requires distinct priorities, so ties should not arise.
  const rank = (p: CloudPrompt) => p.priority ?? Number.MAX_SAFE_INTEGER
  return eligible.reduce((best, p) => (rank(p) < rank(best) ? p : best))
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/utils/cloudPrompts.test.ts && npx tsc --noEmit`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add utils/cloudPrompts.ts __tests__/utils/cloudPrompts.test.ts
git commit -m "feat: decide which cloud prompt fires, coaching before nudges"
```

---

### Task 5: The `CloudPrompt` component

**Files:**
- Create: `components/CloudPrompt.tsx`
- Test: `__tests__/components/CloudPrompt.test.tsx`

**Interfaces:**
- Consumes: `cloud`, `cloudMotion`, `radius`, `space` from `constants/design`; `CloudPrompt as Prompt` from `constants/cloudPrompts`; `Display`, `Meta` from `components/ui/Text`; `useReduceMotion` from `hooks/useReduceMotion`.
- Produces: `CloudPromptProps { prompt: Prompt | null; onDismiss: () => void; onAct: (prompt: Prompt) => void }` and the `CloudPrompt` component. testIDs: `cloud-prompt`, `cloud-prompt-scrim`, `cloud-prompt-cta`.

**Read first:** `components/RewardUnlock.tsx`. It solves the same problems — a `Modal` ceremony, an SVG radial glow, native-driver loops, reduced-motion collapse — and this component should look like a sibling of it, not a stranger.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/CloudPrompt.test.tsx`:

```tsx
import React from 'react'
import { AccessibilityInfo, StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { CloudPrompt } from '../../components/CloudPrompt'
import type { CloudPrompt as Prompt } from '../../constants/cloudPrompts'

function stubReduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled)
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
}

const prompt: Prompt = {
  id: 'coach-discover',
  kind: 'coaching',
  role: 'attender',
  routes: ['/'],
  eyebrow: 'just a thought',
  title: "Don't just scroll. Show up.",
  body: "There's a spot open tonight.",
  cta: "I'm in",
}

describe('CloudPrompt', () => {
  beforeEach(() => stubReduceMotion(true))
  afterEach(() => jest.restoreAllMocks())

  it('renders nothing when there is no prompt', () => {
    const { queryByTestId } = render(<CloudPrompt prompt={null} onDismiss={jest.fn()} onAct={jest.fn()} />)
    expect(queryByTestId('cloud-prompt')).toBeNull()
  })

  it('renders the eyebrow, title, body and CTA', () => {
    const { getByText } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    expect(getByText('just a thought')).toBeTruthy()
    expect(getByText("Don't just scroll. Show up.")).toBeTruthy()
    expect(getByText("There's a spot open tonight.")).toBeTruthy()
    expect(getByText("I'm in")).toBeTruthy()
  })

  it('uppercases the title by token rather than by transforming the string', () => {
    // The casing is display-only: the style carries textTransform, and the node's own
    // text stays exactly as the catalogue wrote it, so a screen reader still receives
    // the sentence rather than shouting. Asserting getByText alone would prove nothing
    // beyond the test above — this checks BOTH halves of that arrangement.
    const { getByText } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    const title = getByText("Don't just scroll. Show up.")
    expect(title.props.children).toBe("Don't just scroll. Show up.")
    expect(StyleSheet.flatten(title.props.style).textTransform).toBe('uppercase')
  })

  it('calls onAct with the prompt when the CTA is pressed', () => {
    const onAct = jest.fn()
    const { getByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={onAct} />)
    fireEvent.press(getByTestId('cloud-prompt-cta'))
    expect(onAct).toHaveBeenCalledWith(prompt)
  })

  it('calls onDismiss when the scrim is pressed', () => {
    const onDismiss = jest.fn()
    const { getByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={onDismiss} onAct={jest.fn()} />)
    fireEvent.press(getByTestId('cloud-prompt-scrim'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders under reduced motion without starting any loop', async () => {
    stubReduceMotion(true)
    const loop = jest.spyOn(require('react-native').Animated, 'loop')
    const { getByTestId, findByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    await findByTestId('cloud-prompt')
    expect(getByTestId('cloud-prompt')).toBeTruthy()
    expect(loop).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CloudPrompt.test.tsx`
Expected: FAIL — `Cannot find module '../../components/CloudPrompt'`.

- [ ] **Step 3: Write the component**

Create `components/CloudPrompt.tsx`. Implementation notes that matter and are easy to get wrong:

- **The entrance uses keyframe interpolations with a monotonic easing, NOT `Easing.bezier(.2,.75,.15,1.15)`.** The comp gets its overshoot twice over — once from that bezier and once from the `82% { scale: 1.045 }` keyframe. Stacking both in RN doubles it, and the bezier would also push `rotate` and `translate` past zero, which the comp's keyframes explicitly do not do. Reproducing the keyframes under `Easing.out(Easing.cubic)` gives each property exactly the overshoot the comp specifies.
- **The bob composes onto the entrance with `Animated.add`.** CSS runs two animations on one element; RN needs the sum, or the bob would snap the cloud back to origin.
- **The puffs are clipped** — `overflow: 'hidden'` on the body is load-bearing, not tidiness.
- **The `✦` twinkles render in the wrap, outside that clip.** In the comp they are inside it and therefore never visible; treated as an accident and fixed.
- **The entrance blur is dropped.** `filter: blur()` is not animatable in RN without `expo-blur`, which this project deliberately does not carry.

```tsx
import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated, Easing, Modal, Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions,
} from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Display, Meta } from './ui/Text'
import { cloud, cloudMotion, radius, space } from '../constants/design'
import { useReduceMotion } from '../hooks/useReduceMotion'
import type { CloudPrompt as Prompt } from '../constants/cloudPrompts'

/**
 * The cloud thought prompt. Source comp: docs/cloud-thought-prompt.html.
 *
 * Five beats, layered: a comet trail traces the path, the cloud lands with an overshoot,
 * its puffs bloom in one by one, a shimmer sweeps across once, and the text arrives last.
 * That layering is the whole design — flatten it and this is a slide-in with a caption.
 *
 * A `Modal`, like RewardUnlock, so it covers the tab bar. A prompt that left navigation
 * chrome visible would read as a toast rather than as the app thinking at you.
 */

const CLOUD_WIDTH = 230
const GLOW_W = 300
const GLOW_H = 240

/** Fractions of the window, so the trail holds its line on any screen. */
const COMETS = [
  { key: 'c1', topPct: 0.14, leftPct: 0.82, size: 6 },
  { key: 'c2', topPct: 0.2, leftPct: 0.74, size: 8 },
  { key: 'c3', topPct: 0.27, leftPct: 0.65, size: 7 },
  { key: 'c4', topPct: 0.33, leftPct: 0.57, size: 9 },
  { key: 'c5', topPct: 0.39, leftPct: 0.5, size: 6 },
  { key: 'c6', topPct: 0.44, leftPct: 0.45, size: 8 },
] as const

/** Clipped by the body's top edge — see the token comment. */
const PUFFS = [
  { key: 'p1', size: 70, top: -30, left: 14, color: cloud.puffLight },
  { key: 'p2', size: 90, top: -42, left: 60, color: cloud.puffMid },
  { key: 'p3', size: 64, top: -26, left: 140, color: cloud.puffLight },
] as const

const TRAIL = [7, 5, 3] as const

const TEXT_DELAYS = [
  cloudMotion.eyebrowDelay,
  cloudMotion.titleDelay,
  cloudMotion.bodyDelay,
  cloudMotion.ctaDelay,
  cloudMotion.trailDelay,
] as const

export interface CloudPromptProps {
  /** The prompt to show. Null renders nothing. */
  prompt: Prompt | null
  onDismiss: () => void
  onAct: (prompt: Prompt) => void
}

export function CloudPrompt({ prompt, onDismiss, onAct }: CloudPromptProps) {
  const reduceMotion = useReduceMotion()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  const enter = useRef(new Animated.Value(0)).current
  const bob = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0)).current
  const glowPulse = useRef(new Animated.Value(0)).current
  const shimmer = useRef(new Animated.Value(0)).current
  const comets = useRef(COMETS.map(() => new Animated.Value(0))).current
  const puffs = useRef(PUFFS.map(() => new Animated.Value(0))).current
  const texts = useRef(TEXT_DELAYS.map(() => new Animated.Value(0))).current
  const twinkles = useRef([new Animated.Value(0), new Animated.Value(0)]).current

  const visible = prompt !== null

  useEffect(() => {
    if (!visible) {
      ;[enter, bob, glow, glowPulse, shimmer, ...comets, ...puffs, ...texts, ...twinkles].forEach((v) =>
        v.setValue(0),
      )
      return
    }

    // Reduced motion: one fade for the whole cloud, nothing staggered, no loop at all.
    // Something must still mark the arrival or it blinks into existence — the same rule
    // RewardUnlock follows.
    if (reduceMotion) {
      ;[...puffs, ...texts].forEach((v) => v.setValue(1))
      glow.setValue(1)
      Animated.timing(enter, {
        toValue: 1,
        duration: cloudMotion.reducedIn,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
      return
    }

    const timing = (value: Animated.Value, duration: number, delay: number, easing: (t: number) => number) =>
      Animated.timing(value, { toValue: 1, duration, delay, easing, useNativeDriver: true })

    const entrance = Animated.parallel([
      // Monotonic on purpose — the overshoot lives in the interpolations below.
      timing(enter, cloudMotion.enterIn, 0, Easing.out(Easing.cubic)),
      timing(glow, cloudMotion.glowIn, cloudMotion.glowInDelay, Easing.out(Easing.ease)),
      ...comets.map((v, i) =>
        timing(v, cloudMotion.cometFlash, i * cloudMotion.cometStagger, Easing.out(Easing.ease)),
      ),
      ...puffs.map((v, i) =>
        timing(
          v,
          cloudMotion.puffBloom,
          cloudMotion.puffFirstDelay + i * cloudMotion.puffStagger,
          Easing.bezier(0.3, 1.4, 0.4, 1),
        ),
      ),
      timing(shimmer, cloudMotion.shimmerSweep, cloudMotion.shimmerDelay, Easing.inOut(Easing.ease)),
      ...texts.map((v, i) => timing(v, cloudMotion.textIn, TEXT_DELAYS[i], Easing.out(Easing.ease))),
    ])

    const breathe = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      )

    // The delay sits OUTSIDE the loop, so it is paid once rather than every cycle.
    const bobLoop = Animated.sequence([Animated.delay(cloudMotion.bobDelay), breathe(bob, cloudMotion.bobCycle)])
    const glowLoop = Animated.sequence([Animated.delay(cloudMotion.glowIn), breathe(glowPulse, cloudMotion.glowCycle)])
    const twinkleLoops = twinkles.map((v, i) =>
      Animated.sequence([
        Animated.delay(cloudMotion.twinkleDelay + i * (cloudMotion.twinkleCycle / 2)),
        breathe(v, cloudMotion.twinkleCycle),
      ]),
    )

    const all = [entrance, bobLoop, glowLoop, ...twinkleLoops]
    all.forEach((a) => a.start())
    return () => all.forEach((a) => a.stop())
  }, [visible, reduceMotion, enter, bob, glow, glowPulse, shimmer, comets, puffs, texts, twinkles])

  // The comp's cornerIn keyframes at 0 / 82% / 100%, reproduced literally.
  const wrapStyle = useMemo(() => {
    const opacity = enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] })
    if (reduceMotion) return { opacity, transform: [] }
    const translateY = Animated.add(
      enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [-64, 0, 0] }),
      bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
    )
    return {
      opacity,
      transform: [
        { translateX: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [78, 0, 0] }) },
        { translateY },
        { scale: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0.55, 1.045, 1] }) },
        { rotate: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: ['9deg', '0deg', '0deg'] }) },
      ],
    }
  }, [enter, bob, reduceMotion])

  if (!prompt) return null

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root} testID="cloud-prompt">
        <Pressable
          style={styles.scrim}
          onPress={onDismiss}
          testID="cloud-prompt-scrim"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        {!reduceMotion &&
          COMETS.map((c, i) => (
            <Animated.View
              key={c.key}
              pointerEvents="none"
              style={[
                styles.cometHalo,
                {
                  top: c.topPct * windowHeight,
                  left: c.leftPct * windowWidth,
                  width: c.size * 2.6,
                  height: c.size * 2.6,
                  borderRadius: c.size * 1.3,
                  opacity: comets[i].interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
                  transform: [{ scale: comets[i].interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1.1, 0.5] }) }],
                },
              ]}
            >
              <View style={[styles.cometDot, { width: c.size, height: c.size, borderRadius: c.size / 2 }]} />
            </Animated.View>
          ))}

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={[styles.wrap, wrapStyle]}>
            {/* Radial falloff needs real SVG — the same reason RewardUnlock uses it. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  opacity: Animated.multiply(
                    glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                    glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
                  ),
                },
              ]}
            >
              <Svg width={GLOW_W} height={GLOW_H}>
                <Defs>
                  <RadialGradient id="cloud-glow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor={cloud.glowCore} />
                    <Stop offset="70%" stopColor={cloud.glowEdge} />
                  </RadialGradient>
                </Defs>
                <Rect width={GLOW_W} height={GLOW_H} fill="url(#cloud-glow)" />
              </Svg>
            </Animated.View>

            {/* Outside the body's clip, so they actually render. In the comp they sit
                inside it and are therefore invisible. */}
            {!reduceMotion &&
              twinkles.map((t, i) => (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    i === 0 ? styles.twinkleLeft : styles.twinkleRight,
                    {
                      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                    },
                  ]}
                >
                  <Meta style={styles.twinkleGlyph}>✦</Meta>
                </Animated.View>
              ))}

            <LinearGradient colors={[cloud.bodyTop, cloud.bodyBottom]} style={styles.body}>
              {PUFFS.map((p, i) => (
                <Animated.View
                  key={p.key}
                  pointerEvents="none"
                  style={[
                    styles.puff,
                    {
                      width: p.size,
                      height: p.size,
                      borderRadius: p.size / 2,
                      top: p.top,
                      left: p.left,
                      backgroundColor: p.color,
                      opacity: puffs[i],
                      transform: [{ scale: puffs[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                    },
                  ]}
                />
              ))}

              {!reduceMotion && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shimmer,
                    {
                      opacity: shimmer.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
                      transform: [
                        { skewX: '-18deg' },
                        {
                          translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-0.6 * CLOUD_WIDTH, 1.3 * CLOUD_WIDTH],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={[cloud.shimmerEdge, cloud.shimmerCore, cloud.shimmerEdge]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              )}

              <Animated.View style={{ opacity: texts[0] }}>
                <Meta role="eyebrow" style={styles.eyebrow}>{prompt.eyebrow}</Meta>
              </Animated.View>
              <Animated.View style={{ opacity: texts[1] }}>
                <Display role="cardTitle" style={styles.title}>{prompt.title}</Display>
              </Animated.View>
              <Animated.View style={{ opacity: texts[2] }}>
                <Meta style={styles.bodyText}>{prompt.body}</Meta>
              </Animated.View>
              <Animated.View style={{ opacity: texts[3] }}>
                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => onAct(prompt)}
                  testID="cloud-prompt-cta"
                  accessibilityRole="button"
                  activeOpacity={0.8}
                >
                  <Meta role="eyebrow" style={styles.ctaLabel}>{prompt.cta}</Meta>
                </TouchableOpacity>
              </Animated.View>
            </LinearGradient>

            <Animated.View style={[styles.trail, { opacity: texts[4] }]} pointerEvents="none">
              {TRAIL.map((size) => (
                <View key={size} style={[styles.trailDot, { width: size, height: size, borderRadius: size / 2 }]} />
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  )
}

CloudPrompt.displayName = 'CloudPrompt'

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: cloud.scrim },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl - 4 },

  cometHalo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: cloud.cometHalo },
  cometDot: { backgroundColor: cloud.comet },

  wrap: { width: CLOUD_WIDTH },
  glow: { position: 'absolute', top: '50%', left: '50%', marginTop: -GLOW_H / 2, marginLeft: -GLOW_W / 2, width: GLOW_W, height: GLOW_H },

  twinkleLeft: { position: 'absolute', top: -38, left: 24 },
  twinkleRight: { position: 'absolute', top: -46, right: 20 },
  twinkleGlyph: { color: cloud.twinkle, fontSize: 9, lineHeight: 12 },

  body: {
    borderRadius: 38,
    paddingTop: space.xxl + 2,
    paddingHorizontal: space.xl - 2,
    paddingBottom: space.xl - 2,
    // Load-bearing: the puffs are meant to be clipped by this edge, as in the comp.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cloud.bodyRim,
    shadowColor: cloud.bodyShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 12,
  },
  puff: { position: 'absolute' },
  shimmer: { position: 'absolute', top: '-20%', left: 0, width: '60%', height: '140%' },

  eyebrow: { color: cloud.eyebrow, fontSize: 9, lineHeight: 13, letterSpacing: 1.44, marginBottom: space.xs + 2 },
  title: { color: cloud.title, fontSize: 21, lineHeight: 25, marginBottom: space.sm + 2 },
  bodyText: { color: cloud.body, fontSize: 9.5, lineHeight: 15, marginBottom: space.lg },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: cloud.ctaFill,
    borderRadius: radius.ticket,
    paddingVertical: space.sm + 1,
    paddingHorizontal: space.lg,
  },
  ctaLabel: { color: cloud.ctaLabel, fontSize: 9, letterSpacing: 0.54 },

  trail: { flexDirection: 'row', justifyContent: 'center', gap: space.sm - 2, marginTop: space.sm + 2 },
  trailDot: { backgroundColor: cloud.trail, opacity: 0.5 },
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/components/CloudPrompt.test.tsx && npx tsc --noEmit`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify the token guard still holds**

Run: `npx jest __tests__/constants/tokens.test.ts`
Expected: PASS with an empty offenders array. If it fails, a literal hex reached `components/` — move it into the `cloud` group in `constants/design.ts`.

- [ ] **Step 6: Commit**

```bash
git add components/CloudPrompt.tsx __tests__/components/CloudPrompt.test.tsx
git commit -m "feat: build the cloud thought prompt — comet trail, overshoot landing, shimmer"
```

---

### Task 6: The watcher, mounted for both roles

**Files:**
- Create: `components/CloudPromptWatcher.tsx`
- Modify: `app/(app)/(attender)/_layout.tsx` (add the import and mount it next to `<RewardWatcher />`)
- Modify: `app/(app)/(hoster)/_layout.tsx` (wrap the returned `<Tabs>` in a fragment and mount it)
- Test: `__tests__/components/CloudPromptWatcher.test.tsx`

**Interfaces:**
- Consumes: `pickPrompt` from `utils/cloudPrompts`; `getSeenPrompts`, `markCoachingSeen`, `markNudgeFired` from `services/cloudPromptsSeen`; `CloudPrompt` from `components/CloudPrompt`; `PromptRole`, `PromptState` from `constants/cloudPrompts`; hooks `useAuth`, `useProfile`, `useChatList`, `useAttendanceStats`, `useConnections`; `getMyRegisteredEvents` from `services/events`.
- Produces: `CloudPromptWatcher({ role }: { role: PromptRole })`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/CloudPromptWatcher.test.tsx`. The watcher is a thin wrapper over already-tested pure logic, so this covers only the wiring the pure tests cannot reach — that it shows what `pickPrompt` returns, that it marks on queue, and that route re-renders do not re-raise.

```tsx
import React from 'react'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { CloudPromptWatcher } from '../../components/CloudPromptWatcher'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../../services/cloudPromptsSeen'

// jest.mock rather than jest.spyOn on the module object: spying on ES module exports
// throws "not declared configurable" under some interop settings, and rewardsSeen.test.ts
// already establishes jest.mock as this codebase's convention.
jest.mock('../../services/cloudPromptsSeen', () => ({
  getSeenPrompts: jest.fn(),
  markCoachingSeen: jest.fn(),
  markNudgeFired: jest.fn(),
}))

let pathname = '/'
jest.mock('expo-router', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1' }, role: 'attender', loading: false }) }))
jest.mock('../../hooks/useProfile', () => ({ useProfile: () => ({ profile: { photoURL: null }, loading: false }) }))
jest.mock('../../hooks/useChatList', () => ({ useChatList: () => ({ threads: [], loading: false }) }))
jest.mock('../../hooks/useAttendanceStats', () => ({ useAttendanceStats: () => ({ attendedEvents: [], loading: false }) }))
jest.mock('../../hooks/useConnections', () => ({ useConnections: () => ({ connectionUids: [], loading: false }) }))
jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn().mockResolvedValue([]) }))

describe('CloudPromptWatcher', () => {
  beforeEach(() => {
    pathname = '/'
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    ;(getSeenPrompts as jest.Mock).mockReset().mockResolvedValue({ coaching: [], nudges: {} })
    ;(markCoachingSeen as jest.Mock).mockReset().mockResolvedValue(undefined)
    ;(markNudgeFired as jest.Mock).mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it('raises the coaching hint for the current route', async () => {
    const { findByText } = render(<CloudPromptWatcher role="attender" />)
    expect(await findByText('This is the whole point.')).toBeTruthy()
  })

  it('marks the hint seen when it is QUEUED, not when it is dismissed', async () => {
    // A force-quit mid-animation must not mean the same cloud every launch — the same
    // lesson RewardWatcher already encodes.
    const { findByTestId } = render(<CloudPromptWatcher role="attender" />)
    await findByTestId('cloud-prompt')
    await waitFor(() => expect(markCoachingSeen).toHaveBeenCalledWith('u1', 'coach-discover'))
  })

  it('closes on dismiss and does not immediately re-raise', async () => {
    const { findByTestId, queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    fireEvent.press(await findByTestId('cloud-prompt-scrim'))
    await waitFor(() => expect(queryByTestId('cloud-prompt')).toBeNull())
  })

  it('shows the hoster hint on the same "/" pathname when mounted as a hoster', async () => {
    const { findByText } = render(<CloudPromptWatcher role="hoster" />)
    expect(await findByText('Your nights, at a glance.')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/CloudPromptWatcher.test.tsx`
Expected: FAIL — `Cannot find module '../../components/CloudPromptWatcher'`.

- [ ] **Step 3: Write the watcher**

Create `components/CloudPromptWatcher.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'expo-router'
import { CloudPrompt } from './CloudPrompt'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useChatList } from '../hooks/useChatList'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useConnections } from '../hooks/useConnections'
import { getMyRegisteredEvents } from '../services/events'
import { pickPrompt } from '../utils/cloudPrompts'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../services/cloudPromptsSeen'
import type { CloudPrompt as Prompt, PromptRole, PromptState } from '../constants/cloudPrompts'
import type { CommunityEvent } from '../types/models'

/**
 * Raises a cloud wherever the user happens to be.
 *
 * Mounted once per tab navigator and BESIDE it, not inside — the same position
 * RewardWatcher occupies, and for the same reason: `CloudPrompt` is a Modal and has to
 * be able to land over a pushed route.
 *
 * `role` is a prop rather than read from useAuth because it disambiguates the pathname:
 * (attender)/index and (hoster)/index both resolve to '/'. Each layout knows which one
 * it is, so it says so.
 *
 * No route file is edited to make this work. Route -> prompt is the whole mapping, and
 * it lives in constants/cloudPrompts.ts where it can be read top to bottom.
 */
export function CloudPromptWatcher({ role }: { role: PromptRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const uid = user?.uid

  const { profile } = useProfile(uid)
  const { threads } = useChatList(uid)
  const { attendedEvents } = useAttendanceStats(uid)
  const { connectionUids } = useConnections(uid)

  const [registrations, setRegistrations] = useState<CommunityEvent[]>([])
  const [prompt, setPrompt] = useState<Prompt | null>(null)

  // One-shot rather than a subscription: `getMyRegisteredEvents` is what my-events
  // already uses, and a nudge does not need live updates to decide whether to appear.
  useEffect(() => {
    if (!uid) {
      setRegistrations([])
      return
    }
    let cancelled = false
    getMyRegisteredEvents(uid)
      .then((events) => { if (!cancelled) setRegistrations(events) })
      // A failed load simply means the events-based nudges stay quiet. It must never
      // take the screen down.
      .catch(() => { if (!cancelled) setRegistrations([]) })
    return () => { cancelled = true }
  }, [uid])

  const state: PromptState = useMemo(
    () => ({
      photoURL: profile?.photoURL ?? null,
      attendedCount: attendedEvents.length,
      upcomingRegistrations: registrations,
      // A group thread with unread messages is one the user has not caught up on.
      unopenedEventChatIds: threads.filter((t) => t.kind === 'group' && t.unread > 0).map((t) => t.id),
      connectionsCount: connectionUids.length,
    }),
    [profile?.photoURL, attendedEvents.length, registrations, threads, connectionUids.length],
  )

  // Keyed on the ROUTE, so a re-render at the same pathname cannot re-raise a cloud.
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    getSeenPrompts(uid).then((seen) => {
      if (cancelled) return
      const next = pickPrompt({ route: pathname, role, state, seen, now: new Date() })
      if (!next) return
      setPrompt(next)
      // Marked on QUEUE, not on dismiss: a force-quit mid-animation should not mean the
      // same cloud every launch.
      if (next.kind === 'coaching') void markCoachingSeen(uid, next.id)
      else void markNudgeFired(uid, next.id, new Date())
    })

    return () => { cancelled = true }
    // `state` is deliberately excluded: it changes as subscriptions settle, and
    // including it would re-run this mid-visit and raise a second cloud on one screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pathname, role])

  // Clear on account change, so a sign-out mid-cloud does not hand the next user
  // someone else's prompt.
  useEffect(() => { setPrompt(null) }, [uid])

  return (
    <CloudPrompt
      prompt={prompt}
      onDismiss={() => setPrompt(null)}
      onAct={(acted) => {
        setPrompt(null)
        if (acted.href) router.push(acted.href)
      }}
    />
  )
}

CloudPromptWatcher.displayName = 'CloudPromptWatcher'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/components/CloudPromptWatcher.test.tsx && npx tsc --noEmit`
Expected: PASS, 4 tests.

- [ ] **Step 5: Mount it in the attender layout**

In `app/(app)/(attender)/_layout.tsx`, add the import beside the existing `RewardWatcher` import:

```tsx
import { CloudPromptWatcher } from '../../../components/CloudPromptWatcher'
```

and mount it immediately after `<RewardWatcher />`:

```tsx
      <RewardWatcher />
      <CloudPromptWatcher role="attender" />
```

- [ ] **Step 6: Mount it in the hoster layout**

`app/(app)/(hoster)/_layout.tsx` currently returns `<Tabs>` directly, so it needs a fragment. Add the import:

```tsx
import { CloudPromptWatcher } from '../../../components/CloudPromptWatcher'
```

then change the returned element from:

```tsx
  return (
    <Tabs
```

to:

```tsx
  return (
    <>
      {/* Beside the navigator, not inside it — the cloud is a Modal and has to land
          over whatever screen is on top. Unlike RewardWatcher, hosters get this one:
          navigation coaching is for everybody. */}
      <CloudPromptWatcher role="hoster" />
      <Tabs
```

and close the fragment after the closing `</Tabs>` tag, before the final `)`. Re-indent the `<Tabs>` block by one level so the file stays readable.

- [ ] **Step 7: Verify the whole suite and the type check**

Run: `npx tsc --noEmit && npx jest`
Expected: tsc clean. Jest: 413 prior tests plus 46 new (4 design + 8 catalogue + 10 service + 14 picker + 6 component + 4 watcher) = **459 passing across 62 suites** — 5 new suites, since the 4 design tests land in the existing `design.test.ts`. If `tokens.test.ts` fails, a literal hex reached `app/` — the layouts must not contain one.

- [ ] **Step 8: Commit**

```bash
git add components/CloudPromptWatcher.tsx __tests__/components/CloudPromptWatcher.test.tsx "app/(app)/(attender)/_layout.tsx" "app/(app)/(hoster)/_layout.tsx"
git commit -m "feat: raise cloud prompts on route entry for both roles"
```

---

### Task 7: Codemap

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`

**Interfaces:**
- Consumes: everything above.
- Produces: documentation only.

- [ ] **Step 1: Update the source tree**

In the `components/` block, after the `RewardGrid.tsx` line, add:

```
│   ├── CloudPrompt.tsx         # The buttery-gold thought cloud — comet trail, overshoot landing
│   └── CloudPromptWatcher.tsx  # Raises one per route entry; mounted in BOTH tab layouts
```

In the `constants/` description, add `cloudPrompts` (the catalogue) to the list. Under `services/`, add `cloudPromptsSeen.ts`. Bump the hooks/services/components/utils counts on those lines to match.

- [ ] **Step 2: Add the invariants**

Append to **Key Invariants & Gotchas**:

```markdown
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
- **The watcher's route effect deliberately excludes `state`** — it settles as
  subscriptions arrive, and depending on it would re-run mid-visit and raise a second
  cloud on one screen. Keyed on `uid` + `pathname` only.
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
```

- [ ] **Step 3: Update Build Status**

Change the test count on the Build Status line to the number `npx jest` actually reports, and update the generated date to 2026-08-06.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npx jest`
Expected: clean, all passing.

- [ ] **Step 5: Commit**

```bash
git add ../docs/CODEMAPS/thirdspace-codemap.md
git commit -m "docs: record the cloud prompt system in the codemap"
```

---

## Manual verification (device, after Task 7)

Not automatable — the whole feature is a motion sequence.

- [ ] `npx expo start`, sign in as a fresh attender. Discover should raise `coach-discover`: comets trace in from the top-right, the cloud lands with a visible overshoot, puffs bloom, one shimmer sweeps, text cascades.
- [ ] Dismiss via the scrim. Walk to My Events, Chats, Profile — each raises its own hint once.
- [ ] Return to Discover. No cloud (the hint is seen, and a nudge needs its condition).
- [ ] With no profile photo, revisit Profile: `no-photo` fires and its CTA lands on `edit-profile`.
- [ ] Revisit Profile again immediately: silent (cooldown).
- [ ] Turn on OS reduce motion, clear app data, relaunch: the cloud fades in whole, with no comet, bob, shimmer or bloom.
- [ ] Sign in as a hoster: Overview/Events/Venue each raise their own hint, and never an attender one.
- [ ] Raise a cloud, then background and force-quit the app mid-animation. Relaunch: it does not replay.
