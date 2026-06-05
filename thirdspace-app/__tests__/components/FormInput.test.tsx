import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { FormInput } from '../../components/FormInput'

describe('FormInput', () => {
  it('renders the label', () => {
    render(<FormInput label="Email" value="" onChangeText={() => {}} />)
    expect(screen.getByText('Email')).toBeTruthy()
  })
  it('renders error text when error prop is set', () => {
    render(<FormInput label="Email" value="" onChangeText={() => {}} error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeTruthy()
  })
  it('does not render error text when no error', () => {
    render(<FormInput label="Email" value="" onChangeText={() => {}} />)
    expect(screen.queryByText('Invalid email')).toBeNull()
  })
})
