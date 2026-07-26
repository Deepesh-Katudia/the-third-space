import React from 'react'
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
  category: 'Creative Arts',
  ageRequirement: '21+',
  capacity: 20,
  registeredCount: 4,
  startsAt: Timestamp.fromDate(new Date('2026-07-18T19:00:00Z')),
} as unknown as CommunityEvent

describe('EventCard', () => {
  it('shows the event name, venue and going count', () => {
    const { getByText } = render(<EventCard event={event} tone="deep" onPress={() => {}} />)
    expect(getByText('Ceramics Night')).toBeTruthy()
    expect(getByText(/Clay Studio/)).toBeTruthy()
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
})
