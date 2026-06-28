import { renderHook, waitFor } from '@testing-library/react-native'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { subscribeUpcomingEvents } from '../../services/events'

jest.mock('../../services/events', () => ({ subscribeUpcomingEvents: jest.fn() }))

describe('useUpcomingEvents', () => {
  it('exposes events from the subscription and clears loading', async () => {
    ;(subscribeUpcomingEvents as jest.Mock).mockImplementation((onChange) => {
      onChange([{ id: 'e1' }])
      return () => {}
    })
    const { result } = renderHook(() => useUpcomingEvents())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([{ id: 'e1' }])
    expect(result.current.hasError).toBe(false)
  })

  it('sets hasError when the subscription errors', async () => {
    ;(subscribeUpcomingEvents as jest.Mock).mockImplementation((_onChange, onError) => {
      onError()
      return () => {}
    })
    const { result } = renderHook(() => useUpcomingEvents())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasError).toBe(true)
  })
})
