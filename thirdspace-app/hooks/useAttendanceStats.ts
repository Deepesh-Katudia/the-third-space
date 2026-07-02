import { useEffect, useState } from 'react'
import { getMyRegisteredEvents } from '../services/events'
import { CommunityEvent } from '../types/models'

export function useAttendanceStats(uid: string | undefined): { attendedEvents: CommunityEvent[]; loading: boolean; hasError: boolean } {
  const [attendedEvents, setAttendedEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setAttendedEvents([])
      setLoading(false)
      setHasError(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setHasError(false)
    getMyRegisteredEvents(uid)
      .then((events) => {
        if (cancelled) return
        const now = Date.now()
        setAttendedEvents(events.filter((e) => e.startsAt.toMillis() < now))
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setAttendedEvents([])
        setLoading(false)
        setHasError(true)
      })

    return () => { cancelled = true }
  }, [uid])

  return { attendedEvents, loading, hasError }
}
