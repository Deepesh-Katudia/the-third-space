import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Timestamp } from 'firebase/firestore'
import { CommunityEvent, EventCategory } from '../../../types/models'
import { FeaturedEventCard } from '../../../components/FeaturedEventCard'
import { CompactEventRow } from '../../../components/CompactEventRow'
import { avatarColor, initials } from '../../../utils/avatar'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: const { events } = useUpcomingEvents()
const ts = (daysFromNow: number, hour: number): Timestamp => {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  d.setHours(hour, 0, 0, 0)
  return Timestamp.fromDate(d)
}

const MOCK_FEED_EVENTS: CommunityEvent[] = [
  {
    id: 'feat-1',
    title: 'Sunset Rooftop Sketching',
    description: '',
    category: 'Creative Arts',
    startsAt: ts(2, 18),
    capacity: 30,
    ageRequirement: '18+',
    venueId: 'v1',
    venueName: 'The Atrium',
    neighborhood: 'Williamsburg',
    registeredCount: 22,
  },
  {
    id: 'c1',
    title: 'Natural Wine Social',
    description: '',
    category: 'Nightlife',
    startsAt: ts(3, 20),
    capacity: 40,
    ageRequirement: '21+',
    venueId: 'v2',
    venueName: 'Cellar 9',
    neighborhood: 'Bushwick',
    registeredCount: 31,
  },
  {
    id: 'c2',
    title: 'Morning Flow + Coffee',
    description: '',
    category: 'Wellness',
    startsAt: ts(4, 8),
    capacity: 20,
    ageRequirement: '18+',
    venueId: 'v3',
    venueName: 'Prospect Studio',
    neighborhood: 'Park Slope',
    registeredCount: 14,
  },
  {
    id: 'c3',
    title: 'Vinyl Listening Night',
    description: '',
    category: 'Music',
    startsAt: ts(5, 19),
    capacity: 35,
    ageRequirement: '18+',
    venueId: 'v4',
    venueName: 'Static Bar',
    neighborhood: 'Greenpoint',
    registeredCount: 27,
  },
  {
    id: 'c4',
    title: 'Dumpling Making Workshop',
    description: '',
    category: 'Food & Drink',
    startsAt: ts(6, 17),
    capacity: 16,
    ageRequirement: '18+',
    venueId: 'v5',
    venueName: 'Kitchen Commons',
    neighborhood: 'Sunset Park',
    registeredCount: 12,
  },
]

const CATEGORY_CHIPS: { label: string; value: EventCategory | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Creative', value: 'Creative Arts' },
  { label: 'Nightlife', value: 'Nightlife' },
  { label: 'Wellness', value: 'Wellness' },
  { label: 'Music', value: 'Music' },
  { label: 'Food', value: 'Food & Drink' },
  { label: 'Social', value: 'Social' },
]

const MOCK_USER_NAME = 'Maya'
// ──────────────────────────────────────────────────────────────────────────

export default function Discover() {
  const router = useRouter()
  const [category, setCategory] = useState<EventCategory | 'All'>('All')

  const visible = useMemo(
    () => (category === 'All' ? MOCK_FEED_EVENTS : MOCK_FEED_EVENTS.filter((e) => e.category === category)),
    [category]
  )
  const [featured, ...rest] = visible

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.location}>Brooklyn, NY</Text>
            <Text style={styles.title}>Discover</Text>
          </View>
          <TouchableOpacity
            style={[styles.userAvatar, { backgroundColor: avatarColor(MOCK_USER_NAME) }]}
            onPress={() => router.push('/(app)/(attender)/profile')}
          >
            <Text style={styles.userInitials}>{initials(MOCK_USER_NAME)}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.search}
          onPress={() => router.push('/(app)/filters')}
        >
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchText}>Search events, venues, neighborhoods</Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORY_CHIPS.map((chip) => {
            const active = category === chip.value
            return (
              <TouchableOpacity
                key={chip.label}
                onPress={() => setCategory(chip.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {featured ? (
          <FeaturedEventCard
            event={featured}
            onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: featured.id } })}
          />
        ) : null}

        {rest.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>More this week</Text>
            {rest.map((event) => (
              <CompactEventRow
                key={event.id}
                event={event}
                onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: event.id } })}
              />
            ))}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  location: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4614A', marginBottom: 2, letterSpacing: 0.3 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 34, color: '#2C1810', letterSpacing: -0.5 },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  userInitials: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.5)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 18, color: '#8C7B70' },
  searchText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 16 },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.6)',
    backgroundColor: 'white',
  },
  chipActive: { backgroundColor: '#2C1810', borderColor: '#2C1810' },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  chipTextActive: { color: 'white' },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 4 },
})
