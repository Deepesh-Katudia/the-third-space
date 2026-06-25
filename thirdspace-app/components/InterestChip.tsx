import React from 'react'
import { Text, TouchableOpacity, StyleSheet } from 'react-native'

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
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.6)',
    backgroundColor: 'white',
  },
  chipSelected: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  labelSelected: { color: 'white' },
})
