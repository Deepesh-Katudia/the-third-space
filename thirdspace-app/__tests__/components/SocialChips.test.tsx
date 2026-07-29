import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SocialChips } from '../../components/SocialChips'

describe('SocialChips', () => {
  it('renders chips in SOCIAL_PLATFORMS order, not the order the keys were written', () => {
    // Keys deliberately x-first. The row must still read Instagram, TikTok, X —
    // this is the assertion that fails if anyone "simplifies" the component to
    // iterate the handles object instead of the platform table.
    const { getAllByRole } = render(
      <SocialChips handles={{ x: 'cee', tiktok: 'bee', instagram: 'ay' }} onOpen={jest.fn()} />
    )
    const labels = getAllByRole('link').map((node) => node.props.accessibilityLabel)
    expect(labels).toEqual(['Instagram, @ay', 'TikTok, @bee', 'X, @cee'])
  })

  it('renders nothing when no handle is set', () => {
    const { toJSON } = render(<SocialChips handles={{}} onOpen={jest.fn()} />)
    expect(toJSON()).toBeNull()
  })

  it('ignores a key present but blank', () => {
    const { toJSON } = render(<SocialChips handles={{ instagram: '' }} onOpen={jest.fn()} />)
    expect(toJSON()).toBeNull()
  })

  it('passes the platform URL to onOpen', () => {
    const onOpen = jest.fn()
    const { getByText } = render(<SocialChips handles={{ tiktok: 'maya' }} onOpen={onOpen} />)
    fireEvent.press(getByText('@maya'))
    expect(onOpen).toHaveBeenCalledWith('https://tiktok.com/@maya')
  })
})
