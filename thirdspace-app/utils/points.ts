import { Tier } from '../types/models'

export const POINTS_PER_EVENT = 50

const REGULAR_THRESHOLD = 500
const INSIDER_THRESHOLD = 1500

export function tierForPoints(points: number): Tier {
  if (points >= INSIDER_THRESHOLD) return 'Insider'
  if (points >= REGULAR_THRESHOLD) return 'Regular'
  return 'Newcomer'
}

export interface TierProgress {
  tier: Tier
  nextTier: Tier | null
  pointsToNext: number
  progress: number
}

export function tierProgress(points: number): TierProgress {
  const tier = tierForPoints(points)

  if (tier === 'Newcomer') {
    return {
      tier,
      nextTier: 'Regular',
      pointsToNext: REGULAR_THRESHOLD - points,
      progress: points / REGULAR_THRESHOLD,
    }
  }

  if (tier === 'Regular') {
    const span = INSIDER_THRESHOLD - REGULAR_THRESHOLD
    return {
      tier,
      nextTier: 'Insider',
      pointsToNext: INSIDER_THRESHOLD - points,
      progress: (points - REGULAR_THRESHOLD) / span,
    }
  }

  return { tier, nextTier: null, pointsToNext: 0, progress: 1 }
}
