import { useCallback, useEffect, useState } from 'react'
import { followUser, unfollowUser, subscribeFollowStatus } from '../services/follows'
import { useAuth } from './useAuth'

export function useFollowStatus(targetUid: string | undefined) {
  const { user } = useAuth()
  const myUid = user?.uid
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!myUid || !targetUid || myUid === targetUid) {
      setIsFollowing(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setHasError(false)
    return subscribeFollowStatus(
      myUid,
      targetUid,
      (following) => { setIsFollowing(following); setLoading(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [myUid, targetUid])

  // Rethrows on failure so the screen can surface a Banner; the button
  // renders subscription state, so a failed write simply never flips it.
  const toggle = useCallback(async () => {
    if (!myUid || !targetUid || myUid === targetUid) return
    if (isFollowing) await unfollowUser(myUid, targetUid)
    else await followUser(myUid, targetUid)
  }, [myUid, targetUid, isFollowing])

  return { isFollowing, loading, hasError, toggle }
}
