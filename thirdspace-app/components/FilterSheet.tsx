import React from 'react'
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native'
import { EventCategory } from '../types/models'
import { EVENT_CATEGORIES } from '../constants/categories'
import { DateFilter, EventFilters, EMPTY_FILTERS } from '../constants/filters'

// Re-exported so existing importers (filters screen) keep resolving these from here.
export { EMPTY_FILTERS }
export type { DateFilter, EventFilters }

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This weekend', value: 'weekend' },
  { label: 'This week', value: 'week' },
]

const NEIGHBORHOODS = ['Williamsburg', 'Bushwick', 'Park Slope', 'Greenpoint', 'Bed-Stuy', 'Sunset Park']

interface FilterSheetProps {
  filters: EventFilters
  onChange: (next: EventFilters) => void
}

export function FilterSheet({ filters, onChange }: FilterSheetProps) {
  const toggleNeighborhood = (n: string) =>
    onChange({
      ...filters,
      neighborhoods: filters.neighborhoods.includes(n)
        ? filters.neighborhoods.filter((x) => x !== n)
        : [...filters.neighborhoods, n],
    })

  const toggleCategory = (c: EventCategory) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    })

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      <Section title="Date">
        <View style={styles.chipWrap}>
          {DATE_OPTIONS.map((opt) => {
            const active = filters.date === opt.value
            return (
              <Chip
                key={opt.label}
                label={opt.label}
                active={active}
                onPress={() => onChange({ ...filters, date: active ? null : opt.value })}
              />
            )
          })}
        </View>
      </Section>

      <Section title="Neighborhood">
        <View style={styles.chipWrap}>
          {NEIGHBORHOODS.map((n) => (
            <Chip
              key={n}
              label={n}
              active={filters.neighborhoods.includes(n)}
              onPress={() => toggleNeighborhood(n)}
            />
          ))}
        </View>
      </Section>

      <Section title="Age">
        <ToggleRow
          label="Hide 21+ events"
          value={filters.hide21}
          onValueChange={(v) => onChange({ ...filters, hide21: v })}
        />
      </Section>

      <Section title="Category">
        <View style={styles.chipWrap}>
          {EVENT_CATEGORIES.map((c) => (
            <Chip key={c} label={c} active={filters.categories.includes(c)} onPress={() => toggleCategory(c)} />
          ))}
        </View>
      </Section>
    </ScrollView>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string
  value: boolean
  onValueChange: (v: boolean) => void
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E2E0DA', true: '#FF9F3D' }}
        thumbColor="white"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#6B6F78', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#FF9F3D', borderColor: '#FF9F3D' },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3A3A3A' },
  chipTextActive: { color: '#15161A' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#15161A' },
})
