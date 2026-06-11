import { Timestamp } from 'firebase/firestore'

export type EventCategory =
  | 'Creative Arts'
  | 'Fitness'
  | 'Social'
  | 'Nightlife'
  | 'Food & Drink'
  | 'Music'
  | 'Outdoors'
  | 'Learning'
  | 'Wellness'

export type AgeRequirement = '18+' | '21+'

export type Borough = 'Brooklyn' | 'Manhattan' | 'Queens' | 'Bronx' | 'Staten Island'

export interface Venue {
  name: string
  borough: Borough
  neighborhood: string
  description: string
}

export interface CommunityEvent {
  id: string
  title: string
  description: string
  category: EventCategory
  startsAt: Timestamp
  capacity: number
  ageRequirement: AgeRequirement
  venueId: string
  venueName: string
  // venueName + neighborhood are denormalized from the venue at event creation
  // (cards render without a join); borough is intentionally NOT copied — feed
  // filtering is by category/search only in this build.
  neighborhood: string
  registeredCount: number
}

// Stored as events/{eventId}/registrations/{uid} — eventId lives in the path.
export interface Registration {
  uid: string
  displayName: string
}
