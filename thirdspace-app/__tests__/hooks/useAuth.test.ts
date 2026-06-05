import { renderHook, act } from '@testing-library/react-native'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../firebase/config', () => ({
  auth: {},
}))

let authCallback: ((user: any) => void) | null = null

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: any, callback: any) => {
    authCallback = callback
    return jest.fn()
  }),
}))

describe('useAuth', () => {
  beforeEach(() => {
    authCallback = null
  })

  it('starts with loading true and no user', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user when auth state resolves with a user', () => {
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: '123', email: 'test@test.com' }
    act(() => { authCallback?.(mockUser) })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it('sets user to null when signed out', () => {
    const { result } = renderHook(() => useAuth())
    act(() => { authCallback?.(null) })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
