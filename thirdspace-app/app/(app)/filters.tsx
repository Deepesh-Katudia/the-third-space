import React, { useMemo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { FilterSheet } from '../../components/FilterSheet'
import { useDiscoverFilters } from '../../hooks/useDiscoverFilters'
import { useUpcomingEvents } from '../../hooks/useUpcomingEvents'
import { applyEventFilters } from '../../utils/eventFilters'

export default function Filters() {
  const router = useRouter()
  const { filters, query, setFilters, reset } = useDiscoverFilters()
  const { events } = useUpcomingEvents()

  const count = useMemo(() => applyEventFilters(events, filters, query).length, [events, filters, query])

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <FilterSheet filters={filters} onChange={setFilters} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={() => reset()} hitSlop={8}>
          <Text style={styles.clear}>Clear all</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyBtn} onPress={() => router.back()}>
          <Text style={styles.applyText}>Show {count} event{count === 1 ? '' : 's'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: 'rgba(242,197,160,0.7)', marginBottom: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', letterSpacing: -0.5 },
  close: { fontSize: 18, color: '#8C7B70' },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,197,160,0.5)',
    gap: 16,
  },
  clear: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#8C7B70' },
  applyBtn: { flex: 1, backgroundColor: '#C4614A', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  applyText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: 'white' },
})
