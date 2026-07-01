import { useEffect, useState } from 'react'
import { getMyRegisteredEvents } from '../services/events'
import { CommunityEvent } from '../types/models'

export function useAttendanceStats(uid: string | undefined): { attendedEvents: CommunityEvent[]; loading: boolean } {
  const [attendedEvents, setAttendedEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setAttendedEvents([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
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
      })

    return () => { cancelled = true }
  }, [uid])

  return { attendedEvents, loading }
}
