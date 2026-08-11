import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { TicketCard } from '../../../components/ui/TicketCard'
import { palette } from '../../../constants/design'

const flat = (style: unknown) => StyleSheetFlatten(style)
function StyleSheetFlatten(style: unknown): Record<string, unknown> {
  return Array.isArray(style)
    ? Object.assign({}, ...style.map(StyleSheetFlatten))
    : ((style ?? {}) as Record<string, unknown>)
}

describe('TicketCard', () => {
  it('paints the notches in the screen tone so they read as cut-outs', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    const notches = getAllByTestId('ticket-notch')
    expect(notches).toHaveLength(2)
    for (const n of notches) {
      expect(flat(n.props.style)).toMatchObject({ backgroundColor: palette.orangeDeep })
    }
  })

  it('switches notch color with the tone', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="cream" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    for (const n of getAllByTestId('ticket-notch')) {
      expect(flat(n.props.style)).toMatchObject({ backgroundColor: palette.cream })
    }
  })

  it('renders the date stub and the body slot', () => {
    const { getByText } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>Ceramics Night</Text></TicketCard>
    )
    expect(getByText('18')).toBeTruthy()
    expect(getByText('Jul')).toBeTruthy()
    expect(getByText('Ceramics Night')).toBeTruthy()
  })

  it('falls back to a filled placeholder when there is no photo', () => {
    // Events carry no image field today, so this is the normal path, not the edge case.
    // The placeholder is clay-filled and captioned so it reads as image space rather
    // than as a gap — an orangeDeep band matched the screen behind it and vanished.
    const { getByTestId, getByText } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    expect(flat(getByTestId('ticket-band').props.style)).toMatchObject({ backgroundColor: palette.clay })
    expect(getByText('No photo yet')).toBeTruthy()
  })

  it('keeps the notches at one height whether or not a photo is supplied', () => {
    // The card must not change shape when events gain photos, so the media block is
    // a single height (120) and the notches sit at 120 - 7 in both cases.
    const withoutPhoto = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    for (const n of withoutPhoto.getAllByTestId('ticket-notch')) {
      expect(flat(n.props.style)).toMatchObject({ top: 113 })
    }

    const withPhoto = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    for (const n of withPhoto.getAllByTestId('ticket-notch')) {
      expect(flat(n.props.style)).toMatchObject({ top: 113 })
    }
  })

  it('renders no play badge for a still photo', () => {
    const { queryByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    expect(queryByTestId('ticket-play')).toBeNull()
  })

  it('renders a play badge over the media band when asked', () => {
    const { getByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" showPlayBadge day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    expect(getByTestId('ticket-play')).toBeTruthy()
  })

  it('fires onPress when the card is pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={onPress}><Text>x</Text></TicketCard>
    )
    fireEvent.press(getByTestId('ticket-card'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
