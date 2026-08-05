import React from 'react'
import { Linking } from 'react-native'
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
    fireEvent.press(getByText('Game Night'))
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

  it('offers somewhere to send a suggestion, since the list has no catch-all', () => {
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    expect(getByText('Any new category suggestions?')).toBeTruthy()
    // The address is rendered as text, not hidden behind a link label, so it is still
    // usable on a device with no mail client to hand the mailto: to.
    expect(getByText('hello@yourthirdspace.app')).toBeTruthy()
  })

  it('opens a composer when the suggestion address is tapped', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    fireEvent.press(getByText('hello@yourthirdspace.app'))
    expect(openURL).toHaveBeenCalledWith('mailto:hello@yourthirdspace.app')
    openURL.mockRestore()
  })

  it('does not crash when no mail client can take the mailto:', () => {
    // Linking.openURL rejects on a device with no handler. There is nothing useful to
    // tell the user, but an unhandled rejection is still a defect.
    const openURL = jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no handler'))
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    expect(() => fireEvent.press(getByText('hello@yourthirdspace.app'))).not.toThrow()
    openURL.mockRestore()
  })

  it('still renders the date, neighborhood and age sections', () => {
    const { getByText } = render(<FilterSheet filters={EMPTY_FILTERS} onChange={() => {}} />)
    expect(getByText('Today')).toBeTruthy()
    expect(getByText('Bushwick')).toBeTruthy()
    expect(getByText('Hide 21+ events')).toBeTruthy()
  })
})
