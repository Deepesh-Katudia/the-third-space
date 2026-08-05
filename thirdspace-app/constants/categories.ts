import { Borough, EventCategory, RetiredEventCategory } from '../types/models'

export interface EventCategoryMeta {
  /** Stored in Firestore. Never render this — use `label`. */
  id: EventCategory
  label: string
  /** Shown in the picker and the create-event form so hosts file events correctly. */
  blurb: string
  /** Used by the picker rows and by the per-category empty state. */
  emoji: string
}

/**
 * Display order. Not alphabetical, not by popularity — this is the intended order.
 *
 * Labels are stored in title case and rendered uppercase by the type tokens, like every
 * other string in the app. Do not bake the caps in here — the transform is display-only
 * and the accessibility tree should keep the readable casing.
 */
export const EVENT_CATEGORIES: EventCategoryMeta[] = [
  { id: 'creative-outlet', label: 'Make',        blurb: 'Art, sewing, painting, and making things', emoji: '🎨' },
  { id: 'curious-minds',   label: 'Learn',       blurb: 'Talks, workshops, and anything that teaches', emoji: '🧠' },
  { id: 'stage-time',      label: 'Stage',       blurb: 'Stand-up, live sets, and open mics', emoji: '🎤' },
  { id: 'lets-eat',        label: 'Eat',         blurb: 'Wine and food tastings, dinners, supper clubs', emoji: '🍷' },
  { id: 'touch-grass',     label: 'Touch Grass', blurb: 'Hikes and nature trips, usually free, often just outside the city', emoji: '🌲' },
  { id: 'game-time',       label: 'Game Night',  blurb: 'Arcades, barcades, and gaming sessions', emoji: '🎮' },
  { id: 'slow-down',       label: 'Slow Down',   blurb: 'Sound baths, massage, and genuinely relaxing sessions', emoji: '🧘' },
  { id: 'level-up',        label: 'Networking',  blurb: 'Career, business, and networking events', emoji: '📈' },
]

/**
 * Categories a host can no longer file under, kept only so events created while they
 * existed still render a name. Deliberately NOT in `EVENT_CATEGORIES`: the picker, the
 * filter sheet and the create-event form all read that list, and a retired category must
 * appear in none of them.
 *
 * Nothing prunes this. It is two rows of text that keep old events readable forever,
 * which is cheaper than the backfill that removing them would require.
 */
const RETIRED_CATEGORIES: Record<RetiredEventCategory, string> = {
  'day-drinks-nightlife': 'Day Drinks & Nightlife',
  'lets-get-active': "Let's Get Active",
}

export function categoryMeta(id: string): EventCategoryMeta | undefined {
  return EVENT_CATEGORIES.find((c) => c.id === id)
}

/**
 * Resolves live categories first, then retired ones, then falls back to the raw id
 * rather than an empty string: a blank chip is a bug that hides, a visible slug is a bug
 * that reports itself.
 */
export function categoryLabel(id: string): string {
  return categoryMeta(id)?.label ?? RETIRED_CATEGORIES[id as RetiredEventCategory] ?? id
}

export const BOROUGHS: Borough[] = ['Brooklyn', 'Manhattan', 'Queens', 'Bronx', 'Staten Island']
