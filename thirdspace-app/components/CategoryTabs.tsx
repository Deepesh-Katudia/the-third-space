import React from 'react'
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { EVENT_CATEGORIES } from '../constants/categories'
import { EventCategory } from '../types/models'

export type CategoryFilter = 'All' | EventCategory

interface CategoryTabsProps {
  selected: CategoryFilter
  onSelect: (category: CategoryFilter) => void
}

const FILTERS: CategoryFilter[] = ['All', ...EVENT_CATEGORIES]

export function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((filter) => {
        const isActive = filter === selected
        return (
          <TouchableOpacity
            key={filter}
            onPress={() => onSelect(filter)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{filter}</Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 12 },
  chip: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  chipTextActive: { color: 'white' },
})
