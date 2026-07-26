import React from 'react'
import { render } from '@testing-library/react-native'
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
})
