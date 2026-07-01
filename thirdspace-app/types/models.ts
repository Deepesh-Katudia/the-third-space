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
  photoURL?: string | null
  age?: number
  neighborhood?: string
  interestsPreview?: string[]
}

export type Tier = 'Newcomer' | 'Regular' | 'Insider'

export interface Profile {
  displayName: string
  photoURL: string | null
  vibePhotos: string[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
  eventsCount: number
  points: number
  tier: Tier
  verified: boolean
  joinedAt: Timestamp
}

// Fields the user supplies; service fills joinedAt + neutral defaults.
export interface CreateProfileInput {
  displayName: string
  photoURL: string | null
  vibePhotos: string[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
}

// ── Points & Badges (sub-project D) ───────────────────────────────────────
// The reward catalog is a hardcoded constant (constants/rewards.ts), not a
// Firestore collection — Redemption is the only stored record, an
// append-only log at profiles/{uid}/redemptions/{id}.
export interface Reward {
  id: string
  label: string
  cost: number
}

export interface Redemption {
  id: string
  rewardId: string
  label: string
  cost: number
  redeemedAt: Timestamp
}

// ── Chat & Messaging (sub-project C) ──────────────────────────────────────
// Messages denormalize their author; createdAt is null for the brief window
// before serverTimestamp resolves in the local snapshot.
export interface Message {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL: string | null
  text: string
  createdAt: Timestamp | null
}

export interface EventChatMeta {
  lastMessageText: string
  lastMessageAt: Timestamp | null
  lastMessageAuthor: string
  messageCount: number
}

export interface Conversation {
  id: string
  participants: string[]
  names: Record<string, string>
  photos: Record<string, string | null>
  status: 'pending' | 'open'
  requestedBy: string
  lastMessageText: string
  lastMessageAt: Timestamp | null
  lastMessageAuthor: string
  messageCount: number
}

// Unified row for the chat list (group + dm).
export interface ChatThread {
  id: string
  kind: 'group' | 'dm'
  name: string
  photoURL: string | null
  lastMessageText: string
  lastMessageAt: Timestamp | null
  unread: number
  muted: boolean
}

export interface ChatRead {
  readCount: number
  muted: boolean
}
