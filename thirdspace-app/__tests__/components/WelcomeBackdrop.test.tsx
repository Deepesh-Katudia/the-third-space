import React from 'react'
import { Animated } from 'react-native'
import { render } from '@testing-library/react-native'
import { WelcomeBackdrop } from '../../components/WelcomeBackdrop'

describe('WelcomeBackdrop', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders the field', () => {
    const { getByTestId } = render(<WelcomeBackdrop reduceMotion={false} />)
    expect(getByTestId('welcome-backdrop')).toBeTruthy()
  })

  it('starts ambient loops when motion is allowed', () => {
    const loop = jest.spyOn(Animated, 'loop')
    render(<WelcomeBackdrop reduceMotion={false} />)
    expect(loop).toHaveBeenCalled()
  })

  it('starts no loop at all when reduced motion is on', () => {
    // Not "a slower animation" — reduced motion means no animation is created.
    const loop = jest.spyOn(Animated, 'loop')
    render(<WelcomeBackdrop reduceMotion />)
    expect(loop).not.toHaveBeenCalled()
  })

  it('stops its loops on unmount', () => {
    // A running Animated.loop holds a reference and keeps ticking after the screen
    // is gone. This is the same class of leak fixed in 977b150.
    const stop = jest.fn()
    jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as unknown as Animated.CompositeAnimation)
    const { unmount } = render(<WelcomeBackdrop reduceMotion={false} />)
    unmount()
    expect(stop).toHaveBeenCalled()
  })
})
