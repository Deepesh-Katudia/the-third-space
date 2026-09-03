import { isFirstRun, pickPrompt } from '../../utils/cloudPrompts'
import type { CloudPrompt } from '../../constants/cloudPrompts'
import type { SeenPrompts } from '../../services/cloudPromptsSeen'

// A fixed session start, so "this session" and "a previous launch" are both expressible
// without touching the wall clock. The module-level SESSION_STARTED_AT is only ever used
// as a default by the watcher; every policy decision takes it as an argument.
const SESSION_START = new Date('2026-09-03T12:00:00Z').getTime()
const thisSession = new Date(SESSION_START + 1_000).toISOString()
const aPreviousLaunch = new Date(SESSION_START - 60_000).toISOString()

/** A device that has never run the app for this account. */
const FRESH: SeenPrompts = { coaching: [], firstRunDone: false }

const base = { eyebrow: 'e', title: 't', body: 'b', cta: 'c' } as const
const coach: CloudPrompt = { id: 'coach', role: 'attender', routes: ['/'], ...base }
const hosterCoach: CloudPrompt = { id: 'hoster-coach', role: 'hoster', routes: ['/'], ...base }

const pick = (catalogue: CloudPrompt[], over: Partial<Parameters<typeof pickPrompt>[0]> = {}) =>
  pickPrompt({ route: '/', role: 'attender', seen: FRESH, sessionStartedAt: SESSION_START, catalogue, ...over })

describe('isFirstRun', () => {
  it('is true on a device that has shown this account nothing yet', () => {
    expect(isFirstRun({ seen: FRESH, sessionStartedAt: SESSION_START })).toBe(true)
  })

  it('stays true for the rest of the session that started it', () => {
    // The tour is a session, not a single screen: the hint marked seen a moment ago must
    // not be what ends it.
    const seen: SeenPrompts = { coaching: ['coach-discover'], firstRunStartedAt: thisSession, firstRunDone: false }
    expect(isFirstRun({ seen, sessionStartedAt: SESSION_START })).toBe(true)
  })

  it('is false on a later launch, which is what deactivates the popups', () => {
    // The whole feature in one assertion. A marker written before this process started
    // means the first session has already been and gone.
    const seen: SeenPrompts = { coaching: ['coach-discover'], firstRunStartedAt: aPreviousLaunch, firstRunDone: false }
    expect(isFirstRun({ seen, sessionStartedAt: SESSION_START })).toBe(false)
  })

  it('is false once the first run has been closed, whatever the clock says', () => {
    const seen: SeenPrompts = { coaching: [], firstRunStartedAt: thisSession, firstRunDone: true }
    expect(isFirstRun({ seen, sessionStartedAt: SESSION_START })).toBe(false)
  })

  it('is false for an account that used the app before first runs were tracked', () => {
    // The upgrade path. A record with coaching history but no marker was written by the
    // old build, so this account is not new — it must not be handed the tour again.
    const seen: SeenPrompts = { coaching: ['coach-discover', 'coach-profile'], firstRunDone: false }
    expect(isFirstRun({ seen, sessionStartedAt: SESSION_START })).toBe(false)
  })

  it('is false for an unparseable marker, erring toward silence', () => {
    // The opposite call from the old nudge cooldown, which treated corruption as "no
    // cooldown". Here the user has asked for popups to stop, so an unreadable marker
    // must not be read as licence to show more.
    const seen: SeenPrompts = { coaching: [], firstRunStartedAt: 'not a date', firstRunDone: false }
    expect(isFirstRun({ seen, sessionStartedAt: SESSION_START })).toBe(false)
  })
})

describe('pickPrompt', () => {
  it('returns null when nothing matches the route', () => {
    expect(pick([coach], { route: '/chats' })).toBeNull()
  })

  it('shows an unseen hint during the first run', () => {
    expect(pick([coach])?.id).toBe('coach')
  })

  it('never shows the same hint twice', () => {
    const seen: SeenPrompts = { coaching: ['coach'], firstRunStartedAt: thisSession, firstRunDone: false }
    expect(pick([coach], { seen })).toBeNull()
  })

  it('shows a different screen\'s hint later in the same session', () => {
    const chats: CloudPrompt = { id: 'chats', role: 'attender', routes: ['/chats'], ...base }
    const seen: SeenPrompts = { coaching: ['coach'], firstRunStartedAt: thisSession, firstRunDone: false }
    expect(pick([coach, chats], { seen, route: '/chats' })?.id).toBe('chats')
  })

  it('shows nothing at all once the first run is over', () => {
    const seen: SeenPrompts = { coaching: [], firstRunStartedAt: aPreviousLaunch, firstRunDone: false }
    expect(pick([coach], { seen })).toBeNull()
  })

  it('uses role to disambiguate the shared "/" pathname', () => {
    // (attender)/index and (hoster)/index both resolve to '/'. Without the role check
    // an attender would be shown the hoster's Overview hint.
    expect(pick([hosterCoach, coach])?.id).toBe('coach')
    expect(pick([hosterCoach, coach], { role: 'hoster' })?.id).toBe('hoster-coach')
  })

  it('defaults to the real catalogue when none is supplied', () => {
    // Smoke test that the wiring works against constants/cloudPrompts.ts.
    const result = pickPrompt({
      route: '/profile', role: 'attender', seen: FRESH, sessionStartedAt: SESSION_START,
    })
    expect(result?.id).toBe('coach-profile')
  })
})
