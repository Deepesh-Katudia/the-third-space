import React from 'react'
import { View, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native'
import { EventCategory } from '../types/models'
import { EVENT_CATEGORIES } from '../constants/categories'
import { DateFilter, EventFilters, EMPTY_FILTERS } from '../constants/filters'
import { palette, radius, space } from '../constants/design'
import { Body, Meta } from './ui/Text'

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
      <Meta role="eyebrow" style={styles.sectionTitle}>{title}</Meta>
      {children}
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Meta role="eyebrow" tone={active ? 'clay' : 'inkSoft'}>{label}</Meta>
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
      <Body role="bodyLg" tone="ink">{label}</Body>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.rule, true: palette.clay }}
        thumbColor={palette.cream}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.md },
  section: { marginBottom: space.xl },
  sectionTitle: { marginBottom: space.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 1,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  chipActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs + 2 },
})
