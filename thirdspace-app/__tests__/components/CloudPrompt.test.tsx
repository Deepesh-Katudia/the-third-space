import React from 'react'
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native'
import { act, render, fireEvent, waitFor } from '@testing-library/react-native'
import { CloudPrompt } from '../../components/CloudPrompt'
import type { CloudPrompt as Prompt } from '../../constants/cloudPrompts'

function stubReduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled)
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
}

const prompt: Prompt = {
  id: 'coach-discover',
  kind: 'coaching',
  role: 'attender',
  routes: ['/'],
  eyebrow: 'just a thought',
  title: "Don't just scroll. Show up.",
  body: "There's a spot open tonight.",
  cta: "I'm in",
}

describe('CloudPrompt', () => {
  beforeEach(() => stubReduceMotion(true))
  afterEach(() => jest.restoreAllMocks())

  it('renders nothing when there is no prompt', () => {
    const { queryByTestId } = render(<CloudPrompt prompt={null} onDismiss={jest.fn()} onAct={jest.fn()} />)
    expect(queryByTestId('cloud-prompt')).toBeNull()
  })

  it('renders the eyebrow, title, body and CTA', () => {
    const { getByText } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    expect(getByText('just a thought')).toBeTruthy()
    expect(getByText("Don't just scroll. Show up.")).toBeTruthy()
    expect(getByText("There's a spot open tonight.")).toBeTruthy()
    expect(getByText("I'm in")).toBeTruthy()
  })

  it('uppercases the title by token rather than by transforming the string', () => {
    // The casing is display-only: the style carries textTransform, and the node's own
    // text stays exactly as the catalogue wrote it, so a screen reader still receives
    // the sentence rather than shouting. Asserting getByText alone would prove nothing
    // beyond the test above — this checks BOTH halves of that arrangement.
    const { getByText } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    const title = getByText("Don't just scroll. Show up.")
    expect(title.props.children).toBe("Don't just scroll. Show up.")
    expect(StyleSheet.flatten(title.props.style).textTransform).toBe('uppercase')
  })

  it('calls onAct with the prompt when the CTA is pressed', () => {
    const onAct = jest.fn()
    const { getByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={onAct} />)
    fireEvent.press(getByTestId('cloud-prompt-cta'))
    expect(onAct).toHaveBeenCalledWith(prompt)
  })

  it('calls onDismiss when the scrim is pressed', () => {
    const onDismiss = jest.fn()
    const { getByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={onDismiss} onAct={jest.fn()} />)
    fireEvent.press(getByTestId('cloud-prompt-scrim'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('renders under reduced motion without starting any loop', async () => {
    stubReduceMotion(true)
    const loop = jest.spyOn(require('react-native').Animated, 'loop')
    const { getByTestId, findByTestId } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    await findByTestId('cloud-prompt')
    expect(getByTestId('cloud-prompt')).toBeTruthy()
    expect(loop).not.toHaveBeenCalled()
  })

  // The six tests above all stub reduced motion ON, so none of them ever exercise the
  // entrance parallel, the comet/puff/shimmer/twinkle interpolations, the bob/glow/
  // twinkle loops, or the Animated.add/multiply composition in wrapStyle/glowOpacity —
  // roughly 60% of the file. These tests cover the non-reduced path directly.

  it('starts the ambient loops when reduced motion is off', async () => {
    stubReduceMotion(false)
    const loop = jest.spyOn(Animated, 'loop')
    render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    // Proves the real entrance path — not just the reduced fallback — actually runs.
    await waitFor(() => expect(loop).toHaveBeenCalled())
  })

  it('drives every timing animation on the native thread', async () => {
    // Confirms useNativeDriver is not silently dropped anywhere in the entrance parallel
    // or the breathing loops, which would move the cloud's motion onto the JS thread.
    //
    // Waiting on `timing.mock.calls.length > 0` alone is a trap: it is already satisfied
    // at mount by the reduced-motion fade (reduceMotion starts `true` for one tick on
    // every instance, regardless of this stub), which is itself a single `Animated.timing`
    // call with `duration: cloudMotion.reducedIn`. That branch is already covered by six
    // other tests, so asserting on it here proves nothing about the entrance parallel or
    // the bob/glow/twinkle loops — the test's entire stated purpose — and a dropped
    // `useNativeDriver` on any of THOSE would still ship green. Waiting on the same
    // `Animated.loop` signal test 1 waits on guarantees the assertion runs only after the
    // real (non-reduced) entrance has actually started.
    stubReduceMotion(false)
    const timing = jest.spyOn(Animated, 'timing')
    const loop = jest.spyOn(Animated, 'loop')
    render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    await waitFor(() => expect(loop).toHaveBeenCalled())
    expect(timing.mock.calls.length).toBeGreaterThan(1)
    timing.mock.calls.forEach(([, config]) => {
      expect(config?.useNativeDriver).toBe(true)
    })
  })

  it('resets entrance values to 0 before branching on reduced motion (regression: I1)', async () => {
    // The probe starts unresolved, so `useReduceMotion` reports `true` on this component's
    // very first render — exactly like every real mount, motion-allowed or not. If the
    // effect skipped resetting before checking `reduceMotion`, the reduced branch below
    // would snap puffs/texts/glow to 1 on that first render, and the real entrance that
    // starts once the probe resolves `false` a tick later would animate values already at
    // their end state — killing the puff bloom, text cascade and glow fade-in on the
    // majority (motion-allowed) path.
    let resolveProbe: (enabled: boolean) => void = () => {}
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise((resolve) => { resolveProbe = resolve }))
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)

    const setValue = jest.spyOn(Animated.Value.prototype, 'setValue')
    render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)

    // Mount runs with the probe still in flight (defaults to reduced): entrance-only
    // drivers snap to 1.
    expect(setValue).toHaveBeenCalledWith(1)
    setValue.mockClear()

    await act(async () => {
      resolveProbe(false)
      await Promise.resolve()
    })

    // The real entrance path must reset those drivers back to 0 before animating them —
    // not pick up the stale 1s the reduced branch left behind.
    expect(setValue).toHaveBeenCalledWith(0)
  })

  it('stops its loops and resets every animated value when the prompt clears', async () => {
    stubReduceMotion(false)
    const stop = jest.fn()
    jest
      .spyOn(Animated, 'loop')
      .mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation)
    // The bob/glow/twinkle loops each sit behind an `Animated.delay` before the loop
    // itself starts (so the delay is paid once rather than every cycle — see the token
    // comment in the component). Making the delay resolve instantly moves the enclosing
    // sequence's active animation onto the (mocked) loop synchronously, so calling
    // `.stop()` on the outer sequence during cleanup reaches the loop's `stop` rather
    // than the still-pending delay's.
    jest.spyOn(Animated, 'delay').mockImplementation(
      () =>
        ({
          start: (cb?: (result: { finished: boolean }) => void) => cb?.({ finished: true }),
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    )
    const setValue = jest.spyOn(Animated.Value.prototype, 'setValue')

    const { rerender } = render(<CloudPrompt prompt={prompt} onDismiss={jest.fn()} onAct={jest.fn()} />)
    await waitFor(() => expect(Animated.loop).toHaveBeenCalled())

    setValue.mockClear()
    await act(async () => {
      rerender(<CloudPrompt prompt={null} onDismiss={jest.fn()} onAct={jest.fn()} />)
      // The AnimatedProps subscription this rerender triggers flushes via the
      // scheduler's own macrotask, one tick outside plain microtask draining.
      await new Promise((resolve) => setImmediate(resolve))
    })

    // The previous effect's cleanup stops the running loops...
    expect(stop).toHaveBeenCalled()
    // ...and the new effect run (visible === false) resets every driver back to 0, so a
    // prompt reappearing later starts clean rather than mid-animation.
    expect(setValue).toHaveBeenCalledWith(0)
  })
})
