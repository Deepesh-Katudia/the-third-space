import React from 'react'
import { AccessibilityInfo, StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
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
})
