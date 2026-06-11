import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { Venue } from '../types/models'

export function useVenue(uid: string | undefined) {
  const [venue, setVenue] = useState<Venue | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setVenue(null)
      setLoading(false)
      return
    }
    return onSnapshot(
      doc(db, 'venues', uid),
      (snap) => {
        setVenue(snap.exists() ? (snap.data() as Venue) : null)
        setLoading(false)
      },
      () => setLoading(false)
    )
  }, [uid])

  return { venue, loading }
}
