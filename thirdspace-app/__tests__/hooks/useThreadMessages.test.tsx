import { renderHook, waitFor } from '@testing-library/react-native'
import { useThreadMessages } from '../../hooks/useThreadMessages'
import { subscribeEventMessages, subscribeConversationMessages } from '../../services/chat'

jest.mock('../../services/chat', () => ({
  subscribeEventMessages: jest.fn(),
  subscribeConversationMessages: jest.fn(),
}))

describe('useThreadMessages', () => {
  it('subscribes to event messages for a group thread', async () => {
    ;(subscribeEventMessages as jest.Mock).mockImplementation((_id, onChange) => { onChange([{ id: 'm1' }]); return () => {} })
    const { result } = renderHook(() => useThreadMessages('group', 'e1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeEventMessages).toHaveBeenCalledWith('e1', expect.any(Function), expect.any(Function))
    expect(result.current.messages).toEqual([{ id: 'm1' }])
  })

  it('subscribes to conversation messages for a dm thread and surfaces errors', async () => {
    ;(subscribeConversationMessages as jest.Mock).mockImplementation((_id, _onChange, onError) => { onError(); return () => {} })
    const { result } = renderHook(() => useThreadMessages('dm', 'me_you'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeConversationMessages).toHaveBeenCalledWith('me_you', expect.any(Function), expect.any(Function))
    expect(result.current.hasError).toBe(true)
  })
})
