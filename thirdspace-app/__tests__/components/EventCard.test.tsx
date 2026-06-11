import React from 'react'
import { render } from '@testing-library/react-native'
import { EventCard } from '../../components/EventCard'
import { CommunityEvent } from '../../types/models'

const DAY_MS = 24 * 60 * 60 * 1000

// Mock Timestamp to work around firebase ESM issues in jest
const mockTimestamp = (date: Date) => ({
  toDate: () => date,
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: (date.getTime() % 1000) * 1000000,
})

function makeEvent(overrides: Partial<CommunityEvent> = {}): CommunityEvent {
  return {
    id: 'e1',
    title: 'Ceramics Night',
    description: 'Wheel throwing for beginners.',
    category: 'Creative Arts',
    startsAt: mockTimestamp(new Date(Date.now() + 3 * DAY_MS)) as any,
    capacity: 12,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'Clay Studio',
    neighborhood: 'Williamsburg',
    registeredCount: 4,
    ...overrides,
  }
}

describe('EventCard', () => {
  it('renders title, venue, neighborhood, cost, and going count', () => {
    const { getByText } = render(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(getByText('Ceramics Night')).toBeTruthy()
    expect(getByText('Clay Studio · Williamsburg')).toBeTruthy()
    expect(getByText('Free')).toBeTruthy()
    expect(getByText('4 going')).toBeTruthy()
  })

  it('shows Sold out when at capacity', () => {
    const { getByText } = render(
      <EventCard event={makeEvent({ registeredCount: 12 })} onPress={() => {}} />
    )
    expect(getByText('Sold out')).toBeTruthy()
  })

  it('shows the 21+ badge only for 21+ events', () => {
    const { getByText, queryByText, rerender } = render(
      <EventCard event={makeEvent({ ageRequirement: '21+' })} onPress={() => {}} />
    )
    expect(getByText('21+')).toBeTruthy()
    rerender(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(queryByText('21+')).toBeNull()
  })

  it('shows Starting Soon within 24 hours of start', () => {
    const soon = mockTimestamp(new Date(Date.now() + 2 * 60 * 60 * 1000))
    const { getByText, queryByText, rerender } = render(
      <EventCard event={makeEvent({ startsAt: soon as any })} onPress={() => {}} />
    )
    expect(getByText('Starting Soon')).toBeTruthy()
    rerender(<EventCard event={makeEvent()} onPress={() => {}} />)
    expect(queryByText('Starting Soon')).toBeNull()
  })
})
