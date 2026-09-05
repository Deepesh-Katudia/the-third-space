import { useEffect, useMemo, useState } from 'react'
import { subscribeFollowing, subscribeFollowers } from '../services/follows'
import { mutualConnections } from '../utils/follows'
import { useBlocks } from './useBlocks'
import { excludeBlocked } from '../utils/blocks'

// null = subscription has not emitted its first snapshot yet.
export function useConnections(uid: string | undefined) {
  const [followingUids, setFollowingUids] = useState<string[] | null>(null)
  const [followerUids, setFollowerUids] = useState<string[] | null>(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setFollowingUids([])
      setFollowerUids([])
      setHasError(false)
      return
    }
    setFollowingUids(null)
    setFollowerUids(null)
    setHasError(false)
    const unsubFollowing = subscribeFollowing(uid, setFollowingUids, () => setHasError(true))
    const unsubFollowers = subscribeFollowers(uid, setFollowerUids, () => setHasError(true))
    return () => {
      unsubFollowing()
      unsubFollowers()
    }
  }, [uid])

  // A block does not delete the follow edges in either direction — it only denies new
  // ones — so a pre-existing mutual survives it and has to be filtered out here.
  const { blocked } = useBlocks()
  const connectionUids = useMemo(
    () => excludeBlocked(mutualConnections(followingUids ?? [], followerUids ?? []), blocked),
    [followingUids, followerUids, blocked]
  )
  const loading = !hasError && (followingUids === null || followerUids === null)

  return { connectionUids, loading, hasError }
}
