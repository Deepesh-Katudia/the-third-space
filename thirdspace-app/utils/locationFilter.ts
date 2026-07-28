import { Borough, CommunityEvent } from '../types/models'

export interface BoroughFilterResult {
  events: CommunityEvent[]
  /** True when the borough had no events and the feed fell back to all boroughs. */
  widened: boolean
}

/**
 * Narrows the feed to one borough, but never to nothing: if the borough has no
 * upcoming events the full list is returned with `widened: true` so the screen can
 * explain itself. Events with no `borough` are always included — they predate the
 * field and must not disappear.
 */
export function filterByBorough(events: CommunityEvent[], borough: Borough | null): BoroughFilterResult {
  if (!borough) return { events, widened: false }

  const matches = events.filter((e) => e.borough === undefined || e.borough === borough)
  if (matches.length === 0 && events.length > 0) return { events, widened: true }
  return { events: matches, widened: false }
}
