import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { RewardUnlock } from '../../components/RewardUnlock'
import { Mascot } from '../../components/Mascot'
import { achievement, ACHIEVEMENTS } from '../../constants/achievements'
import { MASCOT_FIGURES } from '../../constants/mascotFigures'

function stubReduceMotion(enabled: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(enabled)
  jest
    .spyOn(AccessibilityInfo, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
}

const wildCard = achievement('wild-card')!

describe('RewardUnlock', () => {
  beforeEach(() => stubReduceMotion(true))
  afterEach(() => jest.restoreAllMocks())

  it('renders nothing until an achievement is handed to it', () => {
    const { queryByTestId } = render(<RewardUnlock achievement={null} onDismiss={() => {}} />)
    expect(queryByTestId('reward-unlock')).toBeNull()
  })

  it('shows the name, prompt and points of the reward', () => {
    const { getByText } = render(<RewardUnlock achievement={wildCard} onDismiss={() => {}} />)
    expect(getByText(wildCard.name)).toBeTruthy()
    expect(getByText(wildCard.prompt)).toBeTruthy()
    expect(getByText(`+${wildCard.points} pts`)).toBeTruthy()
  })

  it('shows the mascot belonging to that reward', () => {
    const { getByTestId } = render(<RewardUnlock achievement={wildCard} onDismiss={() => {}} />)
    expect(getByTestId('mascot-wild-card')).toBeTruthy()
  })

  it('dismisses through the CTA', () => {
    const onDismiss = jest.fn()
    const { getByText } = render(<RewardUnlock achievement={wildCard} onDismiss={onDismiss} />)
    fireEvent.press(getByText('Continue'))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('says how many are still queued behind this one', () => {
    // Earning three things at once should not feel like being trapped in a loop.
    const { getByText } = render(
      <RewardUnlock achievement={wildCard} onDismiss={() => {}} ctaLabel="Next (2 more)" />
    )
    expect(getByText('Next (2 more)')).toBeTruthy()
  })
})

describe('Mascot', () => {
  beforeEach(() => stubReduceMotion(true))
  afterEach(() => jest.restoreAllMocks())

  it('draws every figure in the roster without throwing', () => {
    // 25 hand-transcribed figures. This is the guard that a bad path or a missing
    // gradient stop shows up here rather than as a blank square on someone's phone.
    for (const a of ACHIEVEMENTS) {
      const { getByTestId, unmount } = render(<Mascot id={a.id} />)
      expect(getByTestId(`mascot-${a.id}`)).toBeTruthy()
      unmount()
    }
  })

  it('renders a placeholder rather than crashing on an unknown id', () => {
    const { getByTestId } = render(<Mascot id="not-a-mascot" />)
    expect(getByTestId('mascot-missing-not-a-mascot')).toBeTruthy()
  })

  it('gives every figure a body gradient with at least two stops', () => {
    // One stop is a flat fill pretending to be a gradient — the characters lose their
    // volume entirely and it is hard to spot by eye at grid size.
    for (const [id, figure] of Object.entries(MASCOT_FIGURES)) {
      expect([id, figure.grad.stops.length >= 2]).toEqual([id, true])
    }
  })

  it('gives every figure a shape that uses the body gradient', () => {
    // A figure whose body forgot `f: 'body'` renders as an unfilled silhouette.
    for (const [id, figure] of Object.entries(MASCOT_FIGURES)) {
      expect([id, figure.shapes.some((s) => s.f === 'body')]).toEqual([id, true])
    }
  })
})
