import { Badge } from '../components/BadgeGrid'
import { CommunityEvent, Tier } from '../types/models'

const FIVE_IN_A_ROW_THRESHOLD = 5
const CREATIVE_SOUL_THRESHOLD = 3
const NIGHT_OWL_HOUR = 21
const CONNECTOR_THRESHOLD = 3

export function computeBadges(attendedEvents: CommunityEvent[], tier: Tier, connectionsCount: number): Badge[] {
  // Slug, not a display string — see constants/categories.ts. A test asserts this
  // is a real category so a rename fails loudly instead of disabling the badge.
  const creativeCount = attendedEvents.filter((e) => e.category === 'creative-outlet').length
  const hasNightEvent = attendedEvents.some((e) => e.startsAt.toDate().getHours() >= NIGHT_OWL_HOUR)

  return [
    { id: 'first-event', icon: '🌱', label: 'First event', earned: attendedEvents.length >= 1 },
    { id: 'five-in-a-row', icon: '🔥', label: '5 in a row', earned: attendedEvents.length >= FIVE_IN_A_ROW_THRESHOLD },
    { id: 'creative-soul', icon: '🎨', label: 'Creative soul', earned: creativeCount >= CREATIVE_SOUL_THRESHOLD },
    { id: 'night-owl', icon: '🌙', label: 'Night owl', earned: hasNightEvent },
    { id: 'connector', icon: '🤝', label: 'Connector', earned: connectionsCount >= CONNECTOR_THRESHOLD },
    { id: 'top-rated', icon: '⭐', label: 'Top rated', earned: false },
    { id: 'host-hero', icon: '🏆', label: 'Host hero', earned: false },
    { id: 'insider', icon: '💎', label: 'Insider', earned: tier === 'Insider' },
  ]
}
