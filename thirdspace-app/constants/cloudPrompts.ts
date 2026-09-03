import type { Href } from 'expo-router'

/**
 * Everything the cloud can say, in one table. Source comp: docs/cloud-thought-prompt.html.
 * Spec: docs/superpowers/specs/2026-08-06-cloud-thought-prompt-design.md
 *
 * Every entry is a FIRST-RUN hint: it explains a surface the first time the account
 * reaches it, and only while the account's first session is still under way. There used
 * to be a second kind — behavioural nudges over live data ('no-photo', 'no-rsvp-yet',
 * 'event-today', ...) with a 3-day cooldown in front of them — and they were deleted
 * rather than switched off, because a prompt that can fire on a returning user is exactly
 * what "popups only the first time" rules out. `utils/cloudPrompts.ts` holds the gate.
 *
 * Content is hardcoded on purpose. If prompts ever need to change without a release,
 * this table is the seam to move to Firestore — `pickPrompt` already takes the catalogue
 * as data and would not change.
 */

export type PromptRole = 'attender' | 'hoster'

export interface CloudPrompt {
  id: string
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
  /**
   * When present the CTA navigates here; otherwise it just closes the cloud. No shipped
   * entry uses it today — the nudges that did are gone — but it is what `tabAnchor` reads
   * to point the tail at the surface a prompt is ABOUT rather than the one it is on, so
   * the field stays rather than being rediscovered the next time a hint sends somebody
   * somewhere.
   */
  href?: Href
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
 * where the prompt is SENDING you when the CTA targets a tab, and otherwise at the tab it
 * is speaking on — which is every shipped hint, since each one is about the surface the
 * user just opened.
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

export const CLOUD_PROMPTS: readonly CloudPrompt[] = [
  // ── Attender ────────────────────────────────────────────────────────────
  {
    id: 'coach-discover',
    role: 'attender',
    routes: ['/'],
    eyebrow: 'just a thought',
    title: 'This is the whole point.',
    body: 'Every ticket is a real room, on a real night. Tap one to see who else said yes.',
    cta: 'Got it',
  },
  {
    id: 'coach-my-events',
    role: 'attender',
    routes: ['/my-events'],
    eyebrow: 'just a thought',
    title: 'Everything you said yes to.',
    body: 'Upcoming and past both live here — each with its own group chat.',
    cta: 'Got it',
  },
  {
    id: 'coach-chats',
    role: 'attender',
    routes: ['/chats'],
    eyebrow: 'just a thought',
    title: 'The room before the room.',
    body: 'Joining an event opens its group chat. Someone has to speak first.',
    cta: 'Got it',
  },
  {
    id: 'coach-profile',
    role: 'attender',
    routes: ['/profile'],
    eyebrow: 'just a thought',
    title: 'This is how people find you.',
    body: 'A photo, a neighbourhood, a few things you are into. Keep it honest.',
    cta: 'Got it',
  },

  // ── Hoster ──────────────────────────────────────────────────────────────
  {
    id: 'coach-overview',
    role: 'hoster',
    routes: ['/'],
    eyebrow: 'just a thought',
    title: 'Your nights, at a glance.',
    body: 'Who registered, what is coming up, and the announcements you have sent.',
    cta: 'Got it',
  },
  {
    id: 'coach-events',
    role: 'hoster',
    routes: ['/events'],
    eyebrow: 'just a thought',
    title: 'Everything you have put on.',
    body: 'Create, edit or cancel. A cancelled night stays on the books rather than vanishing.',
    cta: 'Got it',
  },
  {
    id: 'coach-venue',
    role: 'hoster',
    routes: ['/venue'],
    eyebrow: 'just a thought',
    title: 'People come for the room.',
    body: 'Name it and place it once — every event you create inherits all of it.',
    cta: 'Got it',
  },
]
