import { CLOUD_PROMPTS, CLOUD_ROUTES, startsToday } from '../../constants/cloudPrompts'
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
