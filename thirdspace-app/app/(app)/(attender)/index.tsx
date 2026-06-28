import React, { useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EventCategory } from '../../../types/models'
import { FeaturedEventCard } from '../../../components/FeaturedEventCard'
import { CompactEventRow } from '../../../components/CompactEventRow'
import { LoadingView } from '../../../components/LoadingView'
import { EmptyState } from '../../../components/EmptyState'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useUpcomingEvents } from '../../../hooks/useUpcomingEvents'
import { useDiscoverFilters } from '../../../hooks/useDiscoverFilters'
import { applyEventFilters, hasActiveFilters } from '../../../utils/eventFilters'
import { avatarColor, initials } from '../../../utils/avatar'

const CATEGORY_CHIPS: { label: string; value: EventCategory | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Creative', value: 'Creative Arts' },
  { label: 'Nightlife', value: 'Nightlife' },
  { label: 'Wellness', value: 'Wellness' },
  { label: 'Music', value: 'Music' },
  { label: 'Food', value: 'Food & Drink' },
  { label: 'Social', value: 'Social' },
]

export default function Discover() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile } = useProfile(user?.uid)
  const { events, loading, hasError } = useUpcomingEvents()
  const { filters, query, setQuery, setFilters, reset } = useDiscoverFilters()

  const name = profile?.displayName ?? user?.displayName ?? 'Member'
  const visible = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])
  const [featured, ...rest] = visible

  const activeCategory: EventCategory | 'All' =
    filters.categories.length === 1 ? filters.categories[0] : 'All'
  const selectCategory = (value: EventCategory | 'All') =>
    setFilters({ ...filters, categories: value === 'All' ? [] : [value] })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.location}>Brooklyn, NY</Text>
            <Text style={styles.title}>Discover</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(app)/(attender)/profile')}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, { backgroundColor: avatarColor(name) }]}>
                <Text style={styles.userInitials}>{initials(name)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, venues, neighborhoods"
              placeholderTextColor="#8C7B70"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push('/(app)/filters')}>
            <Text style={styles.filterIcon}>⚙</Text>
            {hasActiveFilters(filters) ? <View style={styles.filterDot} /> : null}
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORY_CHIPS.map((chip) => {
            const active = activeCategory === chip.value
            return (
              <TouchableOpacity
                key={chip.label}
                onPress={() => selectCategory(chip.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{chip.label}</Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {loading ? (
          <LoadingView />
        ) : hasError ? (
          <EmptyState emoji="🛰️" title="Couldn't load events" body="Check your connection and try again." />
        ) : visible.length === 0 ? (
          events.length === 0 ? (
            <EmptyState emoji="🗓️" title="Nothing coming up yet" body="New events will appear here as venues post them." />
          ) : (
            <EmptyState
              emoji="🔍"
              title="No events match"
              body="Try clearing your search and filters."
              actionLabel="Clear filters"
              onAction={() => { reset() }}
            />
          )
        ) : (
          <>
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
          </>
        )}
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
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4, overflow: 'hidden' },
  userInitials: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(242,197,160,0.5)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: { fontSize: 18, color: '#8C7B70' },
  searchInput: { flex: 1, fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', paddingVertical: 0 },
  searchClear: { fontSize: 14, color: '#8C7B70' },
  filterBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  filterIcon: { fontSize: 18, color: '#2C1810' },
  filterDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: '#C4614A' },
  chipRow: { gap: 8, paddingBottom: 4, marginBottom: 16 },
  chip: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#2C1810', borderColor: '#2C1810' },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  chipTextActive: { color: 'white' },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 4 },
})
