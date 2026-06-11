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

export interface Venue {
  name: string
  borough: string
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
  neighborhood: string
  registeredCount: number
}

export interface Registration {
  uid: string
  displayName: string
}
