import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { EventCard } from '../../components/EventCard'
import { CommunityEvent } from '../../types/models'

// The real firebase/firestore package is ESM and breaks jest's parser when
// required directly (see __tests__/services/events.test.ts for the same
// pattern) — only `Timestamp.fromDate` is needed here, so it is mocked.
jest.mock('firebase/firestore', () => ({
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}))

const event = {
  id: 'e1',
  title: 'Ceramics Night',
  description: 'Throw a pot, meet your neighbours.',
  venueName: 'Clay Studio',
  neighborhood: 'Williamsburg',
  category: 'creative-outlet',
  ageRequirement: '21+',
  capacity: 20,
  registeredCount: 4,
  startsAt: Timestamp.fromDate(new Date('2026-07-18T19:00:00Z')),
} as unknown as CommunityEvent

describe('EventCard', () => {
  it('shows the event name, venue and going count', () => {
    const { getByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(getByText('Ceramics Night')).toBeTruthy()
    expect(getByText('Clay Studio · Williamsburg')).toBeTruthy()
    expect(getByText(/4 going/)).toBeTruthy()
  })

  it('renders the ticket date stub from startsAt', () => {
    const { getByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(getByText('18')).toBeTruthy()
    expect(getByText('Jul')).toBeTruthy()
  })

  it('says Sold out once capacity is reached', () => {
    const full = { ...event, registeredCount: 20 } as CommunityEvent
    const { getByText, queryByText } = render(<EventCard event={full} tone="deep" onPress={() => {}} />)
    expect(getByText('Sold out')).toBeTruthy()
    expect(queryByText(/going/)).toBeNull()
  })

  it('shows the 21+ chip only for 21+ events', () => {
    const { getByText, queryByText, rerender } = render(
      <EventCard event={event} tone="deep" onPress={() => {}} />
    )
    expect(getByText('21+')).toBeTruthy()

    const notAgeGated = { ...event, ageRequirement: '18+' } as CommunityEvent
    rerender(<EventCard event={notAgeGated} tone="deep" onPress={() => {}} />)
    expect(queryByText('21+')).toBeNull()
  })

  it('renders the trailing and footer slots that replaced CompactEventRow', () => {
    // my-events used to use a second card component for these; the variants are now
    // slots on this one card, so both must actually render.
    const { getByText } = render(
      <EventCard
        event={event}
        tone="deep"
        onPress={() => {}}
        trailing={<Text>Going</Text>}
        footer={<Text>Open chat</Text>}
      />
    )
    expect(getByText('Going')).toBeTruthy()
    expect(getByText('Open chat')).toBeTruthy()
  })

  it('omits the footer entirely when no footer slot is passed', () => {
    const { queryByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(queryByText('Open chat')).toBeNull()
  })

  it('shows Starting soon within the window and not outside it', () => {
    // isStartingSoon (utils/eventHelpers.ts) windows at 24h: 0 < msUntilStart <= 24h.
    const soon = {
      ...event,
      startsAt: Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60 * 1000)), // 2h out — inside window
    } as CommunityEvent
    const notSoon = {
      ...event,
      startsAt: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3d out — outside window
    } as CommunityEvent

    const { getByText, queryByText, rerender } = render(
      <EventCard event={soon} tone="deep" onPress={() => {}} />
    )
    expect(getByText('Starting soon')).toBeTruthy()

    rerender(<EventCard event={notSoon} tone="deep" onPress={() => {}} />)
    expect(queryByText('Starting soon')).toBeNull()
  })
})
