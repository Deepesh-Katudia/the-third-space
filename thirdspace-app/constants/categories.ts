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

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  'Creative Arts': '#C4614A',
  Fitness: '#5B8C5A',
  Social: '#C99A2E',
  Nightlife: '#6B5B95',
  'Food & Drink': '#B5651D',
  Music: '#3F6C9B',
  Outdoors: '#4E7E62',
  Learning: '#7A6A8A',
  Wellness: '#588B8B',
}

export const BOROUGHS: Borough[] = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
