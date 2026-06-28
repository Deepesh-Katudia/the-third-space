import { renderHook, waitFor } from '@testing-library/react-native'
import { useMessageRequests } from '../../hooks/useMessageRequests'
import { subscribeMyConversations } from '../../services/chat'

jest.mock('../../services/chat', () => ({ subscribeMyConversations: jest.fn() }))

describe('useMessageRequests', () => {
  it('keeps only pending conversations started by someone else', async () => {
    ;(subscribeMyConversations as jest.Mock).mockImplementation((_uid, onChange) => {
      onChange([
        { id: 'a', participants: ['me', 'x'], status: 'pending', requestedBy: 'x' },
        { id: 'b', participants: ['me', 'y'], status: 'pending', requestedBy: 'me' },
        { id: 'c', participants: ['me', 'z'], status: 'open', requestedBy: 'z' },
      ])
      return () => {}
    })
    const { result } = renderHook(() => useMessageRequests('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.requests.map((r) => r.id)).toEqual(['a'])
  })
})
