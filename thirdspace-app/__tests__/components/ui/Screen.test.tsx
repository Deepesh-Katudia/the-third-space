import React from 'react'
import { Text, AccessibilityInfo } from 'react-native'
import { render } from '@testing-library/react-native'
import { Screen } from '../../../components/ui/Screen'
import { palette, NAV_CLEARANCE } from '../../../constants/design'

describe('Screen', () => {
  beforeEach(() => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('carries the ambient field, so every route in the app has it', () => {
    const { getByTestId } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('ambient-backdrop')).toBeTruthy()
  })

  it('shows the field bare on the default deep tone', () => {
    const { queryByTestId } = render(<Screen><Text>x</Text></Screen>)
    expect(queryByTestId('screen-veil')).toBeNull()
  })

  it('veils the field for forms and chat threads rather than covering it', () => {
    const { getByTestId } = render(<Screen tone="cream"><Text>x</Text></Screen>)
    expect(getByTestId('screen-veil').props.style).toMatchObject({ backgroundColor: palette.creamVeil })
    // Still the ambient underneath — cream screens are veiled, never opted out.
    expect(getByTestId('ambient-backdrop')).toBeTruthy()
  })

  it('keeps the safe-area layer transparent so the field reaches the status bar', () => {
    // Absolutely-positioned children lay out against the padding edge, so a backdrop
    // inside the SafeAreaView would stop at the notch. It sits outside, and this layer
    // must not paint over it.
    const { getByTestId } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style).toMatchObject({ backgroundColor: 'transparent' })
  })

  it('pads for the tab bar only when padBottom is set', () => {
    const { getByTestId, rerender } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(0)
    rerender(<Screen padBottom><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(NAV_CLEARANCE)
  })
})
