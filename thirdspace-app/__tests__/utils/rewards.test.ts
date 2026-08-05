import { computeRewards, newlyEarned, trackableIds, type RewardInputs } from '../../utils/rewards'
import { ACHIEVEMENTS, achievementsMissingFigures } from '../../constants/achievements'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { CommunityEvent, EventCategory } from '../../types/models'

const NOW = new Date(2026, 7, 5).getTime()
const DAY = 86_400_000

/** Duck-typed Timestamp — importing the real one drags firebase's ESM into jest. */
const stamp = (ms: number) =>
  ({ toDate: () => new Date(ms), toMillis: () => ms }) as unknown as CommunityEvent['startsAt']

function event(overrides: Partial<CommunityEvent> & { id: string }): CommunityEvent {
  return {
    title: 'E',
    description: '',
    category: 'lets-eat',
    startsAt: stamp(NOW - 30 * DAY),
    capacity: 20,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'V',
    neighborhood: 'N',
    registeredCount: 1,
    ...overrides,
  } as CommunityEvent
}

const base: RewardInputs = { attendedEvents: [], tier: 'Newcomer', connectionsCount: 0, now: NOW }

function earned(input: Partial<RewardInputs>): string[] {
  return computeRewards({ ...base, ...input }).filter((r) => r.earned).map((r) => r.id)
}

describe('reward roster integrity', () => {
  it('gives every achievement a figure to draw', () => {
    // A roster entry with no mascot renders an empty square in the grid.
    expect(achievementsMissingFigures()).toEqual([])
  })

  it('gives every achievement a unique id', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('writes a prompt and an eyebrow for every achievement', () => {
    // The unlock modal has no fallback copy — a blank prompt is a blank celebration.
    for (const a of ACHIEVEMENTS) {
      expect([a.id, a.prompt.length > 0]).toEqual([a.id, true])
      expect([a.id, a.eyebrow.length > 0]).toEqual([a.id, true])
      expect([a.id, a.points > 0]).toEqual([a.id, true])
    }
  })

  it('has a rule for every trackable achievement and none for the rest', () => {
    // This is the guard on the honesty of the roster. A `trackable: true` with no rule
    // is a reward nobody can earn; a rule on a `trackable: false` is a reward awarded on
    // data the app does not actually have.
    const flagged = ACHIEVEMENTS.filter((a) => a.trackable).map((a) => a.id).sort()
    expect(trackableIds().sort()).toEqual(flagged)
  })

  it('never earns an untrackable achievement, however full the inputs', () => {
    const everything: RewardInputs = {
      attendedEvents: EVENT_CATEGORIES.map((c, i) => event({ id: `e${i}`, category: c.id as EventCategory })),
      tier: 'Insider',
      connectionsCount: 500,
      joinedAt: stamp(NOW - 5 * 365 * DAY) as never,
      now: NOW,
    }
    const untrackable = ACHIEVEMENTS.filter((a) => !a.trackable).map((a) => a.id)
    const got = earned(everything)
    for (const id of untrackable) expect([id, got.includes(id)]).toEqual([id, false])
  })
})

describe('computeRewards', () => {
  it('earns nothing for a brand new account', () => {
    expect(earned({})).toEqual([])
  })

  it('returns the whole roster regardless, so locked ones stay visible', () => {
    expect(computeRewards(base)).toHaveLength(ACHIEVEMENTS.length)
  })

  it('earns First Event on the first attended event', () => {
    expect(earned({ attendedEvents: [event({ id: 'e1' })] })).toContain('first-event')
  })

  it('earns Consistent One at five attended, not four', () => {
    const four = [1, 2, 3, 4].map((n) => event({ id: `e${n}` }))
    const five = [1, 2, 3, 4, 5].map((n) => event({ id: `e${n}` }))
    expect(earned({ attendedEvents: four })).not.toContain('consistent-one')
    expect(earned({ attendedEvents: five })).toContain('consistent-one')
  })

  it('earns the per-category rewards off the stored slug, not the label', () => {
    // 'stage-time' is the slug behind the category now labelled "Stage". Matching on
    // the label would break the moment anyone rewords the copy again.
    expect(earned({ attendedEvents: [event({ id: 'e1', category: 'stage-time' })] })).toContain('stage')
    expect(earned({ attendedEvents: [event({ id: 'e2', category: 'lets-eat' })] })).toContain('eat')
    expect(earned({ attendedEvents: [event({ id: 'e3', category: 'touch-grass' })] })).toContain('touch-grass')
  })

  it('earns Experimenter of Variety only with every live category attended', () => {
    const all = EVENT_CATEGORIES.map((c, i) => event({ id: `e${i}`, category: c.id as EventCategory }))
    expect(earned({ attendedEvents: all })).toContain('experimenter-of-variety')
    expect(earned({ attendedEvents: all.slice(1) })).not.toContain('experimenter-of-variety')
  })

  it('measures Experimenter against LIVE categories only', () => {
    // Retiring a category must not leave this permanently unearnable — attending every
    // category on offer today has to be enough.
    const all = EVENT_CATEGORIES.map((c, i) => event({ id: `e${i}`, category: c.id as EventCategory }))
    expect(earned({ attendedEvents: all })).toContain('experimenter-of-variety')
  })

  it('earns New Friend at one mutual and The Connector at three', () => {
    expect(earned({ connectionsCount: 1 })).toContain('new-friend')
    expect(earned({ connectionsCount: 1 })).not.toContain('the-connector')
    expect(earned({ connectionsCount: 3 })).toContain('the-connector')
  })

  it('earns Community Legend at the Insider tier only', () => {
    expect(earned({ tier: 'Regular' })).not.toContain('community-legend')
    expect(earned({ tier: 'Insider' })).toContain('community-legend')
  })

  it('earns Veteran after a full year, not a day before', () => {
    const justUnder = stamp(NOW - 364 * DAY) as never
    const justOver = stamp(NOW - 366 * DAY) as never
    expect(earned({ joinedAt: justUnder })).not.toContain('third-space-veteran')
    expect(earned({ joinedAt: justOver })).toContain('third-space-veteran')
  })

  it('does not earn Veteran when the profile has not loaded', () => {
    expect(earned({ joinedAt: undefined })).not.toContain('third-space-veteran')
  })
})

describe('newlyEarned', () => {
  it('returns only what was not already seen', () => {
    // 'curious-minds' (Learn) deliberately — the categories with a first-timer reward
    // would earn a third one here and obscure what this test is about.
    const rewards = computeRewards({
      ...base,
      attendedEvents: [event({ id: 'e1', category: 'curious-minds' })],
      connectionsCount: 1,
    })
    expect(newlyEarned(rewards, []).map((r) => r.id).sort()).toEqual(['first-event', 'new-friend'])
    expect(newlyEarned(rewards, ['first-event']).map((r) => r.id)).toEqual(['new-friend'])
    expect(newlyEarned(rewards, ['first-event', 'new-friend'])).toEqual([])
  })

  it('never surfaces a locked reward as new', () => {
    const rewards = computeRewards(base)
    expect(newlyEarned(rewards, [])).toEqual([])
  })
})
