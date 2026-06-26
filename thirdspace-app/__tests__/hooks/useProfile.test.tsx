import { renderHook, waitFor } from '@testing-library/react-native'
import { useProfile } from '../../hooks/useProfile'
import { getProfile, subscribeProfile } from '../../services/profiles'

const mockUser = { uid: 'me' }

jest.mock('../../services/profiles', () => ({ getProfile: jest.fn(), subscribeProfile: jest.fn() }))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ user: mockUser }))
}))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('useProfile', () => {
  it('one-shot fetches another user profile', async () => {
    ;(getProfile as jest.Mock).mockResolvedValue({ displayName: 'Maya' })
    const { result } = renderHook(() => useProfile('other'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getProfile).toHaveBeenCalledWith('other')
    expect(result.current.profile).toEqual({ displayName: 'Maya' })
    expect(result.current.hasError).toBe(false)
  })

  it('subscribes realtime for the current user own profile and unsubscribes on unmount', () => {
    const unsub = jest.fn()
    ;(subscribeProfile as jest.Mock).mockImplementation((_uid, onData) => { onData({ displayName: 'Self' }); return unsub })
    const { result, unmount } = renderHook(() => useProfile('me'))
    expect(subscribeProfile).toHaveBeenCalledWith('me', expect.any(Function), expect.any(Function))
    expect(result.current.profile).toEqual({ displayName: 'Self' })
    expect(result.current.loading).toBe(false)
    unmount()
    expect(unsub).toHaveBeenCalled()
  })

  it('returns loading=false with null when uid is undefined', async () => {
    const { result } = renderHook(() => useProfile(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toBeNull()
  })
})
