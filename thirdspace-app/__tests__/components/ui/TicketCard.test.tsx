import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { TicketCard } from '../../../components/ui/TicketCard'
import { palette } from '../../../constants/design'

describe('TicketCard', () => {
  it('paints the notches in the screen tone so they read as cut-outs', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    const notches = getAllByTestId('ticket-notch')
    expect(notches).toHaveLength(2)
    for (const n of notches) {
      expect(n.props.style).toMatchObject({ backgroundColor: palette.orangeDeep })
    }
  })

  it('switches notch color with the tone', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="cream" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ backgroundColor: palette.cream })
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

  it('falls back to a color band when there is no photo, keeping the two-part silhouette', () => {
    // Events carry no image field today, so this is the normal path, not the edge case.
    const { getByTestId, getAllByTestId } = render(
      <TicketCard tone="deep" day="18" month="Jul" onPress={() => {}}><Text>x</Text></TicketCard>
    )
    expect(getByTestId('ticket-band')).toBeTruthy()
    // Notches must sit on the band's bottom edge (44 - 7), not the photo's (96 - 7).
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ top: 37 })
    }
  })

  it('aligns notches to the photo edge when a photo is supplied', () => {
    const { getAllByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    for (const n of getAllByTestId('ticket-notch')) {
      expect(n.props.style).toMatchObject({ top: 89 })
    }
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
