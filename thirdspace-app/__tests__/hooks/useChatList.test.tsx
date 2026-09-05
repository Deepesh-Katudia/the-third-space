import { renderHook, waitFor } from '@testing-library/react-native'
import { useChatList } from '../../hooks/useChatList'
import { getMyRegisteredEvents } from '../../services/events'
import { subscribeEventChatMeta, subscribeMyConversations, subscribeChatReads } from '../../services/chat'

jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))
// The blocked set is a module store the hook reads through useBlocks; mocking the hook
// keeps this test off Firestore entirely. The factory closes over a `mock`-prefixed
// variable because babel-plugin-jest-hoist rejects any other out-of-scope name.
let mockBlocks: { blocked: Set<string>; isBlocked: (uid: string) => boolean; loading: boolean }
jest.mock('../../hooks/useBlocks', () => ({ useBlocks: () => mockBlocks }))

jest.mock('../../services/chat', () => ({
  subscribeEventChatMeta: jest.fn(() => () => {}),
  subscribeMyConversations: jest.fn(() => () => {}),
  subscribeChatReads: jest.fn(() => () => {}),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockBlocks = { blocked: new Set(), isBlocked: () => false, loading: false }
})

const conversationWith = (uid: string, name: string) => ({
  id: `me_${uid}`,
  participants: ['me', uid],
  names: { [uid]: name },
  photos: { [uid]: null },
  status: 'open',
  requestedBy: uid,
  lastMessageText: 'hi',
  lastMessageAt: null,
  lastMessageAuthor: name,
  messageCount: 2,
})

describe('useChatList', () => {
  it('merges registered-event group rows with open dm rows', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([{ id: 'e1', title: 'Sketching' }])
    ;(subscribeEventChatMeta as jest.Mock).mockImplementation((_id, onChange) => { onChange(null); return () => {} })
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([{ id: 'me_you', participants: ['me', 'you'], names: { you: 'Maya' }, photos: { you: null }, status: 'open', requestedBy: 'you', lastMessageText: 'hi', lastMessageAt: null, lastMessageAuthor: 'Maya', messageCount: 2 }])
      return () => {}
    })
    ;(subscribeChatReads as jest.Mock).mockImplementation((_uid, onChange) => { onChange([]); return () => {} })

    const { result } = renderHook(() => useChatList('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const ids = result.current.threads.map((t) => t.id).sort()
    expect(ids).toEqual(['e1', 'me_you'])
    const dm = result.current.threads.find((t) => t.id === 'me_you')!
    expect(dm.name).toBe('Maya')
    expect(dm.unread).toBe(2)
  })

  it('returns empty and not-loading when uid is undefined', async () => {
    const { result } = renderHook(() => useChatList(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads).toEqual([])
  })
})

describe('useChatList and blocking', () => {
  it('hides a DM with a blocked member and keeps every group thread', async () => {
    // The chat list is where a leak hurts most: the whole point of blocking somebody is
    // that their name stops appearing in the place you read messages.
    mockBlocks = { blocked: new Set(['bad']), isBlocked: (uid) => uid === 'bad', loading: false }
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([{ id: 'e1', title: 'Sketching' }])
    ;(subscribeEventChatMeta as jest.Mock).mockImplementation((_id, onChange) => { onChange(null); return () => {} })
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([conversationWith('bad', 'Blocked'), conversationWith('good', 'Maya')])
      return () => {}
    })
    ;(subscribeChatReads as jest.Mock).mockImplementation((_uid, onChange) => { onChange([]); return () => {} })

    const { result } = renderHook(() => useChatList('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads.map((t) => t.id).sort()).toEqual(['e1', 'me_good'])
  })

  it('keeps every DM when nothing is blocked', async () => {
    // Guards the test above from passing by simply dropping DMs.
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([])
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([conversationWith('bad', 'Blocked'), conversationWith('good', 'Maya')])
      return () => {}
    })
    ;(subscribeChatReads as jest.Mock).mockImplementation((_uid, onChange) => { onChange([]); return () => {} })

    const { result } = renderHook(() => useChatList('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.threads.map((t) => t.id).sort()).toEqual(['me_bad', 'me_good'])
  })
})
