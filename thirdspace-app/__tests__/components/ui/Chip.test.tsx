import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { ChipRow } from '../../../components/ui/Chip'
import { CityChip } from '../../../components/ui/CityChip'
import { IconButton } from '../../../components/ui/IconButton'
import { palette } from '../../../constants/design'

describe('chips and buttons', () => {
  it('joins meta items with slash dividers', () => {
    const { getAllByText, getByText } = render(<ChipRow items={['Sat, 7:00 PM', 'Wellness', 'Free']} />)
    expect(getByText('Sat, 7:00 PM')).toBeTruthy()
    expect(getAllByText('/')).toHaveLength(2)
  })

  it('accents the requested item in sage', () => {
    const { getByText } = render(<ChipRow items={['Sat, 7:00 PM', 'Wellness']} accentIndex={1} />)
    const style = getByText('Wellness').props.style
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flat.color).toBe(palette.sage)
  })

  it('renders the city chip label', () => {
    const { getByText } = render(<CityChip label="NYC + Brooklyn" />)
    expect(getByText('NYC + Brooklyn')).toBeTruthy()
  })

  it('gives the icon button an accessible label and an ink fill', () => {
    const { getByLabelText } = render(
      <IconButton name="add" onPress={() => {}} accessibilityLabel="Create event" />
    )
    const style = getByLabelText('Create event').props.style
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style
    expect(flat.backgroundColor).toBe(palette.ink)
  })

  it('handles duplicate items without React key warnings', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    const { getAllByText } = render(<ChipRow items={['Free', 'Free']} />)

    // Verify both items render
    expect(getAllByText('Free')).toHaveLength(2)
    // Verify divider renders
    expect(getAllByText('/')).toHaveLength(1)

    // Verify no React duplicate key warning was logged
    const keyWarnings = consoleErrorSpy.mock.calls.filter(
      call => call[0] && typeof call[0] === 'string' && call[0].includes('Encountered two children with the same key')
    )
    expect(keyWarnings).toHaveLength(0)

    consoleErrorSpy.mockRestore()
  })

  it('stays a plain view when no press handler is given', () => {
    // The hoster Events screen renders it as a static label.
    const { queryByRole } = render(<CityChip label="NYC + Brooklyn" />)
    expect(queryByRole('button')).toBeNull()
  })

  it('becomes a button that announces what it changes', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(<CityChip label="Brooklyn" onPress={onPress} />)
    fireEvent.press(getByLabelText('Change location, currently Brooklyn'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})
