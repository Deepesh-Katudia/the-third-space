import { renderHook, act } from '@testing-library/react-native'
import { useSocials } from '../../hooks/useSocials'

const mockUnsubscribe = jest.fn()
let mockOnChange: (handles: Record<string, string>) => void
let mockOnError: (code: string) => void

jest.mock('../../services/profiles', () => ({
  subscribeSocials: jest.fn((_uid: string, onChange: never, onError: never) => {
    mockOnChange = onChange
    mockOnError = onError
    return mockUnsubscribe
  }),
}))

beforeEach(() => {
  mockUnsubscribe.mockClear()
})

describe('useSocials', () => {
  it('exposes handles and marks them visible once the read succeeds', () => {
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnChange({ instagram: 'maya' }) })
    expect(result.current.handles).toEqual({ instagram: 'maya' })
    expect(result.current.visible).toBe(true)
    expect(result.current.loading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('treats permission-denied as not visible, NOT as an error', () => {
    // The rules deny non-connections by design. Surfacing that as an error would
    // put a failure banner on the profile of everyone you are not connected to.
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnError('permission-denied') })
    expect(result.current.visible).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('reports any other error code as a real error', () => {
    const { result } = renderHook(() => useSocials('other'))
    act(() => { mockOnError('unavailable') })
    expect(result.current.visible).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.hasError).toBe(true)
  })

  it('stays inert with no uid and does not subscribe', () => {
    const { result } = renderHook(() => useSocials(undefined))
    expect(result.current.visible).toBe(false)
    expect(result.current.loading).toBe(false)
    expect(result.current.hasError).toBe(false)
    expect(result.current.handles).toEqual({})
  })

  it('clears the previous member handles the moment the uid changes', () => {
    // Without the reset-before-resubscribe ordering in the effect, member A's
    // handles would stay on screen AND stay `visible` while B's subscription
    // resolves — one member's private handles rendered on another's profile.
    const { result, rerender } = renderHook(
      ({ uid }: { uid: string | undefined }) => useSocials(uid),
      {
        initialProps: { uid: 'other' },
      }
    )
    act(() => { mockOnChange({ instagram: 'maya' }) })
    expect(result.current.handles).toEqual({ instagram: 'maya' })
    expect(result.current.visible).toBe(true)

    rerender({ uid: 'someone-else' })

    expect(result.current.handles).toEqual({})
    expect(result.current.visible).toBe(false)
    expect(result.current.loading).toBe(true)
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useSocials('other'))
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
