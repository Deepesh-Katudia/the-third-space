const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function relativeTime(createdAt: Date, now: Date): string {
  const diff = now.getTime() - createdAt.getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  return `${Math.floor(diff / DAY)}d ago`
}

/**
 * Host-facing send summary for an announcement.
 * `now` is injectable for tests; defaults to the current time.
 */
export function formatSentSummary(
  createdAt: Date | null,
  recipientCount: number,
  now: Date = new Date()
): string {
  const noun = recipientCount === 1 ? 'recipient' : 'recipients'
  const count = `${recipientCount} ${noun}`
  if (createdAt === null) return `Sending… · ${count}`
  return `Sent ${relativeTime(createdAt, now)} · ${count}`
}
