import { filterByBorough } from '../../utils/locationFilter'
import { Borough, CommunityEvent } from '../../types/models'

function event(id: string, borough?: Borough): CommunityEvent {
  return { id, title: id, borough } as unknown as CommunityEvent
}

describe('filterByBorough', () => {
  it('returns everything unfiltered when no borough is selected', () => {
    const events = [event('a', 'Brooklyn'), event('b', 'Queens')]
    expect(filterByBorough(events, null)).toEqual({ events, widened: false })
  })

  it('keeps only events in the selected borough', () => {
    const bk = event('a', 'Brooklyn')
    const result = filterByBorough([bk, event('b', 'Queens')], 'Brooklyn')
    expect(result.events).toEqual([bk])
    expect(result.widened).toBe(false)
  })

  it('includes events that have no borough yet alongside a real match', () => {
    // Events created before this feature shipped must not vanish from the feed,
    // but they ride along with a genuine match rather than counting as one.
    const bk = event('a', 'Brooklyn')
    const legacy = event('legacy')
    const result = filterByBorough([bk, legacy, event('b', 'Queens')], 'Brooklyn')
    expect(result.events).toEqual([bk, legacy])
    expect(result.widened).toBe(false)
  })

  it('widens when the only events present are legacy (borough-less), not a real match', () => {
    // A single borough-less event must not silently disable the widen rule.
    const legacy = event('legacy')
    const queens = event('b', 'Queens')
    const result = filterByBorough([legacy, queens], 'Brooklyn')
    expect(result.events).toEqual([legacy, queens])
    expect(result.widened).toBe(true)
  })

  it('widens to every borough when the selected one has nothing', () => {
    const events = [event('a', 'Queens'), event('b', 'Bronx')]
    const result = filterByBorough(events, 'Staten Island')
    expect(result.events).toEqual(events)
    expect(result.widened).toBe(true)
  })

  it('does not report widening when the feed is genuinely empty', () => {
    // Nothing to widen to — this is the "no events at all" empty state, and the
    // screen must not claim it fell back to all of NYC.
    expect(filterByBorough([], 'Brooklyn')).toEqual({ events: [], widened: false })
  })
})
