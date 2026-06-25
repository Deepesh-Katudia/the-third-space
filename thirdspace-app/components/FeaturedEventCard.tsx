import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CommunityEvent } from '../types/models'
import { CATEGORY_COLORS } from '../constants/categories'
import { formatTime, formatDayDate, spotsLeftText } from '../utils/eventHelpers'
import { AttendeeAvatarStack } from './AttendeeAvatarStack'

interface FeaturedEventCardProps {
  event: CommunityEvent
  onPress: () => void
}

// Phase 1: no uploaded cover image — a category-tinted gradient stands in.
// Attendee seeds are derived from the event id so avatar colors stay stable.
function attendeeSeeds(event: CommunityEvent, max: number): string[] {
  const n = Math.min(event.registeredCount, max)
  return Array.from({ length: n }, (_, i) => `${event.id}:${i}`)
}

export function FeaturedEventCard({ event, onPress }: FeaturedEventCardProps) {
  const startsAt = event.startsAt.toDate()
  const tint = CATEGORY_COLORS[event.category]

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={styles.card}>
      <LinearGradient
        colors={[tint, '#2C1810']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.image}
      >
        <View style={styles.imageTop}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          <View style={styles.timeBadge}>
            <Text style={styles.timeText}>{formatTime(startsAt)}</Text>
          </View>
        </View>
        <View style={styles.imageBottom}>
          <Text style={styles.imageTitle}>{event.title}</Text>
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.venue}>
          {event.venueName} · {event.neighborhood}
        </Text>
        <Text style={styles.date}>{formatDayDate(startsAt)}</Text>
        <View style={styles.metaRow}>
          <View style={styles.goingGroup}>
            <AttendeeAvatarStack
              uids={attendeeSeeds(event, 4)}
              count={event.registeredCount}
              size={28}
              ringColor="white"
            />
            <Text style={styles.goingText}>{event.registeredCount} going</Text>
          </View>
          <Text style={styles.spots}>{spotsLeftText(event.capacity, event.registeredCount)} · Free</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.5)',
    overflow: 'hidden',
  },
  image: { height: 200, padding: 16, justifyContent: 'space-between' },
  imageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#2C1810' },
  timeBadge: { backgroundColor: 'rgba(44,24,16,0.55)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  timeText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
  imageBottom: {},
  imageTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: 'white', letterSpacing: -0.5 },
  body: { padding: 16 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginBottom: 2 },
  date: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goingGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goingText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  spots: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#7A8C6E' },
})
