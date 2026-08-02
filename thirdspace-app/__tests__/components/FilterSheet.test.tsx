import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { FilterSheet } from '../../components/FilterSheet'
import { EMPTY_FILTERS } from '../../constants/filters'
import { EVENT_CATEGORIES } from '../../constants/categories'

describe('FilterSheet categories', () => {
  it('lists every category with its label and blurb', () => {
    // The filter sheet is the ONLY place categories are chosen. If it ever renders
    // a subset again, that is the drift this consolidation removed.
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    for (const c of EVENT_CATEGORIES) {
      expect(getByText(c.label)).toBeTruthy()
      expect(getByText(c.blurb)).toBeTruthy()
    }
  })

  it('shows a count per category when counts are supplied', () => {
    const { getByTestId } = render(
      <FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} counts={{ 'stage-time': 4 }} />
    )
    expect(getByTestId('count-stage-time').props.children).toBe(4)
    // An empty category still shows, with an honest zero rather than being hidden.
    expect(getByTestId('count-game-time').props.children).toBe(0)
  })

  it('adds a category to the selection without replacing it', () => {
    // Multi-select is the point of a filter sheet — picking a second category
    // must not drop the first the way a single-select dropdown did.
    const onChange = jest.fn()
    const filters = { ...EMPTY_FILTERS, categories: ['touch-grass' as const] }
    const { getByText } = render(<FilterSheet filters={filters} onChange={onChange} />)
    fireEvent.press(getByText('Game Time'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['touch-grass', 'game-time'] })
    )
  })

  it('removes a category that is already selected', () => {
    const onChange = jest.fn()
    const filters = { ...EMPTY_FILTERS, categories: ['touch-grass' as const, 'game-time' as const] }
    const { getByText } = render(<FilterSheet filters={filters} onChange={onChange} />)
    fireEvent.press(getByText('Touch Grass'))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['game-time'] })
    )
  })

  it('still renders the date, neighborhood and age sections', () => {
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    expect(getByText('Today')).toBeTruthy()
    expect(getByText('Bushwick')).toBeTruthy()
    expect(getByText('Hide 21+ events')).toBeTruthy()
  })
})
