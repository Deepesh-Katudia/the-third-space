import React from 'react'
import { StyleSheet } from 'react-native'
import { render } from '@testing-library/react-native'
import { AttendeeAvatarStack } from '../../components/AttendeeAvatarStack'
import { palette } from '../../constants/design'
import { AVATAR_PALETTE_FOR_TEST } from '../../utils/avatar'

const SEEDS = ['ada', 'grace', 'alan']

describe('AttendeeAvatarStack', () => {
  it('fills each disc with the member tint in the default solid variant', () => {
    const { getAllByTestId } = render(<AttendeeAvatarStack uids={SEEDS} count={3} />)
    const discs = getAllByTestId('avatar-solid')
    expect(discs).toHaveLength(3)
    discs.forEach((disc) => {
      const { backgroundColor } = StyleSheet.flatten(disc.props.style)
      expect(AVATAR_PALETTE_FOR_TEST).toContain(backgroundColor)
    })
  })

  it('drops the identity tint entirely in the glass variant', () => {
    // The whole point of glass is that the ambient field shows through. A tint here —
    // or a ring painted in the surface colour — would punch an opaque hole in it.
    const { getAllByTestId } = render(
      <AttendeeAvatarStack uids={SEEDS} count={3} variant="glass" ringColor={palette.orangeDeep} />,
    )
    const discs = getAllByTestId('avatar-glass')
    expect(discs).toHaveLength(3)
    discs.forEach((disc) => {
      const { backgroundColor, borderColor } = StyleSheet.flatten(disc.props.style)
      expect(backgroundColor).toBe(palette.glassFill)
      expect(AVATAR_PALETTE_FOR_TEST).not.toContain(backgroundColor)
      expect(borderColor).toBe(palette.glassEdge)
    })
  })

  it('switches the initials to ink on glass, where cream would vanish', () => {
    // Cream initials clear AA on the solid tints, which are dark. Over glass the disc is
    // a light wash on a light field, so the colour has to flip with the variant.
    const solid = render(<AttendeeAvatarStack uids={['ada']} count={1} />)
    expect(StyleSheet.flatten(solid.getByText('A').props.style).color).toBe(palette.cream)

    const glass = render(<AttendeeAvatarStack uids={['ada']} count={1} variant="glass" />)
    expect(StyleSheet.flatten(glass.getByText('A').props.style).color).toBe(palette.ink)
  })

  it('carries the overflow chip in the same variant as the discs beside it', () => {
    const { getByText } = render(
      <AttendeeAvatarStack uids={SEEDS} count={9} max={3} variant="glass" />,
    )
    expect(StyleSheet.flatten(getByText('+6').props.style).color).toBe(palette.ink)
  })
})
