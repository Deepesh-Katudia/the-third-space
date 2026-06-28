import { useEffect, useState } from 'react'
import { Message } from '../types/models'
import { subscribeEventMessages, subscribeConversationMessages } from '../services/chat'

export function useThreadMessages(kind: 'group' | 'dm', id: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setHasError(false)
    const subscribe = kind === 'group' ? subscribeEventMessages : subscribeConversationMessages
    return subscribe(
      id,
      (list) => { setMessages(list); setLoading(false); setHasError(false) },
      () => { setHasError(true); setLoading(false) }
    )
  }, [kind, id])

  return { messages, loading, hasError }
}
