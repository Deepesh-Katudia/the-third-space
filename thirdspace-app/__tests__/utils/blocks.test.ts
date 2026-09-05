import {
  dmPartnerUid,
  excludeBlocked,
  hideBlockedEvents,
  hideBlockedRegistrations,
  hideBlockedThreads,
} from '../../utils/blocks'
import type { ChatThread, CommunityEvent, Registration } from '../../types/models'

const blocked: ReadonlySet<string> = new Set(['bad'])

const event = (id: string, venueId: string) => ({ id, venueId }) as CommunityEvent
const thread = (id: string, kind: 'group' | 'dm') => ({ id, kind }) as ChatThread

describe('hideBlockedEvents', () => {
  it('hides events hosted by a blocked member', () => {
    // venueId IS the hoster's uid — venues/{uid} is keyed by it, one venue per hoster.
    const kept = hideBlockedEvents([event('e1', 'bad'), event('e2', 'good')], blocked)
    expect(kept.map((e) => e.id)).toEqual(['e2'])
  })

  it('returns the very same array when nothing is blocked', () => {
    // Referential equality matters: every caller feeds this into a useMemo, and a fresh
    // array on each render would recompute the filter chain behind it for nothing.
    const events = [event('e1', 'bad')]
    expect(hideBlockedEvents(events, new Set())).toBe(events)
  })
})

describe('dmPartnerUid', () => {
  it('reads the other party out of the sorted-pair thread id', () => {
    expect(dmPartnerUid('alice_bob', 'alice')).toBe('bob')
    expect(dmPartnerUid('alice_bob', 'bob')).toBe('alice')
  })

  it('returns null for an id that is not a pair containing me', () => {
    // A group thread id is an event id, and a malformed id must not resolve to a
    // partner — that would filter an unrelated thread out of somebody's list.
    expect(dmPartnerUid('event123', 'alice')).toBeNull()
    expect(dmPartnerUid('alice_bob', 'carol')).toBeNull()
    expect(dmPartnerUid('a_b_c', 'a')).toBeNull()
  })
})

describe('hideBlockedThreads', () => {
  it('drops a DM with a blocked member and keeps every group thread', () => {
    const kept = hideBlockedThreads(
      [thread('me_bad', 'dm'), thread('me_good', 'dm'), thread('bad', 'group')],
      blocked,
      'me'
    )
    expect(kept.map((t) => t.id)).toEqual(['me_good', 'bad'])
  })

  it('keeps a group thread whose id happens to equal a blocked uid', () => {
    // The kind check has to come first: an event id is not a uid, and matching one
    // against the block set would hide an event chat the member is entitled to.
    expect(hideBlockedThreads([thread('bad', 'group')], blocked, 'me')).toHaveLength(1)
  })

  it('returns the very same array when nothing is blocked', () => {
    const threads = [thread('me_bad', 'dm')]
    expect(hideBlockedThreads(threads, new Set(), 'me')).toBe(threads)
  })
})

describe('hideBlockedRegistrations', () => {
  it('omits blocked attendees from a guest list', () => {
    const regs = [{ uid: 'bad' }, { uid: 'good' }] as Registration[]
    expect(hideBlockedRegistrations(regs, blocked).map((r) => r.uid)).toEqual(['good'])
  })
})

describe('excludeBlocked', () => {
  it('removes blocked uids from a list', () => {
    expect(excludeBlocked(['bad', 'good'], blocked)).toEqual(['good'])
  })

  it('returns the very same array when nothing is blocked', () => {
    const uids = ['bad']
    expect(excludeBlocked(uids, new Set())).toBe(uids)
  })
})
