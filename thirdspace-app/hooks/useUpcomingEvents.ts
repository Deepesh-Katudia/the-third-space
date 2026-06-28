import { useEffect, useState } from 'react'
import { CommunityEvent } from '../types/models'
import { subscribeUpcomingEvents } from '../services/events'

export function useUpcomingEvents() {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setHasError(false)
    return subscribeUpcomingEvents(
      (list) => { setEvents(list); setLoading(false); setHasError(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [])

  return { events, loading, hasError }
}
