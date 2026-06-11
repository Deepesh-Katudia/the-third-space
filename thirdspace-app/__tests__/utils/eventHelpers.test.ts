import { formatEventDate, isStartingSoon, spotsLeftText } from '../../utils/eventHelpers'

describe('isStartingSoon', () => {
  const now = new Date('2026-06-10T12:00:00')

  it('returns true when the event starts within 24 hours', () => {
    expect(isStartingSoon(new Date('2026-06-10T18:00:00'), now)).toBe(true)
    expect(isStartingSoon(new Date('2026-06-11T11:59:00'), now)).toBe(true)
  })

  it('returns false when the event starts more than 24 hours away', () => {
    expect(isStartingSoon(new Date('2026-06-11T12:01:00'), now)).toBe(false)
  })

  it('returns false when the event already started', () => {
    expect(isStartingSoon(new Date('2026-06-10T11:00:00'), now)).toBe(false)
  })
})

describe('spotsLeftText', () => {
  it('shows remaining spots', () => {
    expect(spotsLeftText(20, 16)).toBe('4 spots left')
  })

  it('uses singular for one spot', () => {
    expect(spotsLeftText(20, 19)).toBe('1 spot left')
  })

  it('shows sold out at capacity', () => {
    expect(spotsLeftText(20, 20)).toBe('Sold out')
    expect(spotsLeftText(20, 25)).toBe('Sold out')
  })
})

describe('formatEventDate', () => {
  it('formats date and time', () => {
    expect(formatEventDate(new Date('2026-06-13T19:00:00'))).toBe('Sat, Jun 13 · 7:00 PM')
  })

  it('formats morning times and pads minutes', () => {
    expect(formatEventDate(new Date('2026-06-14T09:05:00'))).toBe('Sun, Jun 14 · 9:05 AM')
  })

  it('formats midnight as 12 AM', () => {
    expect(formatEventDate(new Date('2026-06-14T00:30:00'))).toBe('Sun, Jun 14 · 12:30 AM')
  })
})
