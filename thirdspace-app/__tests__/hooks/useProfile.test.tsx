import { renderHook, waitFor } from '@testing-library/react-native'
import { useProfile } from '../../hooks/useProfile'
import { getProfile } from '../../services/profiles'

jest.mock('../../services/profiles', () => ({ getProfile: jest.fn(), subscribeProfile: jest.fn() }))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' } }) }))

describe('useProfile', () => {
  it('one-shot fetches another user profile', async () => {
    ;(getProfile as jest.Mock).mockResolvedValue({ displayName: 'Maya' })
    const { result } = renderHook(() => useProfile('other'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(getProfile).toHaveBeenCalledWith('other')
    expect(result.current.profile).toEqual({ displayName: 'Maya' })
  })

  it('returns loading=false with null when uid is undefined', async () => {
    const { result } = renderHook(() => useProfile(undefined))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.profile).toBeNull()
  })
})
