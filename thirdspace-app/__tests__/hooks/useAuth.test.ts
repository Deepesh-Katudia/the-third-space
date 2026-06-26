import { renderHook, waitFor } from '@testing-library/react-native'
import { useAuth } from '../../hooks/useAuth'
import { onAuthStateChanged } from 'firebase/auth'
import { getDoc } from 'firebase/firestore'

jest.mock('../../firebase/config', () => ({
  auth: {},
  db: {},
}))

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}))

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('starts with no user, no role, and loading true', () => {
    // mock onAuthStateChanged to never call back
    ;(onAuthStateChanged as jest.Mock).mockReturnValue(jest.fn())
    const { result } = renderHook(() => useAuth())
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.hasProfile).toBe(false)
    expect(result.current.loading).toBe(true)
  })

  test('sets role from Firestore when user exists', async () => {
    const mockUser = { uid: 'abc123' }
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(mockUser)
      return jest.fn()
    })
    ;(getDoc as jest.Mock)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'hoster' }) }) // users
      .mockResolvedValueOnce({ exists: () => false }) // profiles
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('hoster')
    expect(result.current.hasProfile).toBe(false)
  })

  test('role is null when user has no Firestore document', async () => {
    const mockUser = { uid: 'newuser' }
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(mockUser)
      return jest.fn()
    })
    ;(getDoc as jest.Mock)
      .mockResolvedValueOnce({ exists: () => false }) // users
      .mockResolvedValueOnce({ exists: () => false }) // profiles
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
    expect(result.current.hasProfile).toBe(false)
  })

  test('clears user and role on sign-out', async () => {
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(null)
      return jest.fn()
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.hasProfile).toBe(false)
  })

  test('role is attender and hasProfile is false when profile doc is absent', async () => {
    const mockUser = { uid: 'attender789' }
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(mockUser)
      return jest.fn()
    })
    ;(getDoc as jest.Mock)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'attender' }) }) // users
      .mockResolvedValueOnce({ exists: () => false }) // profiles
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBe('attender')
    expect(result.current.hasProfile).toBe(false)
  })

  test('exposes hasProfile=true when the profile doc exists', async () => {
    const mockUser = { uid: 'user456' }
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(mockUser)
      return jest.fn()
    })
    ;(getDoc as jest.Mock)
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ role: 'attender' }) }) // users
      .mockResolvedValueOnce({ exists: () => true }) // profiles
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasProfile).toBe(true)
    expect(result.current.role).toBe('attender')
  })
})
