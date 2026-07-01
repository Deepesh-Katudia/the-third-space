import { Timestamp } from 'firebase/firestore'
import { CommunityEvent } from '../../types/models'
import { computeBadges } from '../../utils/badges'

function event(overrides: Partial<CommunityEvent> & { hour?: number }): CommunityEvent {
  const hour = overrides.hour ?? 14
  return {
    id: overrides.id ?? 'e1',
    title: 'Event',
    description: '',
    category: overrides.category ?? 'Social',
    startsAt: { toDate: () => new Date(2026, 0, 1, hour, 0) } as unknown as Timestamp,
    capacity: 10,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'Venue',
    neighborhood: 'Nbhd',
    registeredCount: 1,
  }
}

describe('computeBadges', () => {
  it('returns all 8 badges locked when there is no attendance history', () => {
    const badges = computeBadges([], 'Newcomer')
    expect(badges).toHaveLength(8)
    expect(badges.every((b) => !b.earned)).toBe(true)
  })

  it('unlocks First event after 1 attended event', () => {
    const badges = computeBadges([event({ id: 'e1' })], 'Newcomer')
    expect(badges.find((b) => b.id === 'first-event')?.earned).toBe(true)
  })

  it('unlocks 5 in a row only at 5+ attended events', () => {
    const four = [1, 2, 3, 4].map((n) => event({ id: `e${n}` }))
    const five = [1, 2, 3, 4, 5].map((n) => event({ id: `e${n}` }))
    expect(computeBadges(four, 'Newcomer').find((b) => b.id === 'five-in-a-row')?.earned).toBe(false)
    expect(computeBadges(five, 'Newcomer').find((b) => b.id === 'five-in-a-row')?.earned).toBe(true)
  })

  it('unlocks Creative soul at 3+ attended Creative Arts events', () => {
    const two = [1, 2].map((n) => event({ id: `e${n}`, category: 'Creative Arts' }))
    const three = [1, 2, 3].map((n) => event({ id: `e${n}`, category: 'Creative Arts' }))
    expect(computeBadges(two, 'Newcomer').find((b) => b.id === 'creative-soul')?.earned).toBe(false)
    expect(computeBadges(three, 'Newcomer').find((b) => b.id === 'creative-soul')?.earned).toBe(true)
  })

  it('unlocks Night owl for an attended event at or after 9pm', () => {
    const evening = [event({ id: 'e1', hour: 21 })]
    const afternoon = [event({ id: 'e1', hour: 14 })]
    expect(computeBadges(evening, 'Newcomer').find((b) => b.id === 'night-owl')?.earned).toBe(true)
    expect(computeBadges(afternoon, 'Newcomer').find((b) => b.id === 'night-owl')?.earned).toBe(false)
  })

  it('unlocks Insider only when the tier is Insider', () => {
    expect(computeBadges([], 'Regular').find((b) => b.id === 'insider')?.earned).toBe(false)
    expect(computeBadges([], 'Insider').find((b) => b.id === 'insider')?.earned).toBe(true)
  })

  it('keeps Connector, Top rated, and Host hero permanently locked', () => {
    const badges = computeBadges([event({ id: 'e1' })], 'Insider')
    expect(badges.find((b) => b.id === 'connector')?.earned).toBe(false)
    expect(badges.find((b) => b.id === 'top-rated')?.earned).toBe(false)
    expect(badges.find((b) => b.id === 'host-hero')?.earned).toBe(false)
  })
})
