import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Body } from './ui/Text'

export interface Badge {
  id: string
  icon: string
  label: string
  earned: boolean
}

interface BadgeGridProps {
  badges: Badge[]
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  return (
    <View style={styles.grid}>
      {badges.map((badge) => (
        <View key={badge.id} style={styles.cell}>
          <View style={[styles.tile, badge.earned ? styles.tileEarned : styles.tileLocked]}>
            <Text style={[styles.icon, !badge.earned && styles.iconLocked]}>{badge.earned ? badge.icon : '🔒'}</Text>
          </View>
          <Body
            role="bodySm"
            tone={badge.earned ? 'ink' : 'inkSoft'}
            numberOfLines={2}
            style={[styles.label, !badge.earned && styles.labelLocked]}
          >
            {badge.label}
          </Body>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', marginBottom: space.xl - 4, paddingHorizontal: space.xs },
  tile: { width: 60, height: 60, borderRadius: radius.chip - 2, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  tileEarned: { backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.clay },
  // Dashed + faded is what reads as "not yet", since the palette has no grey.
  tileLocked: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: palette.rule, borderStyle: 'dashed', opacity: 0.6 },
  icon: { fontSize: 26 },
  iconLocked: { fontSize: 20, opacity: 0.5 },
  label: { textAlign: 'center' },
  labelLocked: { opacity: 0.6 },
})
