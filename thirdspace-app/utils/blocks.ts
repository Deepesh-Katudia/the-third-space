import type { ChatThread, CommunityEvent, Registration } from '../types/models'

/**
 * Read-side block filtering, pure.
 *
 * Rules cannot filter a query result — they allow or deny a whole query — so read
 * suppression is client-side no matter how much is enforced server-side. Keeping it here
 * rather than inside each hook means every surface filters identically, and the behaviour
 * is testable without a renderer or a Firestore connection.
 *
 * Every function returns the ORIGINAL array when nothing is blocked. That is not a
 * micro-optimisation: each caller feeds the result into a `useMemo`, and a fresh array on
 * every render would recompute the filter chain sitting behind it for nothing.
 */

/**
 * A DM thread id is the sorted uid pair (see `utils/chat.ts` `dmConversationId`), so the
 * partner is derivable with no lookup.
 *
 * Returns null for anything that is not a pair containing me. A group thread id is an
 * EVENT id, and resolving one of those to a "partner" would hide an event chat the member
 * is entitled to see.
 */
export function dmPartnerUid(threadId: string, myUid: string): string | null {
  const parts = threadId.split('_')
  if (parts.length !== 2) return null
  if (parts[0] === myUid) return parts[1]
  if (parts[1] === myUid) return parts[0]
  return null
}

export function hideBlockedEvents(
  events: CommunityEvent[],
  blocked: ReadonlySet<string>
): CommunityEvent[] {
  if (blocked.size === 0) return events
  // venueId is the hoster's uid: venues/{uid} is keyed by it, one venue per hoster.
  return events.filter((e) => !blocked.has(e.venueId))
}

export function hideBlockedThreads(
  threads: ChatThread[],
  blocked: ReadonlySet<string>,
  myUid: string
): ChatThread[] {
  if (blocked.size === 0) return threads
  return threads.filter((t) => {
    // The kind check comes FIRST: a group thread's id is an event id, not a uid.
    if (t.kind !== 'dm') return true
    const partner = dmPartnerUid(t.id, myUid)
    return partner === null || !blocked.has(partner)
  })
}

export function hideBlockedRegistrations(
  registrations: Registration[],
  blocked: ReadonlySet<string>
): Registration[] {
  if (blocked.size === 0) return registrations
  return registrations.filter((r) => !blocked.has(r.uid))
}

export function excludeBlocked(uids: string[], blocked: ReadonlySet<string>): string[] {
  if (blocked.size === 0) return uids
  return uids.filter((uid) => !blocked.has(uid))
}
