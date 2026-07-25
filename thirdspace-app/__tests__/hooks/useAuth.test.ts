import { renderHook, waitFor, act } from '@testing-library/react-native'
import { useAuth } from '../../hooks/useAuth'
import { onAuthStateChanged } from 'firebase/auth'
import { onSnapshot } from 'firebase/firestore'

jest.mock('../../firebase/config', () => ({
  auth: {},
  db: {},
}))

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  onSnapshot: jest.fn(),
}))

// The hook subscribes to users/{uid} first, then profiles/{uid}. Capture each
// snapshot handler by call order so tests can drive live emissions.
function captureSnapshots() {
  const handlers: { next: (snap: { exists: () => boolean; data?: () => Record<string, unknown> }) => void; error: () => void }[] = []
  ;(onSnapshot as jest.Mock).mockImplementation((_ref, next, error) => {
    handlers.push({ next, error })
    return jest.fn()
  })
  return {
    emitUser: (snap: { exists: () => boolean; data?: () => Record<string, unknown> }) => handlers[0]?.next(snap),
    failUser: () => handlers[0]?.error(),
    emitProfile: (snap: { exists: () => boolean }) => handlers[1]?.next(snap),
    failProfile: () => handlers[1]?.error(),
  }
}

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('starts with no user, no role, and loading true', () => {
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
    const snaps = captureSnapshots()
    const { result } = renderHook(() => useAuth())
    act(() => {
      snaps.emitUser({ exists: () => true, data: () => ({ role: 'hoster' }) })
      snaps.emitProfile({ exists: () => false })
    })
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
    const snaps = captureSnapshots()
    const { result } = renderHook(() => useAuth())
    act(() => {
      snaps.emitUser({ exists: () => false })
      snaps.emitProfile({ exists: () => false })
    })
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
    const snaps = captureSnapshots()
    const { result } = renderHook(() => useAuth())
    act(() => {
      snaps.emitUser({ exists: () => true, data: () => ({ role: 'attender' }) })
      snaps.emitProfile({ exists: () => false })
    })
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
    const snaps = captureSnapshots()
    const { result } = renderHook(() => useAuth())
    act(() => {
      snaps.emitUser({ exists: () => true, data: () => ({ role: 'attender' }) })
      snaps.emitProfile({ exists: () => true })
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.hasProfile).toBe(true)
    expect(result.current.role).toBe('attender')
  })

  test('reacts to a role written after the initial snapshot', async () => {
    const mockUser = { uid: 'lateRole' }
    ;(onAuthStateChanged as jest.Mock).mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(mockUser)
      return jest.fn()
    })
    const snaps = captureSnapshots()
    const { result } = renderHook(() => useAuth())
    act(() => {
      snaps.emitUser({ exists: () => false })
      snaps.emitProfile({ exists: () => false })
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.role).toBeNull()
    // role-select writes the users doc -> live snapshot fires again
    act(() => snaps.emitUser({ exists: () => true, data: () => ({ role: 'attender' }) }))
    expect(result.current.role).toBe('attender')
  })
})
