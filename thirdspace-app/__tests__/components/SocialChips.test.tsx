import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { SocialChips } from '../../components/SocialChips'

describe('SocialChips', () => {
  it('renders one chip per set handle, in platform order', () => {
    const { getByText } = render(<SocialChips handles={{ x: 'maya', instagram: 'maya.codes' }} onOpen={jest.fn()} />)
    expect(getByText('@maya.codes')).toBeTruthy()
    expect(getByText('@maya')).toBeTruthy()
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
