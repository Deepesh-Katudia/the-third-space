import { CommunityEvent } from '../types/models'
import { EventFilters } from '../constants/filters'

function inDateRange(date: Date, filter: EventFilters['date'], now: Date): boolean {
  if (!filter) return true
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  if (filter === 'today') {
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)
    return date >= startOfDay && date < endOfDay
  }

  if (filter === 'week') {
    const weekEnd = new Date(startOfDay)
    weekEnd.setDate(weekEnd.getDate() + 7)
    return date >= now && date < weekEnd
  }

  // weekend: the upcoming Saturday + Sunday (or the remainder if today is already
  // the weekend), ending Monday 00:00.
  const day = now.getDay() // 0=Sun .. 6=Sat
  let start: Date
  if (day === 0 || day === 6) {
    start = now
  } else {
    start = new Date(startOfDay)
    start.setDate(start.getDate() + (6 - day))
  }
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  end.setDate(end.getDate() + (((1 - end.getDay() + 7) % 7) || 7))
  return date >= start && date < end
}

export function applyEventFilters(
  events: CommunityEvent[],
  filters: EventFilters,
  query: string,
  now: Date = new Date()
): CommunityEvent[] {
  const q = query.trim().toLowerCase()
  return events
    .filter((e) => {
      if (!inDateRange(e.startsAt.toDate(), filters.date, now)) return false
      if (filters.neighborhoods.length > 0 && !filters.neighborhoods.includes(e.neighborhood)) return false
      if (filters.hide21 && e.ageRequirement === '21+') return false
      if (filters.categories.length > 0 && !filters.categories.includes(e.category)) return false
      if (q) {
        const haystack = `${e.title} ${e.venueName} ${e.neighborhood}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis())
}

export function hasActiveFilters(filters: EventFilters): boolean {
  return (
    filters.date !== null ||
    filters.neighborhoods.length > 0 ||
    filters.hide21 ||
    filters.categories.length > 0
  )
}
