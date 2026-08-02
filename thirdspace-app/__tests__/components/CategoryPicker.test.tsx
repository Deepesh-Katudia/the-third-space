import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import CategoryPicker from '../../app/(app)/category-picker'
import { EVENT_CATEGORIES } from '../../constants/categories'

const mockBack = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: jest.fn() }) }))

const mockSetFilters = jest.fn()
jest.mock('../../hooks/useDiscoverFilters', () => ({
  useDiscoverFilters: () => ({
    filters: { date: null, neighborhoods: [], hide21: false, categories: [] },
    setFilters: mockSetFilters,
  }),
}))

// Built inside the factory: jest hoists jest.mock() above every other statement,
// so a helper defined at module scope is not yet initialised when this runs.
jest.mock('../../hooks/useUpcomingEvents', () => {
  // startsAt is a hand-rolled stub rather than a real Timestamp: requiring the
  // actual firebase/firestore here drags ESM into the mock factory that jest
  // cannot parse, and the picker only ever reads `category` and `borough`.
  const mockEv = (id: string, category: string) => ({
    id, title: 'E', description: '', category,
    startsAt: { toDate: () => new Date(2026, 8, 1), toMillis: () => 0 },
    capacity: 10, ageRequirement: '18+', venueId: 'v', venueName: 'V',
    neighborhood: 'Bushwick', borough: 'Brooklyn', registeredCount: 0, cancelled: false,
  })
  return {
    useUpcomingEvents: () => ({
      events: [mockEv('a', 'stage-time'), mockEv('b', 'stage-time'), mockEv('c', 'touch-grass')],
      loading: false,
      hasError: false,
    }),
  }
})

jest.mock('../../hooks/useUserLocation', () => ({
  useUserLocation: () => ({ borough: null }),
}))

describe('CategoryPicker', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists all ten categories plus All', () => {
    const { getByText } = render(<CategoryPicker />)
    for (const c of EVENT_CATEGORIES) expect(getByText(c.label)).toBeTruthy()
    expect(getByText('All events')).toBeTruthy()
  })

  it('shows a count per category, including zero for empty ones', () => {
    const { getByTestId } = render(<CategoryPicker />)
    expect(getByTestId('count-stage-time').props.children).toBe(2)
    expect(getByTestId('count-touch-grass').props.children).toBe(1)
    // An empty category still appears, with an honest zero rather than being hidden.
    expect(getByTestId('count-game-time').props.children).toBe(0)
    expect(getByTestId('count-all').props.children).toBe(3)
  })

  it('writes a single-element categories filter and closes', () => {
    const { getByText } = render(<CategoryPicker />)
    fireEvent.press(getByText('Touch Grass'))
    expect(mockSetFilters).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['touch-grass'] })
    )
    expect(mockBack).toHaveBeenCalled()
  })

  it('clears the filter when All is chosen', () => {
    const { getByText } = render(<CategoryPicker />)
    fireEvent.press(getByText('All events'))
    expect(mockSetFilters).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }))
  })

  it('shows each blurb so hosts and browsers can tell categories apart', () => {
    const { getByText } = render(<CategoryPicker />)
    expect(getByText('Hikes and nature trips, usually free, often just outside the city')).toBeTruthy()
  })
})
