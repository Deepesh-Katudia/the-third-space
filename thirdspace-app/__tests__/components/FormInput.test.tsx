import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { FormInput } from '../../components/FormInput'
import { type as typeScale } from '../../constants/design'

function flat(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(flat))
    : ((style ?? {}) as Record<string, unknown>)
}

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

describe('FormInput casing', () => {
  it('uppercases a plain field like the rest of the app', () => {
    const { getByDisplayValue } = render(
      <FormInput label="Display name" value="ada lovelace" onChangeText={() => {}} />
    )
    expect(flat(getByDisplayValue('ada lovelace').props.style).textTransform).toBe('uppercase')
  })

  it('leaves a password field in its real casing', () => {
    // The Show toggle reveals this field. Uppercasing it would display HUNTER2
    // for a password that is actually hunter2 — the field lying about the
    // credential it holds. Do not "simplify" this override away.
    const { getByDisplayValue } = render(
      <FormInput label="Password" secureTextEntry value="hunter2" onChangeText={() => {}} />
    )
    expect(flat(getByDisplayValue('hunter2').props.style).textTransform).toBe('none')
    // And the exception is genuinely an override, not the global default.
    expect(typeScale.bodyLg.textTransform).toBe('uppercase')
  })
})
