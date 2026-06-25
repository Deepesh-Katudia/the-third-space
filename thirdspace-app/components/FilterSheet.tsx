import React from 'react'
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native'
import { EventCategory } from '../types/models'
import { EVENT_CATEGORIES } from '../constants/categories'

export type DateFilter = 'today' | 'weekend' | 'week' | 'custom' | null

export interface EventFilters {
  date: DateFilter
  neighborhoods: string[]
  freeOnly: boolean
  hide21: boolean
  categories: EventCategory[]
}

export const EMPTY_FILTERS: EventFilters = {
  date: null,
  neighborhoods: [],
  freeOnly: false,
  hide21: false,
  categories: [],
}

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'This weekend', value: 'weekend' },
  { label: 'This week', value: 'week' },
  { label: 'Pick dates', value: 'custom' },
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

      <Section title="Price & age">
        <ToggleRow
          label="Free events only"
          value={filters.freeOnly}
          onValueChange={(v) => onChange({ ...filters, freeOnly: v })}
        />
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
        trackColor={{ false: '#E5DCD2', true: '#C4614A' }}
        thumbColor="white"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 12 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', backgroundColor: 'white' },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  chipTextActive: { color: 'white' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810' },
})
