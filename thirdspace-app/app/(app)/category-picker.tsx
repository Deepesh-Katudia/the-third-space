import React, { useMemo } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { EventCategory } from '../../types/models'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { useUserLocation } from '../../hooks/useUserLocation'
import { filterByBorough } from '../../utils/locationFilter'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space, NAV_CLEARANCE } from '../../constants/design'

export default function CategoryPicker() {
  const router = useRouter()
  const { filters, setFilters } = useDiscoverFilters()
  const { events } = useUpcomingEvents()
  const { borough } = useUserLocation()

  // Counts are scoped to the borough the user is browsing but NOT to the active
  // category — otherwise every row but the current one would read zero. A zero
  // here therefore means the same thing the feed's empty state goes on to explain.
  const scoped = useMemo(() => filterByBorough(events, borough).events, [events, borough])
  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of scoped) map[e.category] = (map[e.category] ?? 0) + 1
    return map
  }, [scoped])

  const active: EventCategory | null =
    filters.categories.length === 1 ? filters.categories[0] : null

  const choose = (id: EventCategory | null) => {
    setFilters({ ...filters, categories: id === null ? [] : [id] })
    router.back()
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Browse by</Display>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.row, styles.rowLast]}
            onPress={() => choose(null)}
            activeOpacity={0.7}
            accessibilityRole="radio"
            accessibilityState={{ selected: active === null }}
          >
            <View style={styles.rowText}>
              <Display>All events</Display>
              <Body role="bodySm">Everything happening near you</Body>
            </View>
            <Meta testID="count-all" tone="clay">{scoped.length}</Meta>
            {active === null ? (
              <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
            ) : (
              <View style={styles.radioEmpty} />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {EVENT_CATEGORIES.map((c, index) => {
            const isSelected = c.id === active
            const isLast = index === EVENT_CATEGORIES.length - 1
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, isLast && styles.rowLast]}
                onPress={() => choose(c.id)}
                activeOpacity={0.7}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Meta style={styles.emoji}>{c.emoji}</Meta>
                <View style={styles.rowText}>
                  <Display>{c.label}</Display>
                  <Body role="bodySm">{c.blurb}</Body>
                </View>
                <Meta testID={`count-${c.id}`} tone="clay">{counts[c.id] ?? 0}</Meta>
                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  scroll: { paddingBottom: NAV_CLEARANCE },
  card: {
    marginHorizontal: space.xl,
    marginBottom: space.lg,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, gap: space.xs },
  emoji: { fontSize: 22, lineHeight: 26 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.rule },
})
