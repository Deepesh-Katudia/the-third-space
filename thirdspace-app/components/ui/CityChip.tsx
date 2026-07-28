import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Meta } from './Text'

interface CityChipProps {
  label: string
  /** Omit for a static label — the hoster Events screen uses it that way. */
  onPress?: () => void
}

export function CityChip({ label, onPress }: CityChipProps) {
  const content = <Meta role="eyebrow" tone="ink">{label}</Meta>

  if (!onPress) return <View style={styles.chip}>{content}</View>

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={`Change location, currently ${label}`}
    >
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.sm + 1,
    paddingVertical: space.xs + 1,
  },
})
