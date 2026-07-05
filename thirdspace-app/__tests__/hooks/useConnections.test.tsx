import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useConnections } from '../../hooks/useConnections'
import { subscribeFollowing, subscribeFollowers } from '../../services/follows'

jest.mock('../../services/follows', () => ({
  subscribeFollowing: jest.fn(),
  subscribeFollowers: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

function captureBoth() {
  let emitFollowing: (uids: string[]) => void = () => {}
  let failFollowing: () => void = () => {}
  let emitFollowers: (uids: string[]) => void = () => {}
  const unsubFollowing = jest.fn()
  const unsubFollowers = jest.fn()
  ;(subscribeFollowing as jest.Mock).mockImplementation((_uid, onChange, onError) => {
    emitFollowing = onChange
    failFollowing = onError
    return unsubFollowing
  })
  ;(subscribeFollowers as jest.Mock).mockImplementation((_uid, onChange) => {
    emitFollowers = onChange
    return unsubFollowers
  })
  return {
    emitFollowing: (u: string[]) => emitFollowing(u),
    failFollowing: () => failFollowing(),
    emitFollowers: (u: string[]) => emitFollowers(u),
    unsubFollowing,
    unsubFollowers,
  }
}

describe('useConnections', () => {
  it('stays loading until both subscriptions emit, then intersects', async () => {
    const cb = captureBoth()
    const { result } = renderHook(() => useConnections('me'))
    act(() => cb.emitFollowing(['a', 'b', 'c']))
    expect(result.current.loading).toBe(true)
    act(() => cb.emitFollowers(['b', 'c', 'd']))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connectionUids).toEqual(['b', 'c'])
  })

  it('returns empty and does not subscribe when uid is undefined', async () => {
    const { result } = renderHook(() => useConnections(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.connectionUids).toEqual([])
    expect(subscribeFollowing).not.toHaveBeenCalled()
    expect(subscribeFollowers).not.toHaveBeenCalled()
  })

  it('sets hasError and stops loading when a subscription errors', async () => {
    const cb = captureBoth()
    const { result } = renderHook(() => useConnections('me'))
    act(() => cb.failFollowing())
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(result.current.loading).toBe(false)
  })

  it('unsubscribes from both queries on unmount', () => {
    const cb = captureBoth()
    const { unmount } = renderHook(() => useConnections('me'))
    unmount()
    expect(cb.unsubFollowing).toHaveBeenCalledTimes(1)
    expect(cb.unsubFollowers).toHaveBeenCalledTimes(1)
  })
})
