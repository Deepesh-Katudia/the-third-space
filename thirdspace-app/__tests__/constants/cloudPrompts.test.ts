import { CLOUD_PROMPTS, CLOUD_ROUTES, TAB_ORDER, startsToday, tabAnchor } from '../../constants/cloudPrompts'
import type { CommunityEvent } from '../../types/models'
import { Timestamp } from 'firebase/firestore'

// The real firebase/firestore package is ESM and breaks jest's parser when
// required directly (see __tests__/components/EventCard.test.tsx for the same
// pattern) — only `Timestamp.fromDate` is needed here, so it is mocked.
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}))

function eventAt(date: Date): CommunityEvent {
  return {
    id: 'e1', title: 'T', description: '', category: 'touch-grass',
    startsAt: Timestamp.fromDate(date), capacity: 10, ageRequirement: '18+',
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

// `startsToday` reads calendar-day fields with LOCAL Date getters — correct for
// production, since `now` and `event.startsAt` are always compared within the same
// device's timezone (a UTC comparison would misfire "tonight" nudges for any evening
// event across most of the US, where local evening is already past midnight UTC).
// These fixtures therefore use the LOCAL-time `Date(year, month, day, hour, ...)`
// constructor rather than 'Z'-suffixed ISO strings, so the calendar-day boundary being
// tested is the same boundary `startsToday` itself checks — deterministic on any
// machine's timezone, not just one that happens to run in UTC.
describe('startsToday', () => {
  it('is true for an event later the same calendar day', () => {
    const now = new Date(2026, 7, 6, 9, 0, 0)
    expect(startsToday(eventAt(new Date(2026, 7, 6, 20, 0, 0)), now)).toBe(true)
  })

  it('is false for tomorrow, however few hours away', () => {
    const now = new Date(2026, 7, 6, 23, 0, 0)
    expect(startsToday(eventAt(new Date(2026, 7, 7, 1, 0, 0)), now)).toBe(false)
  })

  it('is false for an event earlier the same day', () => {
    // "Tonight's the night" must not fire at 11pm about a brunch that already happened.
    const now = new Date(2026, 7, 6, 23, 0, 0)
    expect(startsToday(eventAt(new Date(2026, 7, 6, 10, 0, 0)), now)).toBe(false)
  })
})

describe('tabAnchor', () => {
  const find = (id: string) => CLOUD_PROMPTS.find((p) => p.id === id)!

  it('lists every role\'s tabs in the order its _layout.tsx declares them', () => {
    // The cloud turns an index into an x position, so a tab bar reordered without this
    // table would point the bubble at the wrong icon — silently, and only on device.
    expect(TAB_ORDER.attender).toEqual(['/', '/my-events', '/chats', '/profile'])
    expect(TAB_ORDER.hoster).toEqual(['/', '/events', '/venue'])
  })

  it('points a coaching hint at the tab it is speaking on', () => {
    expect(tabAnchor(find('coach-my-events'), 'attender')).toEqual({ index: 1, count: 4 })
    expect(tabAnchor(find('coach-chats'), 'attender')).toEqual({ index: 2, count: 4 })
    expect(tabAnchor(find('coach-profile'), 'attender')).toEqual({ index: 3, count: 4 })
  })

  it('counts the hoster bar as three tabs, not the attender four', () => {
    expect(tabAnchor(find('coach-venue'), 'hoster')).toEqual({ index: 2, count: 3 })
  })

  it('points a nudge at the tab its CTA sends you to, not the one you are on', () => {
    // 'They are already talking' is shown on My Events but is ABOUT Chats. Pointing at
    // the surface being described is the whole reason the bubble has a tail.
    const prompt = find('rsvp-chat-unopened')
    expect(prompt.routes[0]).toBe('/my-events')
    expect(tabAnchor(prompt, 'attender')).toEqual({ index: 2, count: 4 })
  })

  it('strips group segments from an href before matching a pathname', () => {
    // hrefs carry '/(app)/(attender)/my-events'; usePathname() reports '/my-events'.
    expect(tabAnchor(find('event-today'), 'attender')).toEqual({ index: 1, count: 4 })
  })

  it('falls back to the current tab when the CTA leads somewhere that is not a tab', () => {
    // no-photo sends you to edit-profile, a pushed route with no icon to point at.
    expect(tabAnchor(find('no-photo'), 'attender')).toEqual({ index: 3, count: 4 })
  })

  it('resolves an anchor for every entry in the catalogue', () => {
    // A prompt with no anchor centres itself, which is the look this change exists to
    // replace — so nothing shipped should be falling back to it.
    for (const prompt of CLOUD_PROMPTS) {
      expect(tabAnchor(prompt, prompt.role)).not.toBeNull()
    }
  })
})
