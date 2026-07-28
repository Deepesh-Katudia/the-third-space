import React from 'react'
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { EVENT_CATEGORIES } from '../constants/categories'
import { EventCategory } from '../types/models'
import { palette, radius, space } from '../constants/design'
import { Meta } from './ui/Text'

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
            <Meta role="eyebrow" tone={isActive ? 'clay' : 'inkSoft'}>{filter}</Meta>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.md },
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  // Active reads as a filled ticket stub against the deep field, not a color swap.
  chipActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
})
