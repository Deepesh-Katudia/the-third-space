import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useFollowStatus } from '../../hooks/useFollowStatus'
import { followUser, unfollowUser, subscribeFollowStatus } from '../../services/follows'

jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }))
jest.mock('../../services/follows', () => ({
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  subscribeFollowStatus: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

function captureStatusCallback() {
  let emit: (v: boolean) => void = () => {}
  let fail: () => void = () => {}
  ;(subscribeFollowStatus as jest.Mock).mockImplementation((_f, _t, onChange, onError) => {
    emit = onChange
    fail = onError
    return jest.fn()
  })
  return { emit: (v: boolean) => emit(v), fail: () => fail() }
}

describe('useFollowStatus', () => {
  it('subscribes to the edge and reflects the emitted status', async () => {
    const cb = captureStatusCallback()
    const { result } = renderHook(() => useFollowStatus('you'))
    expect(subscribeFollowStatus).toHaveBeenCalledWith('me', 'you', expect.any(Function), expect.any(Function))
    act(() => cb.emit(true))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isFollowing).toBe(true)
  })

  it('toggle follows when not following and unfollows when following', async () => {
    const cb = captureStatusCallback()
    ;(followUser as jest.Mock).mockResolvedValue(undefined)
    ;(unfollowUser as jest.Mock).mockResolvedValue(undefined)
    const { result } = renderHook(() => useFollowStatus('you'))
    act(() => cb.emit(false))
    await act(async () => result.current.toggle())
    expect(followUser).toHaveBeenCalledWith('me', 'you')
    act(() => cb.emit(true))
    await act(async () => result.current.toggle())
    expect(unfollowUser).toHaveBeenCalledWith('me', 'you')
  })

  it('does not subscribe and stays inert when the target is yourself', async () => {
    const { result } = renderHook(() => useFollowStatus('me'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(subscribeFollowStatus).not.toHaveBeenCalled()
    expect(result.current.isFollowing).toBe(false)
    await act(async () => result.current.toggle())
    expect(followUser).not.toHaveBeenCalled()
  })

  it('sets hasError when the subscription errors', async () => {
    const cb = captureStatusCallback()
    const { result } = renderHook(() => useFollowStatus('you'))
    act(() => cb.fail())
    await waitFor(() => expect(result.current.hasError).toBe(true))
    expect(result.current.loading).toBe(false)
  })
})
