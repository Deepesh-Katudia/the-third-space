import { Borough, EventCategory } from '../types/models'

export const EVENT_CATEGORIES: EventCategory[] = [
  'Creative Arts',
  'Fitness',
  'Social',
  'Nightlife',
  'Food & Drink',
  'Music',
  'Outdoors',
  'Learning',
  'Wellness',
]

// Category tints in the orange design system's hue family. Each is dark enough to
// carry white label text at AA (>= 4.5:1) — the comp's lighter accents are not.
export const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Creative Arts': '#C2410C',
  Fitness: '#1F7A4C',
  Social: '#9A5B0E',
  Nightlife: '#5B3E9B',
  'Food & Drink': '#B02A63',
  Music: '#2A4FBF',
  Outdoors: '#2F6E6E',
  Learning: '#6D4AA6',
  Wellness: '#0F766E',
}

export const BOROUGHS: Borough[] = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
