import { Borough, EventCategory } from '../types/models'

export interface EventCategoryMeta {
  /** Stored in Firestore. Never render this — use `label`. */
  id: EventCategory
  label: string
  /** Shown in the picker and the create-event form so hosts file events correctly. */
  blurb: string
  /** Used by the picker rows and by the per-category empty state. */
  emoji: string
}

/** Display order. Not alphabetical, not by popularity — this is the intended order. */
export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  { id: 'day-drinks-nightlife', label: 'Day Drinks & Nightlife', blurb: 'Bars, day parties, and nights out', emoji: '🍸' },
  { id: 'lets-get-active',      label: "Let's Get Active",       blurb: 'Gym sessions, yoga, basketball, run clubs', emoji: '🏃' },
  { id: 'creative-outlet',      label: 'Creative Outlet',        blurb: 'Art, sewing, painting, and making things', emoji: '🎨' },
  { id: 'curious-minds',        label: 'Curious Minds',          blurb: 'Talks, workshops, and anything that teaches', emoji: '🧠' },
  { id: 'stage-time',           label: 'Stage Time: Comedy + Music', blurb: 'Stand-up, live sets, and open mics', emoji: '🎤' },
  { id: 'lets-eat',             label: "Let's Eat/Tastings",     blurb: 'Wine and food tastings, dinners, supper clubs', emoji: '🍷' },
  { id: 'touch-grass',          label: 'Touch Grass',            blurb: 'Hikes and nature trips, usually free, often just outside the city', emoji: '🌲' },
  { id: 'game-time',            label: 'Game Time',              blurb: 'Arcades, barcades, and gaming sessions', emoji: '🎮' },
  { id: 'slow-down',            label: 'Slow Down',              blurb: 'Sound baths, massage, and genuinely relaxing sessions', emoji: '🧘' },
  { id: 'level-up',             label: 'Level Up – Networking',  blurb: 'Career, business, and networking events', emoji: '📈' },
]

export function categoryMeta(id: string): EventCategoryMeta | undefined {
  return EVENT_CATEGORIES.find((c) => c.id === id)
}

/**
 * Falls back to the raw id rather than an empty string: a blank chip is a bug
 * that hides, a visible slug is a bug that reports itself.
 */
export function categoryLabel(id: string): string {
  return categoryMeta(id)?.label ?? id
}

export const BOROUGHS: Borough[] = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
