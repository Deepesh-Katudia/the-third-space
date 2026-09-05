import { Timestamp } from 'firebase/firestore'

/**
 * Stored as stable slugs, never display strings. Labels live in
 * constants/categories.ts and can be reworded freely without orphaning events.
 * See docs/superpowers/specs/2026-08-02-event-categories-design.md
 *
 * The slugs read nothing like the labels they now carry ('creative-outlet' is Make,
 * 'level-up' is Networking) and that is the design working, not drift. Renaming a slug
 * to match its new label would orphan every event already filed under it — which is the
 * exact failure the slug indirection exists to prevent. Leave them alone.
 */
export type EventCategory =
  | 'creative-outlet'
  | 'curious-minds'
  | 'stage-time'
  | 'lets-eat'
  | 'touch-grass'
  | 'game-time'
  | 'slow-down'
  | 'level-up'
  | 'speed-friending'
  | 'date-night'

/**
 * Slugs no host can pick any more, but that existing Firestore documents still carry.
 * Not part of `EventCategory` — nothing new may be filed under them — but
 * `categoryLabel()` still resolves them so an old event renders a name instead of a raw
 * slug. Retiring a category is a copy decision; it is not licence to corrupt history.
 */
export type RetiredEventCategory = 'day-drinks-nightlife' | 'lets-get-active'

export type AgeRequirement = '18+' | '21+'

export type Borough = 'Brooklyn' | 'Manhattan' | 'Queens' | 'Bronx' | 'Staten Island'

// ── Media ─────────────────────────────────────────────────────────────────
export type MediaType = 'image' | 'video'

/**
 * One uploaded asset. `thumbURL` is ALWAYS populated so every render site draws
 * exactly one thing and adds a play badge only when `type === 'video'`:
 *   - image  -> thumbURL === url
 *   - video  -> thumbURL is a generated poster frame
 *   - video whose poster generation failed on device -> thumbURL === ''
 * MediaThumb renders an ink tile with a play badge for that last case. There is
 * deliberately no "processing" state: uploads are synchronous from the client.
 */
export interface MediaAsset {
  type: MediaType
  url: string
  thumbURL: string
  width: number
  height: number
  /** Videos only. Milliseconds. */
  durationMs?: number
}

export interface Venue {
  name: string
  borough: Borough
  neighborhood: string
  description: string
  /** Up to 6. Optional: venues created before the gallery shipped have none. */
  photos?: MediaAsset[]
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
  // (cards render without a join).
  neighborhood: string
  /**
   * Denormalized from the venue at creation. OPTIONAL on purpose: events created
   * before location filtering shipped have none, and `filterByBorough` shows those
   * in every borough rather than hiding them. Do not make this required without
   * backfilling first.
   */
  borough?: Borough
  /**
   * Optional for the same reason `borough` is: every event that already exists has
   * none, and TicketCard's "No photo yet" band is a designed empty state, not a gap.
   * Set at creation only — this app has no edit-event route.
   */
  cover?: MediaAsset
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

// Who is allowed to open a message request with this member.
export type MessagePrivacy = 'everyone' | 'event-mates' | 'no-one'

export interface Profile {
  displayName: string
  photoURL: string | null
  /**
   * Was `string[]`, and was never written by any code path — every stored value is
   * `[]`, so this retype needed no backfill. Readers still run coerceLegacyVibe()
   * because assuming production data matches your assumptions is how you find out
   * it does not.
   */
  vibePhotos: MediaAsset[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
  eventsCount: number
  points: number
  tier: Tier
  verified: boolean
  verifiedAt?: Timestamp   // set when simulated ID verification completes; absent otherwise
  joinedAt: Timestamp
  // Optional: absent on profiles created before this setting existed.
  messagePrivacy?: MessagePrivacy
}

// Fields the user supplies; service fills joinedAt + neutral defaults.
export interface CreateProfileInput {
  displayName: string
  photoURL: string | null
  vibePhotos: MediaAsset[]
  bio: string
  interests: string[]
  neighborhood: string
  borough: Borough
  age: number
  messagePrivacy?: MessagePrivacy
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

// ── Social graph (sub-project E) ──────────────────────────────────────────
// One doc per follow edge at follows/{followerUid_targetUid}. createdAt is
// null in the local snapshot window before serverTimestamp resolves.
export interface Follow {
  follower: string
  target: string
  createdAt: Timestamp | null
}

// ── Social handles ────────────────────────────────────────────────────────
// Stored at profiles/{uid}/private/socials, NOT on the profile document.
// profiles/{uid} is `allow read: if signedIn()`, so a handle kept there would be
// readable by every signed-in member and "connections only" could not hold.
export type SocialPlatform = 'instagram' | 'tiktok' | 'x'

/** Handles are stored WITHOUT a leading '@', lowercased. An absent key means not set. */
export type SocialHandles = Partial<Record<SocialPlatform, string>>

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
  kind?: 'group' | 'announcement'   // absent = group; 'announcement' renders the pinned/highlighted variant
  /** One attachment per message — the ordinary chat convention. */
  media?: MediaAsset
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

// ── Venue Announcements (sub-project F) ───────────────────────────────────
// One doc per broadcast at events/{eventId}/announcements/{autoId}. recipientCount
// is a snapshot of the event's registeredCount at send time. createdAt is null in
// the local snapshot window before serverTimestamp resolves.
export interface Announcement {
  id: string
  text: string
  authorUid: string
  authorName: string
  recipientCount: number
  createdAt: Timestamp | null
}

// -- Safety: blocking (App Store Guideline 1.2) ----------------------------
// A block lives at users/{uid}/blocks/{blockedUid}, private to the blocker. There is
// deliberately NO mirror doc at users/{blocked}/blockedBy: that would hand the blocked
// party an enumerable list of everyone who has blocked them, turning a private safety
// action into a notification. The consequence is that blocking is symmetric on WRITES
// (rules deny both directions) and asymmetric on READS (only the blocker's view
// changes), which is the trade the spec argues for.
export interface BlockedUser {
  uid: string
  createdAt: Timestamp | null
}
