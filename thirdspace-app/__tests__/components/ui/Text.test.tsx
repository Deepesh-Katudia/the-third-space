import React from 'react'
import { render } from '@testing-library/react-native'
import { Display, Body, Meta, DisplayRole, BodyRole, MetaRole } from '../../../components/ui/Text'
import { palette, type as typeScale } from '../../../constants/design'

const flat = (style: unknown) => StyleSheetFlatten(style)
function StyleSheetFlatten(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(StyleSheetFlatten))
    : ((style ?? {}) as Record<string, unknown>)
}

describe('text primitives', () => {
  it('renders Display in Bebas Neue at the card-title role by default', () => {
    const { getByText } = render(<Display>Ceramics Night</Display>)
    const style = flat(getByText('Ceramics Night').props.style)
    expect(style.fontFamily).toBe(typeScale.cardTitle.fontFamily)
    expect(style.fontFamily).toMatch(/^BebasNeue_/)
    expect(style.color).toBe(palette.ink)
  })

  it('renders Body in Inter and Meta in IBM Plex Mono', () => {
    const { getByText: getBody } = render(<Body>Do exercise</Body>)
    const { getByText: getMeta } = render(<Meta>Sat, 7:00 PM</Meta>)
    expect(flat(getBody('Do exercise').props.style).fontFamily).toMatch(/^Inter_/)
    expect(flat(getMeta('Sat, 7:00 PM').props.style).fontFamily).toMatch(/^IBMPlexMono_/)
  })

  it('applies the requested role and tone', () => {
    const { getByText } = render(<Display role="screenTitle" tone="clay">Your events</Display>)
    const style = flat(getByText('Your events').props.style)
    expect(style.fontSize).toBe(typeScale.screenTitle.fontSize)
    expect(style.color).toBe(palette.clay)
  })

  it('uppercases through every face via the token, not the caller', () => {
    // Callers pass sentence case; the token does the transforming. If a primitive
    // stopped forwarding typeScale, these would go quiet rather than fail loudly,
    // so there is one assertion per face.
    const display = render(<Display role="cardTitle">Ceramics night</Display>)
    const body = render(<Body role="bodyLg">Do exercise</Body>)
    const meta = render(<Meta role="eyebrow">Send announcement</Meta>)

    expect(flat(display.getByText('Ceramics night').props.style).textTransform).toBe('uppercase')
    expect(flat(body.getByText('Do exercise').props.style).textTransform).toBe('uppercase')
    expect(flat(meta.getByText('Send announcement').props.style).textTransform).toBe('uppercase')
  })

  it('does not alter the string it renders — caps are display-only', () => {
    // getByText matches the ORIGINAL casing. This is what keeps Firestore values
    // and the accessibility tree in the casing the user actually typed.
    const { getByText } = render(<Body>Loves pottery and bad coffee</Body>)
    expect(getByText('Loves pottery and bad coffee')).toBeTruthy()
  })

  it('each component has its correct displayName', () => {
    expect(Display.displayName).toBe('Display')
    expect(Body.displayName).toBe('Body')
    expect(Meta.displayName).toBe('Meta')
  })

  it('Display only accepts DisplayRole values', () => {
    // @ts-expect-error - Display must not accept a body role
    ;(<Display role="body">Invalid</Display>)
    // @ts-expect-error - Display must not accept a meta role
    ;(<Display role="meta">Invalid</Display>)
  })

  it('Body only accepts BodyRole values', () => {
    // @ts-expect-error - Body must not accept a screenTitle role
    ;(<Body role="screenTitle">Invalid</Body>)
    // @ts-expect-error - Body must not accept an eyebrow role
    ;(<Body role="eyebrow">Invalid</Body>)
  })

  it('Meta only accepts MetaRole values', () => {
    // @ts-expect-error - Meta must not accept a cardTitle role
    ;(<Meta role="cardTitle">Invalid</Meta>)
    // @ts-expect-error - Meta must not accept a bodySm role
    ;(<Meta role="bodySm">Invalid</Meta>)
  })
})
