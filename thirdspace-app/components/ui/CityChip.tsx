import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Meta } from './Text'

export function CityChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Meta role="eyebrow" tone="ink">{label}</Meta>
    </View>
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
