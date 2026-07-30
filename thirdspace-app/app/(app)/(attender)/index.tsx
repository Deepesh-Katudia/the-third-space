import React, { useEffect, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EventCategory } from '../../../types/models'
import { EventCard } from '../../../components/EventCard'
import { LoadingView } from '../../../components/LoadingView'
import { EmptyState } from '../../../components/EmptyState'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useUpcomingEvents } from '../../../hooks/useUpcomingEvents'
import { useDiscoverFilters } from '../../../hooks/useDiscoverFilters'
import { useUserLocation, resolveLocation } from '../../../hooks/useUserLocation'
import { filterByBorough } from '../../../utils/locationFilter'
import { applyEventFilters, hasActiveFilters } from '../../../utils/eventFilters'
import { avatarColor, initials } from '../../../utils/avatar'
import { Screen } from '../../../components/ui/Screen'
import { Display, Meta } from '../../../components/ui/Text'
import { CityChip } from '../../../components/ui/CityChip'
import { palette, radius, space, type as typeScale, NAV_CLEARANCE } from '../../../constants/design'

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
  const { profile, loading: profileLoading } = useProfile(user?.uid)
  const { events, loading, hasError } = useUpcomingEvents()
  const { filters, query, setQuery, setFilters, reset } = useDiscoverFilters()

  // Only `borough` is read here — the picker route owns setBorough.
  const { borough } = useUserLocation()

  // The profile supplies the fallback borough, so wait for it to load before
  // resolving. resolveLocation fully overwrites state, so a re-run is harmless.
  useEffect(() => {
    if (profileLoading) return
    resolveLocation(profile?.borough ?? null)
  }, [profileLoading, profile?.borough])

  const name = profile?.displayName ?? user?.displayName ?? 'Member'
  const filtered = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])
  // Location composes around the existing filters rather than being folded into
  // EventFilters, so "Clear filters" never silently resets the user's location.
  const { events: visible, widened } = useMemo(() => filterByBorough(filtered, borough), [filtered, borough])

  const activeCategory: EventCategory | 'All' =
    filters.categories.length === 1 ? filters.categories[0] : 'All'
  const selectCategory = (value: EventCategory | 'All') =>
    setFilters({ ...filters, categories: value === 'All' ? [] : [value] })

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Display role="screenTitle" style={styles.tagline}>Your Third Space awaits you</Display>
          <View style={styles.rightCol}>
            <CityChip
              label={borough ?? 'All of NYC'}
              onPress={() => router.push('/(app)/borough-picker')}
            />
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
        </View>

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Meta style={styles.searchIcon}>⌕</Meta>
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, venues, neighborhoods"
              placeholderTextColor={palette.inkSoft}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
                <Meta>✕</Meta>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push('/(app)/filters')}>
            <Meta tone="ink" style={styles.filterIcon}>⚙</Meta>
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
                <Meta role="eyebrow" tone={active ? 'clay' : 'inkSoft'}>{chip.label}</Meta>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {widened ? (
          <Meta role="eyebrow" tone="clay" style={styles.widenedNotice}>
            Nothing matching in {borough} — showing all of NYC
          </Meta>
        ) : null}

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
          visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              tone="deep"
              onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: event.id } })}
            />
          ))
        )}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: NAV_CLEARANCE },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.md, marginBottom: space.lg },
  tagline: { flex: 1, maxWidth: 200 },
  rightCol: { alignItems: 'flex-end', gap: space.sm },
  userAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Avatar tints stay outside the two-tone palette on purpose: they encode identity,
  // and flattening them to ink would make every member look the same.
  userInitials: { ...typeScale.bodySm, color: palette.cream },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginBottom: space.lg },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm + 2,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { ...typeScale.body, flex: 1, color: palette.ink, paddingVertical: 0 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: palette.rule,
    backgroundColor: palette.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterIcon: { fontSize: 18 },
  filterDot: { position: 'absolute', top: 9, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: palette.clay },
  chipRow: { gap: space.sm, paddingBottom: space.xs, marginBottom: space.lg },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  chipActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  widenedNotice: { marginBottom: space.md },
})
