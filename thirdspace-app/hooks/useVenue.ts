import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

// hasError lets consumers distinguish "venue confirmed absent" (venue === null)
// from "couldn't read venue" — the venue-setup gate must not redirect on errors.
export function useVenue(uid: string | undefined) {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setVenue(null)
      setLoading(false)
      return
    }
    setHasError(false)
    return onSnapshot(
      doc(db, 'venues', uid),
      (snap) => {
        setVenue(snap.exists() ? (snap.data() as Venue) : null)
        setHasError(false)
        setLoading(false)
      },
      () => {
        setHasError(true)
        setLoading(false)
      }
    )
  }, [uid])

  return { venue, loading, hasError }
}
