// Type-only: importing the value would pull the firebase ESM bundle into every unit
// test that touches this module, which jest-expo does not transform.
import type { Timestamp } from 'firebase/firestore'
import { ACHIEVEMENTS, type Achievement } from '../constants/achievements'
import { EVENT_CATEGORIES } from '../constants/categories'
import { CommunityEvent, Tier } from '../types/models'

const CONSISTENT_THRESHOLD = 5
const CONNECTOR_THRESHOLD = 3
const NEW_FRIEND_THRESHOLD = 1
const VETERAN_DAYS = 365
const MS_PER_DAY = 86_400_000

export interface EarnedReward extends Achievement {
  earned: boolean
}

export interface RewardInputs {
  attendedEvents: CommunityEvent[]
  tier: Tier
  connectionsCount: number
  /** From `Profile.joinedAt`. Undefined on a profile that has not loaded. */
  joinedAt?: Timestamp
  /** Evaluation clock, injectable so the veteran rule is testable. */
  now?: number
}

/**
 * One rule per trackable achievement, keyed by id. An achievement with `trackable: false`
 * deliberately has NO entry here — see constants/achievements.ts for why. A rule for an
 * untrackable id would be a lie dressed as a feature.
 */
const RULES: Record<string, (input: RewardInputs) => boolean> = {
  'first-event': ({ attendedEvents }) => attendedEvents.length >= 1,

  'consistent-one': ({ attendedEvents }) => attendedEvents.length >= CONSISTENT_THRESHOLD,

  // Slugs, never labels. 'stage-time' is the category now labelled "Stage" — see the
  // note in constants/categories.ts about why those two do not resemble each other.
  stage: ({ attendedEvents }) => attendedEvents.some((e) => e.category === 'stage-time'),
  eat: ({ attendedEvents }) => attendedEvents.some((e) => e.category === 'lets-eat'),
  'touch-grass': ({ attendedEvents }) => attendedEvents.some((e) => e.category === 'touch-grass'),

  'experimenter-of-variety': ({ attendedEvents }) => {
    // Every LIVE category, so retiring one cannot leave this permanently unearnable.
    const seen = new Set(attendedEvents.map((e) => e.category))
    return EVENT_CATEGORIES.every((c) => seen.has(c.id))
  },

  'new-friend': ({ connectionsCount }) => connectionsCount >= NEW_FRIEND_THRESHOLD,
  'the-connector': ({ connectionsCount }) => connectionsCount >= CONNECTOR_THRESHOLD,

  'community-legend': ({ tier }) => tier === 'Insider',

  'third-space-veteran': ({ joinedAt, now }) => {
    if (!joinedAt) return false
    return (now ?? Date.now()) - joinedAt.toMillis() >= VETERAN_DAYS * MS_PER_DAY
  },
}

/**
 * The whole roster, each marked earned or not. Replaces the old `computeBadges` — the
 * emoji badge grid and this are the same system now, not two.
 *
 * Locked entries stay in the returned list: seeing what is still out there is the point
 * of a roster, and the untrackable ones read as "coming" rather than as failures.
 */
export function computeRewards(input: RewardInputs): EarnedReward[] {
  return ACHIEVEMENTS.map((a) => ({
    ...a,
    earned: a.trackable ? (RULES[a.id]?.(input) ?? false) : false,
  }))
}

/**
 * Ids earned now that were not earned before — what the unlock modal queues up.
 *
 * Takes the PREVIOUS ids rather than diffing two full lists so the caller can persist a
 * short array of strings instead of a snapshot of the roster.
 */
export function newlyEarned(rewards: EarnedReward[], previouslyEarnedIds: readonly string[]): EarnedReward[] {
  const seen = new Set(previouslyEarnedIds)
  return rewards.filter((r) => r.earned && !seen.has(r.id))
}

/** Ids that a rule can actually evaluate — the guard against a rule/flag mismatch. */
export function trackableIds(): string[] {
  return Object.keys(RULES)
}
