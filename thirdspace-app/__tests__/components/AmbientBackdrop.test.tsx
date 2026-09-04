import React from 'react'
import { Animated, AccessibilityInfo, StyleSheet } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { AmbientBackdrop } from '../../components/AmbientBackdrop'

/** The component probes reduced motion itself, so every case has to stub the probe. */
function stubReduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled)
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
}

describe('AmbientBackdrop', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the field', () => {
    stubReduceMotion(false)
    const { getByTestId } = render(<AmbientBackdrop />)
    expect(getByTestId('ambient-backdrop')).toBeTruthy()
  })

  it('never translates a glow vertically', () => {
    // The field is the app's background and it sits still. A vertical drift reads as the
    // whole background sliding up while you scroll a feed over it — the one motion the
    // eye tracks against the scrolling content. Horizontal drift and the scale breathe
    // stay; a rising field does not.
    stubReduceMotion(false)
    const { getAllByTestId } = render(<AmbientBackdrop />)
    const glows = getAllByTestId('ambient-glow')
    expect(glows).toHaveLength(5)
    glows.forEach((glow) => {
      const { transform } = StyleSheet.flatten(glow.props.style)
      const keys = (transform ?? []).flatMap((entry: object) => Object.keys(entry))
      expect(keys).not.toContain('translateY')
    })
  })

  it('clips the field, so its bleed never becomes scrollable overflow', () => {
    // The rings hang past the viewport on every side by design. Unclipped that bleed is
    // real overflow: on web it raises a scrollbar, the scrollbar shrinks the viewport,
    // every blob is sized from `useWindowDimensions()` so the field re-lays-out, and the
    // overflow changes again. The layout oscillates forever and the page visibly jitters.
    stubReduceMotion(false)
    const { getByTestId } = render(<AmbientBackdrop />)
    const { overflow } = StyleSheet.flatten(getByTestId('ambient-backdrop').props.style)
    expect(overflow).toBe('hidden')
  })

  it('starts ambient loops when motion is allowed', async () => {
    stubReduceMotion(false)
    const loop = jest.spyOn(Animated, 'loop')
    render(<AmbientBackdrop />)
    await waitFor(() => expect(loop).toHaveBeenCalled())
  })

  it('runs ONE set of loops no matter how many backdrops are mounted', async () => {
    // Every screen mounts a field and react-navigation keeps stacked screens mounted, so
    // per-instance drivers meant a 3-deep stack ran three sets of loops out of phase with
    // each other — and the glows visibly jumped the moment a screen was pushed. One
    // shared set is both the cheap version and the one that looks nailed down.
    stubReduceMotion(false)
    const loop = jest.spyOn(Animated, 'loop')
    render(
      <>
        <AmbientBackdrop />
        <AmbientBackdrop />
        <AmbientBackdrop />
      </>,
    )
    await waitFor(() => expect(loop).toHaveBeenCalled())
    // 5 blobs + 5 sparks, once — not once per mounted backdrop.
    expect(loop).toHaveBeenCalledTimes(10)
  })

  it('starts no loop at all when reduced motion is on', async () => {
    // Not "a slower animation" — reduced motion means no animation is created.
    stubReduceMotion(true)
    const loop = jest.spyOn(Animated, 'loop')
    render(<AmbientBackdrop />)
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled())
    expect(loop).not.toHaveBeenCalled()
  })

  it('starts no loop while the reduced-motion probe is still in flight', () => {
    // The default has to be "do not animate". Starting loops optimistically and tearing
    // them down once the probe answers animates at exactly the users who opted out.
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => {}))
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    const loop = jest.spyOn(Animated, 'loop')
    render(<AmbientBackdrop />)
    expect(loop).not.toHaveBeenCalled()
  })

  it('drives every timing animation on the native thread', async () => {
    // Confirms useNativeDriver is not silently dropped, which would move the ambient
    // drift onto the JS thread — where it competes with every list render in the app.
    stubReduceMotion(false)
    const timing = jest.spyOn(Animated, 'timing')
    render(<AmbientBackdrop />)
    await waitFor(() => expect(timing.mock.calls.length).toBeGreaterThan(0))
    timing.mock.calls.forEach(([, config]) => {
      expect(config.useNativeDriver).toBe(true)
    })
  })

  it('stops its loops on unmount', async () => {
    // A running Animated.loop holds a reference and keeps ticking after the screen is
    // gone. This is the same class of leak fixed in 977b150, and it matters more now
    // that the field is mounted by every screen rather than by one.
    stubReduceMotion(false)
    const stop = jest.fn()
    jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation)
    const { unmount } = render(<AmbientBackdrop />)
    await waitFor(() => expect(Animated.loop).toHaveBeenCalled())
    unmount()
    expect(stop).toHaveBeenCalled()
  })

  it('removes its reduced-motion listener on unmount', async () => {
    const remove = jest.fn()
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    const { unmount } = render(<AmbientBackdrop />)
    await waitFor(() => expect(AccessibilityInfo.addEventListener).toHaveBeenCalled())
    unmount()
    expect(remove).toHaveBeenCalled()
  })
})
