import { Borough, CommunityEvent } from '../types/models'

export interface BoroughFilterResult {
  events: CommunityEvent[]
  /** True when the borough had no events and the feed fell back to all boroughs. */
  widened: boolean
}

/**
 * Narrows the feed to one borough, but never to nothing: if the borough has no
 * upcoming events the full list is returned with `widened: true` so the screen can
 * explain itself. Events with no `borough` are treated as filler, not as matches —
 * they predate the field and must not disappear, but they must not count as a real
 * match for the selected borough either, or a borough with zero real events would
 * silently fail to widen.
 */
export function filterByBorough(events: CommunityEvent[], borough: Borough | null): BoroughFilterResult {
  if (!borough) return { events, widened: false }

  const inBorough = events.filter((e) => e.borough === borough)
  const legacy = events.filter((e) => e.borough === undefined)
  if (inBorough.length === 0 && events.length > 0) return { events, widened: true }
  return { events: [...inBorough, ...legacy], widened: false }
}
