import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { CommunityEvent } from '../types/models'
import { formatEventDate, isStartingSoon } from '../utils/eventHelpers'
import { colors, font, paletteFor, radius, shadow } from '../constants/theme'

interface EventCardProps {
  event: CommunityEvent
  onPress: () => void
  /** Position in the feed — cycles the pastel card palette. */
  index?: number
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function EventCard({ event, onPress, index = 0 }: EventCardProps) {
  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity
  const soon = isStartingSoon(startsAt, new Date())
  const palette = paletteFor(index)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.card, { backgroundColor: palette.bg }]}>
      <View style={styles.topRow}>
        <LinearGradient
          colors={palette.cover}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        >
          <Text style={styles.coverDay}>{startsAt.getDate()}</Text>
          <Text style={styles.coverMonth}>{MONTHS[startsAt.getMonth()]}</Text>
        </LinearGradient>

        <View style={styles.headText}>
          <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

          <View style={styles.pill}>
            <Ionicons name="location" size={13} color={palette.accent} />
            <Text style={styles.pillText} numberOfLines={1}>{event.venueName} · {event.neighborhood}</Text>
          </View>

          <View style={styles.pill}>
            <Ionicons name="people" size={13} color={soldOut ? colors.danger : palette.accent} />
            <Text style={[styles.pillText, soldOut && styles.soldOut]}>
              {soldOut ? 'Sold out' : `${event.registeredCount} going`}
            </Text>
          </View>
        </View>
      </View>

      {event.description ? <Text style={styles.desc} numberOfLines={2}>{event.description}</Text> : null}

      <View style={styles.bottomRow}>
        <View style={styles.tags}>
          <View style={styles.tag}><Text style={styles.tagText}>{formatEventDate(startsAt)}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>{event.category}</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Free</Text></View>
          {event.ageRequirement === '21+' ? (
            <View style={styles.tag}><Text style={styles.tagText}>21+</Text></View>
          ) : null}
          {soon ? (
            <View style={[styles.tag, { backgroundColor: palette.accent }]}>
              <Text style={[styles.tagText, styles.tagTextStrong]}>Starting Soon</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.arrow}>
          <Ionicons name="arrow-forward" size={22} color={colors.ink} />
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: 15, marginBottom: 15 },
  topRow: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  cover: {
    width: 86, height: 86, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center',
    padding: 4,
  },
  coverDay: { fontFamily: font.extrabold, fontSize: 26, lineHeight: 30, color: colors.white, letterSpacing: 0.5 },
  coverMonth: { fontFamily: font.bold, fontSize: 9, letterSpacing: 1.6, color: colors.white, marginTop: 2, opacity: 0.95 },
  headText: { flex: 1, minWidth: 0, gap: 6 },
  title: { fontFamily: font.extrabold, fontSize: 17, lineHeight: 20, color: '#161616', marginBottom: 3 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5,
    maxWidth: '100%',
  },
  pillText: { fontFamily: font.semibold, fontSize: 12.5, color: colors.body, flexShrink: 1 },
  soldOut: { color: colors.danger },
  desc: { fontFamily: font.medium, fontSize: 13.5, lineHeight: 19, color: '#2B2B2B', marginVertical: 12, marginHorizontal: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, flex: 1, minWidth: 0 },
  tag: { backgroundColor: 'rgba(255,255,255,0.72)', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontFamily: font.semibold, fontSize: 12, color: '#333333' },
  tagTextStrong: { color: colors.white },
  arrow: {
    width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', ...shadow.float,
  },
})
