import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, space } from '../../constants/design'
import { Meta } from './Text'

interface ChipRowProps {
  items: string[]
  /** Index of the one item drawn in sage — the comp accents a single meta value. */
  accentIndex?: number
}

export function ChipRow({ items, accentIndex }: ChipRowProps) {
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <Meta tone={i === accentIndex ? 'sage' : 'ink'}>{item}</Meta>
          {i < items.length - 1 ? <Meta style={styles.divider}>/</Meta> : null}
        </React.Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 3, flexWrap: 'wrap' },
  divider: { color: palette.rule },
})
