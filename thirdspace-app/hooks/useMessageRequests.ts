import { useEffect, useMemo, useState } from 'react'
import { Conversation } from '../types/models'
import { subscribeMyConversations } from '../services/chat'
import { selectIncomingRequests } from '../utils/chat'

export function useMessageRequests(uid: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    setHasError(false)
    return subscribeMyConversations(
      uid,
      (list) => { setConversations(list); setLoading(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [uid])

  const requests = useMemo(() => (uid ? selectIncomingRequests(conversations, uid) : []), [conversations, uid])

  return { requests, loading, hasError }
}
