const STARTING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function isStartingSoon(startsAt: Date, now: Date): boolean {
  const msUntilStart = startsAt.getTime() - now.getTime()
  return msUntilStart > 0 && msUntilStart <= STARTING_SOON_WINDOW_MS
}

export function spotsLeftText(capacity: number, registeredCount: number): string {
  const remaining = capacity - registeredCount
  if (remaining <= 0) return 'Sold out'
  return remaining === 1 ? '1 spot left' : `${remaining} spots left`
}

export function formatEventDate(date: Date): string {
  const hours24 = date.getHours()
  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 % 12 || 12
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()} · ${hours12}:${minutes} ${period}`
}
