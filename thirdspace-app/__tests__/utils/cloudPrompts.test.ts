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
