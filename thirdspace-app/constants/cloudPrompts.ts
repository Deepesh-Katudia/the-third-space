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

/**
 * The tab bar, left to right, per role. This is the ONLY place the tab order is written
 * down for the cloud's benefit; it has to match the `<Tabs.Screen>` order in each role's
 * `_layout.tsx`, and `__tests__/constants/cloudPrompts.test.ts` pins both lists so a
 * reordered tab bar fails loudly instead of pointing the cloud at the wrong icon.
 */
export const TAB_ORDER: Record<PromptRole, readonly string[]> = {
  attender: ['/', '/my-events', '/chats', '/profile'],
  hoster: ['/', '/events', '/venue'],
}

/** Which tab of how many. The component turns this into an x position. */
export interface TabAnchor {
  index: number
  count: number
}

/**
 * expo-router hrefs carry their group segments (`/(app)/(attender)/chats`) while
 * `usePathname()` has already stripped them (`/chats`). Reduce an href to the second form
 * so the two can be compared.
 */
function stripGroups(href: string): string {
  const segments = href
    .split('/')
    .filter((s) => s.length > 0 && !(s.startsWith('(') && s.endsWith(')')))
  return '/' + segments.join('/')
}

/**
 * Which tab the cloud should point at.
 *
 * The cloud is a thought bubble, and a thought bubble belongs to something. It points at
 * where the prompt is SENDING you when the CTA targets a tab — "they are already talking"
 * pointing at Chats says more than the same words floating mid-screen — and otherwise at
 * the tab it is speaking on, which is the coaching case: every hint is about the surface
 * the user just opened.
 *
 * Null when neither resolves to a tab (an href into a pushed route like `edit-profile`
 * whose own screen is not a tab); the component centres itself over the bar instead.
 */
export function tabAnchor(prompt: CloudPrompt, role: PromptRole): TabAnchor | null {
  const tabs = TAB_ORDER[role]
  const destination = typeof prompt.href === 'string' ? stripGroups(prompt.href) : null

  for (const candidate of [destination, prompt.routes[0]]) {
    if (!candidate) continue
    const index = tabs.indexOf(candidate)
    if (index >= 0) return { index, count: tabs.length }
  }
  return null
}

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
