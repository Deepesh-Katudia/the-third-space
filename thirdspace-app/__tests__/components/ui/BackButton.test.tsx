import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { BackButton } from '../../../components/ui/BackButton'

// jest.mock is hoisted above these declarations, so the factory may only close over
// names prefixed with `mock`.
const mockBack = jest.fn()
const mockReplace = jest.fn()
const mockCanGoBack = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockCanGoBack(),
  }),
}))

const back = mockBack
const replace = mockReplace
const canGoBack = mockCanGoBack

describe('BackButton', () => {
  beforeEach(() => {
    back.mockClear()
    replace.mockClear()
    canGoBack.mockReturnValue(true)
  })

  it('pops the stack when there is history', () => {
    const { getByLabelText } = render(<BackButton />)
    fireEvent.press(getByLabelText('Go back'))
    expect(back).toHaveBeenCalledTimes(1)
    expect(replace).not.toHaveBeenCalled()
  })

  it('falls back to a real destination when there is no history', () => {
    // Push notifications router.push() straight into chat/event/member on a cold
    // start, so back() there would be a dead button without this fallback.
    canGoBack.mockReturnValue(false)
    const { getByLabelText } = render(<BackButton />)
    fireEvent.press(getByLabelText('Go back'))
    expect(back).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalledWith('/(app)')
  })

  it('honours an explicit fallback destination', () => {
    canGoBack.mockReturnValue(false)
    const { getByLabelText } = render(<BackButton fallbackHref="/(auth)/onboarding" />)
    fireEvent.press(getByLabelText('Go back'))
    expect(replace).toHaveBeenCalledWith('/(auth)/onboarding')
  })

  it('lets a screen supply its own exit behaviour', () => {
    // verify-identity has two entry paths and decides where "back" means.
    const onPress = jest.fn()
    const { getByLabelText } = render(<BackButton onPress={onPress} />)
    fireEvent.press(getByLabelText('Go back'))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(back).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it('renders an optional label beside the arrow', () => {
    const { getByText } = render(<BackButton label="Back" />)
    expect(getByText('Back')).toBeTruthy()
  })
})
