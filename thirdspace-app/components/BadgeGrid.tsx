import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

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
          <Text style={[styles.label, !badge.earned && styles.labelLocked]} numberOfLines={2}>
            {badge.label}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '25%', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  tile: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileEarned: { backgroundColor: 'rgba(255,159,61,0.12)', borderWidth: 1, borderColor: 'rgba(255,159,61,0.3)' },
  tileLocked: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(107,111,120,0.35)', borderStyle: 'dashed', opacity: 0.6 },
  icon: { fontSize: 26 },
  iconLocked: { fontSize: 20, opacity: 0.5 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#15161A', textAlign: 'center' },
  labelLocked: { color: '#6B6F78', opacity: 0.6 },
})
