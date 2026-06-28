import { CommunityEvent } from '../../types/models'
import { applyEventFilters, hasActiveFilters } from '../../utils/eventFilters'
import { EMPTY_FILTERS } from '../../constants/filters'

function ev(over: Omit<Partial<CommunityEvent>, 'startsAt'> & { startsAt: Date }): CommunityEvent {
  const { startsAt, ...rest } = over
  return {
    id: rest.id ?? 'e',
    title: rest.title ?? 'Event',
    description: '',
    category: rest.category ?? 'Music',
    startsAt: { toDate: () => startsAt, toMillis: () => startsAt.getTime() } as unknown as CommunityEvent['startsAt'],
    capacity: 20,
    ageRequirement: rest.ageRequirement ?? '18+',
    venueId: 'v',
    venueName: rest.venueName ?? 'Venue',
    neighborhood: rest.neighborhood ?? 'Williamsburg',
    registeredCount: 0,
  }
}

// Thursday 2026-06-25 12:00
const NOW = new Date(2026, 5, 25, 12, 0, 0)

describe('applyEventFilters', () => {
  it('returns all events sorted by start time when filters are empty', () => {
    const a = ev({ id: 'a', startsAt: new Date(2026, 5, 27, 18) })
    const b = ev({ id: 'b', startsAt: new Date(2026, 5, 26, 18) })
    const out = applyEventFilters([a, b], EMPTY_FILTERS, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['b', 'a'])
  })

  it('filters by category (multi-select)', () => {
    const music = ev({ id: 'm', category: 'Music', startsAt: new Date(2026, 5, 27) })
    const food = ev({ id: 'f', category: 'Food & Drink', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([music, food], { ...EMPTY_FILTERS, categories: ['Music'] }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['m'])
  })

  it('filters by neighborhood', () => {
    const wb = ev({ id: 'w', neighborhood: 'Williamsburg', startsAt: new Date(2026, 5, 27) })
    const bw = ev({ id: 'b', neighborhood: 'Bushwick', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([wb, bw], { ...EMPTY_FILTERS, neighborhoods: ['Bushwick'] }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['b'])
  })

  it('hides 21+ events when hide21 is set', () => {
    const ok = ev({ id: 'ok', ageRequirement: '18+', startsAt: new Date(2026, 5, 27) })
    const bar = ev({ id: 'bar', ageRequirement: '21+', startsAt: new Date(2026, 5, 27) })
    const out = applyEventFilters([ok, bar], { ...EMPTY_FILTERS, hide21: true }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['ok'])
  })

  it('text search matches title, venue, or neighborhood case-insensitively', () => {
    const a = ev({ id: 'a', title: 'Vinyl Listening Night', startsAt: new Date(2026, 5, 27) })
    const b = ev({ id: 'b', title: 'Yoga', venueName: 'Static Bar', startsAt: new Date(2026, 5, 27) })
    const c = ev({ id: 'c', title: 'Run', neighborhood: 'Greenpoint', startsAt: new Date(2026, 5, 27) })
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'vinyl', NOW).map((e) => e.id)).toEqual(['a'])
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'STATIC', NOW).map((e) => e.id)).toEqual(['b'])
    expect(applyEventFilters([a, b, c], EMPTY_FILTERS, 'green', NOW).map((e) => e.id)).toEqual(['c'])
  })

  it('date=today keeps only events on the same calendar day as now', () => {
    const today = ev({ id: 't', startsAt: new Date(2026, 5, 25, 20) })
    const tomorrow = ev({ id: 'tm', startsAt: new Date(2026, 5, 26, 20) })
    const out = applyEventFilters([today, tomorrow], { ...EMPTY_FILTERS, date: 'today' }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['t'])
  })

  it('date=week keeps events within 7 days from now', () => {
    const soon = ev({ id: 's', startsAt: new Date(2026, 5, 28, 20) })
    const later = ev({ id: 'l', startsAt: new Date(2026, 6, 10, 20) })
    const out = applyEventFilters([soon, later], { ...EMPTY_FILTERS, date: 'week' }, '', NOW)
    expect(out.map((e) => e.id)).toEqual(['s'])
  })

  it('date=weekend keeps the upcoming Saturday/Sunday only', () => {
    // NOW is Thu Jun 25 2026; that weekend is Sat Jun 27 + Sun Jun 28.
    const sat = ev({ id: 'sat', startsAt: new Date(2026, 5, 27, 14) })
    const sun = ev({ id: 'sun', startsAt: new Date(2026, 5, 28, 14) })
    const mon = ev({ id: 'mon', startsAt: new Date(2026, 5, 29, 14) })
    const out = applyEventFilters([sat, sun, mon], { ...EMPTY_FILTERS, date: 'weekend' }, '', NOW)
    expect(out.map((e) => e.id).sort()).toEqual(['sat', 'sun'])
  })
})

describe('hasActiveFilters', () => {
  it('is false for empty filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })
  it('is true when any dimension is set', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, hide21: true })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, date: 'today' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, categories: ['Music'] })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, neighborhoods: ['Bushwick'] })).toBe(true)
  })
})
