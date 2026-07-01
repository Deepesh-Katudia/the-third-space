import { POINTS_PER_EVENT, tierForPoints, tierProgress } from '../../utils/points'

describe('POINTS_PER_EVENT', () => {
  it('is 50', () => {
    expect(POINTS_PER_EVENT).toBe(50)
  })
})

describe('tierForPoints', () => {
  it('is Newcomer below 500', () => {
    expect(tierForPoints(0)).toBe('Newcomer')
    expect(tierForPoints(499)).toBe('Newcomer')
  })

  it('is Regular from 500 up to 1499', () => {
    expect(tierForPoints(500)).toBe('Regular')
    expect(tierForPoints(1499)).toBe('Regular')
  })

  it('is Insider at 1500 and above', () => {
    expect(tierForPoints(1500)).toBe('Insider')
    expect(tierForPoints(50000)).toBe('Insider')
  })
})

describe('tierProgress', () => {
  it('reports progress toward Regular for a Newcomer', () => {
    const p = tierProgress(250)
    expect(p.tier).toBe('Newcomer')
    expect(p.nextTier).toBe('Regular')
    expect(p.pointsToNext).toBe(250)
    expect(p.progress).toBeCloseTo(0.5)
  })

  it('reports progress toward Insider for a Regular', () => {
    const p = tierProgress(1000)
    expect(p.tier).toBe('Regular')
    expect(p.nextTier).toBe('Insider')
    expect(p.pointsToNext).toBe(500)
    expect(p.progress).toBeCloseTo(0.5)
  })

  it('reports no further tier once Insider', () => {
    const p = tierProgress(2000)
    expect(p.tier).toBe('Insider')
    expect(p.nextTier).toBeNull()
    expect(p.pointsToNext).toBe(0)
    expect(p.progress).toBe(1)
  })
})
