import { Timestamp } from 'firebase/firestore'
import { Conversation, EventChatMeta, Message } from '../../types/models'
import {
  dmConversationId,
  computeUnread,
  shouldShowAuthor,
  sortThreadsByRecency,
  formatRelativeTime,
  buildChatThreads,
  selectIncomingRequests,
  GroupChatInput,
  ReadMap,
} from '../../utils/chat'

function tsAt(ms: number): Timestamp {
  return { toMillis: () => ms, toDate: () => new Date(ms) } as unknown as Timestamp
}
function msg(over: Partial<Message> & { authorUid: string }): Message {
  return { id: over.id ?? 'm', authorUid: over.authorUid, authorName: over.authorName ?? 'A', authorPhotoURL: null, text: over.text ?? 'hi', createdAt: null }
}

describe('dmConversationId', () => {
  it('is order-independent', () => {
    expect(dmConversationId('b', 'a')).toBe('a_b')
    expect(dmConversationId('a', 'b')).toBe('a_b')
  })
})

describe('computeUnread', () => {
  it('is the positive difference, zero when muted or over-read', () => {
    expect(computeUnread(5, 2, false)).toBe(3)
    expect(computeUnread(5, 5, false)).toBe(0)
    expect(computeUnread(2, 5, false)).toBe(0)
    expect(computeUnread(5, 0, true)).toBe(0)
  })
})

describe('shouldShowAuthor', () => {
  it('shows on the first message and at author boundaries', () => {
    const list = [msg({ authorUid: 'x' }), msg({ authorUid: 'x' }), msg({ authorUid: 'y' })]
    expect(shouldShowAuthor(list, 0)).toBe(true)
    expect(shouldShowAuthor(list, 1)).toBe(false)
    expect(shouldShowAuthor(list, 2)).toBe(true)
  })
})

describe('sortThreadsByRecency', () => {
  it('orders newest first and puts null timestamps last', () => {
    const base = { kind: 'group' as const, name: 'n', photoURL: null, lastMessageText: '', unread: 0, muted: false }
    const a = { ...base, id: 'a', lastMessageAt: tsAt(100) }
    const b = { ...base, id: 'b', lastMessageAt: tsAt(300) }
    const c = { ...base, id: 'c', lastMessageAt: null }
    expect(sortThreadsByRecency([a, c, b]).map((t) => t.id)).toEqual(['b', 'a', 'c'])
  })
})

describe('formatRelativeTime', () => {
  const now = new Date(2026, 5, 28, 12, 0, 0)
  it('handles null, now, minutes, and hours', () => {
    expect(formatRelativeTime(null, now)).toBe('')
    expect(formatRelativeTime(new Date(2026, 5, 28, 11, 59, 30), now)).toBe('now')
    expect(formatRelativeTime(new Date(2026, 5, 28, 11, 45, 0), now)).toBe('15m')
    expect(formatRelativeTime(new Date(2026, 5, 28, 9, 0, 0), now)).toBe('3h')
  })
})

describe('buildChatThreads', () => {
  const myUid = 'me'
  const groups: GroupChatInput[] = [
    { eventId: 'e1', title: 'Sketching', meta: { lastMessageText: 'hey', lastMessageAt: tsAt(200), lastMessageAuthor: 'Devon', messageCount: 4 } },
    { eventId: 'e2', title: 'Empty', meta: null },
  ]
  const conversations: Conversation[] = [
    { id: 'me_you', participants: ['me', 'you'], names: { me: 'Me', you: 'Maya' }, photos: { me: null, you: null }, status: 'open', requestedBy: 'you', lastMessageText: 'hi', lastMessageAt: tsAt(500), lastMessageAuthor: 'Maya', messageCount: 3 },
    { id: 'me_zed', participants: ['me', 'zed'], names: { me: 'Me', zed: 'Zed' }, photos: { me: null, zed: null }, status: 'pending', requestedBy: 'zed', lastMessageText: 'wanna meet?', lastMessageAt: tsAt(900), lastMessageAuthor: 'Zed', messageCount: 1 },
  ]
  const reads: ReadMap = { e1: { readCount: 1, muted: false }, me_you: { readCount: 3, muted: false } }

  it('merges group + open/outgoing dm rows, drops incoming-pending, computes unread, sorts', () => {
    const out = buildChatThreads(groups, conversations, reads, myUid)
    // me_zed is incoming-pending (requestedBy !== me) -> excluded
    expect(out.map((t) => t.id)).toEqual(['me_you', 'e1', 'e2'])
    const e1 = out.find((t) => t.id === 'e1')!
    expect(e1.unread).toBe(3) // 4 - 1
    expect(e1.name).toBe('Sketching')
    const dm = out.find((t) => t.id === 'me_you')!
    expect(dm.name).toBe('Maya') // the other participant
    expect(dm.unread).toBe(0) // 3 - 3
  })

  it('includes outgoing-pending dm rows', () => {
    const outgoing: Conversation = { ...conversations[1], id: 'me_out', participants: ['me', 'out'], names: { me: 'Me', out: 'Out' }, photos: { me: null, out: null }, requestedBy: 'me' }
    const out = buildChatThreads([], [outgoing], {}, myUid)
    expect(out.map((t) => t.id)).toEqual(['me_out'])
    expect(out[0].name).toBe('Out')
  })
})

describe('selectIncomingRequests', () => {
  it('keeps only pending conversations the other person started', () => {
    const conversations: Conversation[] = [
      { id: 'a', participants: ['me', 'x'], names: {}, photos: {}, status: 'pending', requestedBy: 'x', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
      { id: 'b', participants: ['me', 'y'], names: {}, photos: {}, status: 'pending', requestedBy: 'me', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
      { id: 'c', participants: ['me', 'z'], names: {}, photos: {}, status: 'open', requestedBy: 'z', lastMessageText: '', lastMessageAt: null, lastMessageAuthor: '', messageCount: 1 },
    ]
    expect(selectIncomingRequests(conversations, 'me').map((c) => c.id)).toEqual(['a'])
  })
})
