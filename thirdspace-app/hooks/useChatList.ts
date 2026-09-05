import { useEffect, useMemo, useState } from 'react'
import { ChatThread } from '../types/models'
import { getMyRegisteredEvents } from '../services/events'
import { subscribeEventChatMeta, subscribeMyConversations, subscribeChatReads } from '../services/chat'
import { buildChatThreads, GroupChatInput, ReadMap } from '../utils/chat'
import { useBlocks } from './useBlocks'
import { hideBlockedThreads } from '../utils/blocks'

export function useChatList(uid: string | undefined) {
  const [groups, setGroups] = useState<GroupChatInput[]>([])
  const [conversations, setConversations] = useState<Parameters<typeof buildChatThreads>[1]>([])
  const [reads, setReads] = useState<ReadMap>({})
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Registered events -> base group rows + one meta subscription each.
  useEffect(() => {
    if (!uid) { setLoading(false); return }
    let cancelled = false
    let unsubs: Array<() => void> = []
    getMyRegisteredEvents(uid)
      .then((events) => {
        if (cancelled) return
        setGroups(events.map((e) => ({ eventId: e.id, title: e.title, meta: null })))
        unsubs = events.map((e) =>
          subscribeEventChatMeta(
            e.id,
            (meta) => setGroups((prev) => prev.map((g) => (g.eventId === e.id ? { ...g, meta } : g))),
            () => {}
          )
        )
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setHasError(true); setLoading(false) } })
    return () => { cancelled = true; unsubs.forEach((u) => u()) }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeMyConversations(uid, setConversations, () => setHasError(true))
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeChatReads(
      uid,
      (list) => {
        const map: ReadMap = {}
        list.forEach((r) => { map[r.id] = { readCount: r.readCount, muted: r.muted } })
        setReads(map)
      },
      () => {}
    )
  }, [uid])

  // Read-side suppression is client-side because rules allow or deny a whole query and
  // never filter one. The write gates in firestore.rules already stop the blocked party
  // sending; this is what stops the thread appearing to the blocker.
  const { blocked } = useBlocks()
  const threads: ChatThread[] = useMemo(
    () => (uid ? hideBlockedThreads(buildChatThreads(groups, conversations, reads, uid), blocked, uid) : []),
    [groups, conversations, reads, uid, blocked]
  )

  return { threads, loading, hasError }
}
