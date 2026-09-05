import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useConnections } from '../../hooks/useConnections'
import { subscribeFollowing, subscribeFollowers } from '../../services/follows'

jest.mock('../../services/follows', () => ({
  subscribeFollowing: jest.fn(),
  subscribeFollowers: jest.fn(),
}))

// Mocked rather than left real because useBlocks reaches services/blocks and therefore
// firebase/config, which this suite has no business loading. `mock`-prefixed name because
// babel-plugin-jest-hoist rejects any other out-of-scope reference in a factory.
let mockBlocks: { blocked: Set<string>; isBlocked: (uid: string) => boolean; loading: boolean }
jest.mock('../../hooks/useBlocks', () => ({ useBlocks: () => mockBlocks }))

beforeEach(() => {
  jest.clearAllMocks()
  mockBlocks = { blocked: new Set(), isBlocked: () => false, loading: false }
})

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

it('excludes a blocked member from the mutuals', async () => {
  // A block denies NEW follow edges, it does not delete existing ones — so a mutual that
  // predates the block survives in Firestore and has to be filtered out here.
  mockBlocks = { blocked: new Set(['bad']), isBlocked: (uid) => uid === 'bad', loading: false }
  const h = captureBoth()
  const { result } = renderHook(() => useConnections('me'))
  await act(async () => {
    h.emitFollowing(['bad', 'good'])
    h.emitFollowers(['bad', 'good'])
  })
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.connectionUids).toEqual(['good'])
})
