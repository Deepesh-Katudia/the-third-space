import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { CATEGORY_COLORS } from '../constants/categories'
import { dateBlock } from '../utils/eventHelpers'

interface CompactEventRowProps {
  event: CommunityEvent
  onPress: () => void
  /** Optional trailing slot (e.g. a "Going" badge or "Rate ★" action). */
  trailing?: React.ReactNode
}

export function CompactEventRow({ event, onPress, trailing }: CompactEventRowProps) {
  const startsAt = event.startsAt.toDate()
  const block = dateBlock(startsAt)
  const tint = CATEGORY_COLORS[event.category]

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.row}>
      <View style={[styles.dateBlock, { backgroundColor: `${tint}1A` }]}>
        <Text style={[styles.weekday, { color: tint }]}>{block.weekday}</Text>
        <Text style={styles.day}>{block.day}</Text>
      </View>
      <View style={styles.middle}>
        <View style={[styles.categoryDot, { backgroundColor: tint }]} />
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={styles.venue} numberOfLines={1}>
            {event.venueName} · {event.neighborhood}
          </Text>
        </View>
      </View>
      {trailing ?? <Text style={styles.count}>{event.registeredCount} going</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(226,224,218,0.5)',
    gap: 12,
  },
  dateBlock: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontFamily: 'Poppins_600SemiBold', fontSize: 10, letterSpacing: 0.5 },
  day: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: '#15161A', lineHeight: 24 },
  middle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  textCol: { flex: 1 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', marginBottom: 2 },
  venue: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  count: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78' },
})
