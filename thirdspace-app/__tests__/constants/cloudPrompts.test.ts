import { CLOUD_PROMPTS, CLOUD_ROUTES, TAB_ORDER, tabAnchor } from '../../constants/cloudPrompts'
import type { CloudPrompt } from '../../constants/cloudPrompts'

const base = { eyebrow: 'e', title: 't', body: 'b', cta: 'c' } as const

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

  it('gives each role exactly one entry per route it owns', () => {
    // Two entries on one route would make which of them a user sees depend on array
    // order, and the second would never be reachable at all: the first run is one pass.
    for (const role of ['attender', 'hoster'] as const) {
      const routes = CLOUD_PROMPTS.filter((p) => p.role === role).flatMap((p) => p.routes)
      expect(new Set(routes).size).toBe(routes.length)
    }
  })

  it('carries only first-run hints, with no condition to evaluate', () => {
    // The behavioural nudges (no-photo, no-rsvp-yet, event-today, ...) were removed when
    // popups became a first-session-only feature. A condition reappearing here would mean
    // a prompt that fires on live data — which is exactly what a returning user is no
    // longer meant to be able to see.
    for (const prompt of CLOUD_PROMPTS) {
      expect(Object.keys(prompt)).not.toContain('condition')
      expect(Object.keys(prompt)).not.toContain('priority')
      expect(Object.keys(prompt)).not.toContain('kind')
    }
  })
})

describe('tabAnchor', () => {
  const find = (id: string) => CLOUD_PROMPTS.find((p) => p.id === id)!

  it('lists every tab of each role in the order its _layout.tsx declares them', () => {
    // The cloud turns an index into an x position, so a tab bar reordered without this
    // table would point the bubble at the wrong icon — silently, and only on device.
    expect(TAB_ORDER.attender).toEqual(['/', '/my-events', '/chats', '/profile'])
    expect(TAB_ORDER.hoster).toEqual(['/', '/events', '/venue'])
  })

  it('points a hint at the tab it is speaking on', () => {
    expect(tabAnchor(find('coach-my-events'), 'attender')).toEqual({ index: 1, count: 4 })
    expect(tabAnchor(find('coach-chats'), 'attender')).toEqual({ index: 2, count: 4 })
    expect(tabAnchor(find('coach-profile'), 'attender')).toEqual({ index: 3, count: 4 })
  })

  it('counts the hoster bar as three tabs, not the attender four', () => {
    expect(tabAnchor(find('coach-venue'), 'hoster')).toEqual({ index: 2, count: 3 })
  })

  it('prefers the tab a CTA sends you to over the one you are standing on', () => {
    // Fixtures rather than catalogue entries: nothing shipped uses an href today, but the
    // rule is what makes the tail meaningful, so it stays covered rather than untested.
    const sendsToChats: CloudPrompt = {
      id: 'x',
      role: 'attender',
      routes: ['/my-events'],
      href: '/(app)/(attender)/chats',
      ...base,
    }
    expect(tabAnchor(sendsToChats, 'attender')).toEqual({ index: 2, count: 4 })
  })

  it('falls back to the current tab when the CTA leads somewhere that is not a tab', () => {
    const sendsToPushedRoute: CloudPrompt = {
      id: 'y',
      role: 'attender',
      routes: ['/profile'],
      href: '/(app)/edit-profile',
      ...base,
    }
    expect(tabAnchor(sendsToPushedRoute, 'attender')).toEqual({ index: 3, count: 4 })
  })

  it('resolves an anchor for every entry in the catalogue', () => {
    // A prompt with no anchor centres itself, which is the look the tail exists to
    // replace — so nothing shipped should be falling back to it.
    for (const prompt of CLOUD_PROMPTS) {
      expect(tabAnchor(prompt, prompt.role)).not.toBeNull()
    }
  })
})
