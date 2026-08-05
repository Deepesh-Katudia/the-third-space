import React, { useEffect, useState } from 'react'
import { RewardUnlock } from './RewardUnlock'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useConnections } from '../hooks/useConnections'
import { computeRewards, newlyEarned, type EarnedReward } from '../utils/rewards'
import { getSeenRewards, markRewardsSeen } from '../services/rewardsSeen'

/**
 * Fires the unlock ceremony wherever the user happens to be.
 *
 * Mounted once in the attender tab layout — NOT in `(app)/_layout` and NOT on the rewards
 * screen. The tab layout stays mounted underneath pushed routes, and `RewardUnlock` is a
 * React Native `Modal`, so the ceremony still lands over `event/[id]` or a chat thread.
 * Putting it on the rewards screen instead would mean you only ever get congratulated for
 * something you already went looking for.
 *
 * Hosters are excluded: every currently trackable reward keys off attendance, connections
 * or tier, so the extra subscriptions would buy them nothing.
 */
export function RewardWatcher() {
  const { user, role } = useAuth()
  const uid = role === 'attender' ? user?.uid : undefined

  const { profile } = useProfile(uid)
  const { attendedEvents } = useAttendanceStats(uid)
  const { connectionUids } = useConnections(uid)
  const [queue, setQueue] = useState<EarnedReward[]>([])

  const rewards = profile
    ? computeRewards({
        attendedEvents,
        tier: profile.tier,
        connectionsCount: connectionUids.length,
        joinedAt: profile.joinedAt,
      })
    : []

  // The set of earned ids is what actually changes; `rewards` is rebuilt every render.
  const earnedKey = rewards.filter((r) => r.earned).map((r) => r.id).join(',')

  useEffect(() => {
    if (!uid || !earnedKey) return
    let cancelled = false

    getSeenRewards(uid).then((seen) => {
      if (cancelled) return
      const fresh = newlyEarned(rewards, seen)
      if (fresh.length === 0) return
      setQueue(fresh)
      // Marked seen on QUEUE, not on dismiss: a force-quit mid-ceremony should not mean
      // the same celebration every launch forever.
      void markRewardsSeen(uid, fresh.map((r) => r.id))
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, earnedKey])

  // Clear anything queued when the account changes, so a sign-out mid-ceremony does not
  // show the next user someone else's unlock.
  useEffect(() => { setQueue([]) }, [uid])

  return (
    <RewardUnlock
      achievement={queue[0] ?? null}
      onDismiss={() => setQueue((q) => q.slice(1))}
      ctaLabel={queue.length > 1 ? `Next (${queue.length - 1} more)` : 'Continue'}
    />
  )
}

RewardWatcher.displayName = 'RewardWatcher'
