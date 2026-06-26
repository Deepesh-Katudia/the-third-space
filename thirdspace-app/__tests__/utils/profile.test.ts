import { ageFromDOB } from '../../utils/profile'

describe('ageFromDOB', () => {
  it('returns age in whole years before the birthday this year', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('1999-12-01'), now)).toBe(26)
  })

  it('returns age after the birthday has passed this year', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('1999-01-01'), now)).toBe(27)
  })

  it('handles a birthday that is today', () => {
    const now = new Date('2026-06-25')
    expect(ageFromDOB(new Date('2000-06-25'), now)).toBe(26)
  })
})
