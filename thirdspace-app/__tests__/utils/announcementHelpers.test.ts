import { formatSentSummary } from '../../utils/announcementHelpers'

describe('formatSentSummary', () => {
  const now = new Date('2026-07-09T12:00:00Z')

  it('renders "just now" under a minute', () => {
    const t = new Date(now.getTime() - 30 * 1000)
    expect(formatSentSummary(t, 22, now)).toBe('Sent just now · 22 recipients')
  })

  it('renders minutes, hours, and days ago', () => {
    expect(formatSentSummary(new Date(now.getTime() - 5 * 60_000), 22, now)).toBe('Sent 5m ago · 22 recipients')
    expect(formatSentSummary(new Date(now.getTime() - 2 * 3_600_000), 22, now)).toBe('Sent 2h ago · 22 recipients')
    expect(formatSentSummary(new Date(now.getTime() - 3 * 86_400_000), 22, now)).toBe('Sent 3d ago · 22 recipients')
  })

  it('uses the singular for a single recipient', () => {
    expect(formatSentSummary(new Date(now.getTime() - 60_000), 1, now)).toBe('Sent 1m ago · 1 recipient')
  })

  it('shows a pending state when createdAt is null', () => {
    expect(formatSentSummary(null, 22, now)).toBe('Sending… · 22 recipients')
  })
})
