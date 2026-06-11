import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { CATEGORY_COLORS } from '../constants/categories'
import { formatEventDate, isStartingSoon } from '../utils/eventHelpers'

interface EventCardProps {
  event: CommunityEvent
  onPress: () => void
}

export function EventCard({ event, onPress }: EventCardProps) {
  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.categoryChip, { backgroundColor: CATEGORY_COLORS[event.category] }]}>
          <Text style={styles.categoryText}>{event.category}</Text>
        </View>
        {isStartingSoon(startsAt, new Date()) ? <Text style={styles.soonBadge}>Starting Soon</Text> : null}
        {event.ageRequirement === '21+' ? <Text style={styles.ageBadge}>21+</Text> : null}
      </View>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.venue}>{event.venueName} · {event.neighborhood}</Text>
      <Text style={styles.date}>{formatEventDate(startsAt)}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.cost}>Free</Text>
        <Text style={[styles.going, soldOut && styles.soldOut]}>
          {soldOut ? 'Sold out' : `${event.registeredCount} going`}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
  soonBadge: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#C4614A' },
  ageBadge: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B5B95', marginLeft: 'auto' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 4 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginBottom: 2 },
  date: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', marginBottom: 10 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cost: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#5B8C5A' },
  going: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  soldOut: { color: '#dc2626' },
})
