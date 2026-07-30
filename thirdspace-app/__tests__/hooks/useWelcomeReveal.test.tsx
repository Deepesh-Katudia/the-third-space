import { AccessibilityInfo } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useWelcomeReveal } from '../../hooks/useWelcomeReveal'

/**
 * What is NOT tested here, deliberately: the interpolated value part-way through the
 * animation. With useNativeDriver the JS-side Animated.Value is not updated while the
 * animation runs, so advancing fake timers and reading __getValue() would assert the
 * behaviour of the jest mock rather than the app. The timeline's ORDERING is guarded
 * in __tests__/constants/design.test.ts; the motion itself is verified on device.
 */
describe('useWelcomeReveal', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  const values = (r: ReturnType<typeof useWelcomeReveal>) =>
    [r.mark, r.wordmark, r.tagline, r.sheet].map((v) => (v as unknown as { __getValue: () => number }).__getValue())

  it('starts every element hidden under normal motion', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    expect(values(result.current)).toEqual([0, 0, 0, 0])
  })

  it('starts every element fully revealed when reduced motion is on', async () => {
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockResolvedValue(true)
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(true))
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('drives everything to the final state on skip', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    act(() => { result.current.skip() })
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('is idempotent — skipping twice is harmless', async () => {
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
    act(() => { result.current.skip(); result.current.skip() })
    expect(values(result.current)).toEqual([1, 1, 1, 1])
  })

  it('treats a failed accessibility probe as motion allowed', async () => {
    // The probe is a native call and can reject. Falling back to "no reduced motion"
    // keeps the screen animating rather than silently freezing it.
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockRejectedValue(new Error('unavailable'))
    const { result } = renderHook(() => useWelcomeReveal())
    await waitFor(() => expect(result.current.reduceMotion).toBe(false))
  })

  it('survives the probe resolving after unmount', async () => {
    // The probe is async and the screen can be dismissed before it lands. Resolve it
    // manually AFTER unmounting to prove the mounted guard holds.
    //
    // Note this asserts "does not throw", not "React did not warn" — React 19 no
    // longer warns about setState on an unmounted component, so a console.error spy
    // would pass whether or not the guard existed, and prove nothing.
    let release!: (value: boolean) => void
    const pending = new Promise<boolean>((resolve) => { release = resolve })
    ;(AccessibilityInfo.isReduceMotionEnabled as jest.Mock).mockReturnValue(pending)

    const { unmount } = renderHook(() => useWelcomeReveal())
    unmount()

    await act(async () => { release(true); await pending })
  })
})
