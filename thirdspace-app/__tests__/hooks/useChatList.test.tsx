import { renderHook, waitFor } from '@testing-library/react-native'
import { useChatList } from '../../hooks/useChatList'
import { getMyRegisteredEvents } from '../../services/events'
import { subscribeEventChatMeta, subscribeMyConversations, subscribeChatReads } from '../../services/chat'

jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))
jest.mock('../../services/chat', () => ({
  subscribeEventChatMeta: jest.fn(() => () => {}),
  subscribeMyConversations: jest.fn(() => () => {}),
  subscribeChatReads: jest.fn(() => () => {}),
}))

beforeEach(() => jest.clearAllMocks())

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
