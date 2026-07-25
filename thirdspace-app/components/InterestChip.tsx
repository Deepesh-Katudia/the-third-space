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
    borderColor: 'rgba(226,224,218,0.6)',
    backgroundColor: 'white',
  },
  chipSelected: { backgroundColor: '#FF9F3D', borderColor: '#FF9F3D' },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3A3A3A' },
  labelSelected: { color: '#15161A' },
})
