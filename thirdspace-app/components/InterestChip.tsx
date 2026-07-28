import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Meta } from './ui/Text'

interface InterestChipProps {
  label: string
  selected: boolean
  onPress: () => void
}

export function InterestChip({ label, selected, onPress }: InterestChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Meta role="eyebrow" tone={selected ? 'clay' : 'inkSoft'}>
        {selected ? '✓ ' : ''}
        {label}
      </Meta>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 1,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  chipSelected: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
})
