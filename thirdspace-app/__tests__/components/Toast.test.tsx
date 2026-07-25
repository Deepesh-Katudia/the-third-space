import React from 'react'
import { act, render } from '@testing-library/react-native'
import { Toast } from '../../components/Toast'

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('renders the message', () => {
    const { getByText } = render(<Toast message="Request sent to Maya" onDismiss={() => {}} />)
    expect(getByText('Request sent to Maya')).toBeTruthy()
  })

  it('calls onDismiss after the visible window elapses', () => {
    const onDismiss = jest.fn()
    render(<Toast message="Request sent to Maya" onDismiss={onDismiss} />)

    expect(onDismiss).not.toHaveBeenCalled()
    act(() => { jest.advanceTimersByTime(4000) })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not call onDismiss after unmounting mid-timer', () => {
    const onDismiss = jest.fn()
    const { unmount } = render(<Toast message="Request sent" onDismiss={onDismiss} />)
    unmount()
    act(() => { jest.advanceTimersByTime(4000) })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})
