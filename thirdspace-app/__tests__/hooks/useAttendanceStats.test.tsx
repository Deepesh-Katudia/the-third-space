import { renderHook, waitFor } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { useAttendanceStats } from '../../hooks/useAttendanceStats'
import { getMyRegisteredEvents } from '../../services/events'
import { CommunityEvent } from '../../types/models'

jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))

function event(id: string, msFromNow: number): CommunityEvent {
  return {
    id, title: 'E', description: '', category: 'Social',
    startsAt: { toMillis: () => Date.now() + msFromNow } as unknown as Timestamp,
    capacity: 10, ageRequirement: '18+', venueId: 'v1', venueName: 'V', neighborhood: 'N', registeredCount: 1,
  }
}

beforeEach(() => jest.clearAllMocks())

describe('useAttendanceStats', () => {
  it('returns only events that already started', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockResolvedValue([
      event('past', -60_000),
      event('future', 60_000),
    ])
    const { result } = renderHook(() => useAttendanceStats('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents.map((e) => e.id)).toEqual(['past'])
  })

  it('returns loading=false with an empty array when uid is undefined', async () => {
    const { result } = renderHook(() => useAttendanceStats(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents).toEqual([])
    expect(getMyRegisteredEvents).not.toHaveBeenCalled()
    expect(result.current.hasError).toBe(false)
  })

  it('returns an empty array on fetch failure', async () => {
    ;(getMyRegisteredEvents as jest.Mock).mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useAttendanceStats('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.attendedEvents).toEqual([])
    expect(result.current.hasError).toBe(true)
  })
})
