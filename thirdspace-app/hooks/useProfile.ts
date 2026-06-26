import { useEffect, useState } from 'react'
import { Profile } from '../types/models'
import { subscribeProfile, getProfile } from '../services/profiles'
import { useAuth } from './useAuth'

export function useProfile(uid: string | undefined) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setHasError(false)
    setProfile(null)

    // Self: realtime so edits reflect immediately. Others: one-shot read.
    if (user && uid === user.uid) {
      return subscribeProfile(
        uid,
        (p) => { setProfile(p); setLoading(false); setHasError(false) },
        () => { setHasError(true); setLoading(false) }
      )
    }

    let cancelled = false
    getProfile(uid)
      .then((p) => { if (!cancelled) { setProfile(p); setLoading(false) } })
      .catch(() => { if (!cancelled) { setHasError(true); setLoading(false) } })
    return () => { cancelled = true }
  }, [uid, user])

  return { profile, loading, hasError }
}
