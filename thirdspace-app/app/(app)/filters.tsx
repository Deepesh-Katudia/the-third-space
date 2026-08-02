import React, { useMemo } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { FilterSheet } from '../../components/FilterSheet'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { applyEventFilters } from '../../utils/eventFilters'
import { filterByBorough } from '../../utils/locationFilter'
import { useUserLocation } from '../../hooks/useUserLocation'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { palette, radius, space } from '../../constants/design'

export default function Filters() {
  const router = useRouter()
  const { filters, query, setFilters, reset } = useDiscoverFilters()
  const { events } = useUpcomingEvents()
  const { borough } = useUserLocation()

  const count = useMemo(() => applyEventFilters(events, filters, query).length, [events, filters, query])

  // Per-category counts are scoped to the browsing borough but NOT to the active
  // category — scoping by it would make every row but the chosen one read zero.
  const categoryCounts = useMemo(() => {
    const scoped = filterByBorough(events, borough).events
    const map: Record<string, number> = {}
    for (const e of scoped) map[e.category] = (map[e.category] ?? 0) + 1
    return map
  }, [events, borough])

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Display role="screenTitle">Filters</Display>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Meta style={styles.close}>✕</Meta>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <FilterSheet filters={filters} onChange={setFilters} counts={categoryCounts} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => reset()} hitSlop={8}>
          <Body role="button">Clear all</Body>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()}>
          <Body role="button" style={styles.applyText}>Show {count} event{count === 1 ? '' : 's'}</Body>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm + 2 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: palette.rule, marginBottom: space.md + 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm },
  close: { fontSize: 18 },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.md + 2,
    paddingBottom: space.sm,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    gap: space.lg,
  },
  applyBtn: { flex: 1, backgroundColor: palette.ink, borderRadius: radius.ticket, paddingVertical: space.lg - 1, alignItems: 'center' },
  applyText: { color: palette.cream },
})
