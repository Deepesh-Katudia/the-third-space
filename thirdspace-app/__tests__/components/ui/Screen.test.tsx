import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { Screen } from '../../../components/ui/Screen'
import { palette, NAV_CLEARANCE } from '../../../constants/design'

describe('Screen', () => {
  it('defaults to the deep orange browse background', () => {
    const { getByTestId } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style).toMatchObject({ backgroundColor: palette.orangeDeep })
  })

  it('uses cream when asked, for forms and chat threads', () => {
    const { getByTestId } = render(<Screen tone="cream"><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style).toMatchObject({ backgroundColor: palette.cream })
  })

  it('pads for the tab bar only when padBottom is set', () => {
    const { getByTestId, rerender } = render(<Screen><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(0)
    rerender(<Screen padBottom><Text>x</Text></Screen>)
    expect(getByTestId('screen-root').props.style.paddingBottom).toBe(NAV_CLEARANCE)
  })
})
