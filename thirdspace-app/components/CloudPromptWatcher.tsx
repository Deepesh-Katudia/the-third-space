import React, { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'expo-router'
import { CloudPrompt } from './CloudPrompt'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { useChatList } from '../hooks/useChatList'
import { useAttendanceStats } from '../hooks/useAttendanceStats'
import { useConnections } from '../hooks/useConnections'
import { getMyRegisteredEvents } from '../services/events'
import { pickPrompt } from '../utils/cloudPrompts'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../services/cloudPromptsSeen'
import type { CloudPrompt as Prompt, PromptRole, PromptState } from '../constants/cloudPrompts'
import type { CommunityEvent } from '../types/models'

/**
 * Raises a cloud wherever the user happens to be.
 *
 * Mounted once per tab navigator and BESIDE it, not inside — the same position
 * RewardWatcher occupies, and for the same reason: `CloudPrompt` is a Modal and has to
 * be able to land over a pushed route.
 *
 * `role` is a prop rather than read from useAuth because it disambiguates the pathname:
 * (attender)/index and (hoster)/index both resolve to '/'. Each layout knows which one
 * it is, so it says so.
 *
 * No route file is edited to make this work. Route -> prompt is the whole mapping, and
 * it lives in constants/cloudPrompts.ts where it can be read top to bottom.
 */
export function CloudPromptWatcher({ role }: { role: PromptRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const uid = user?.uid

  const { profile } = useProfile(uid)
  const { threads } = useChatList(uid)
  const { attendedEvents } = useAttendanceStats(uid)
  const { connectionUids } = useConnections(uid)

  const [registrations, setRegistrations] = useState<CommunityEvent[]>([])
  const [prompt, setPrompt] = useState<Prompt | null>(null)

  // One-shot rather than a subscription: `getMyRegisteredEvents` is what my-events
  // already uses, and a nudge does not need live updates to decide whether to appear.
  useEffect(() => {
    if (!uid) {
      setRegistrations([])
      return
    }
    let cancelled = false
    getMyRegisteredEvents(uid)
      .then((events) => {
        if (!cancelled) setRegistrations(events)
      })
      // A failed load simply means the events-based nudges stay quiet. It must never
      // take the screen down.
      .catch(() => {
        if (!cancelled) setRegistrations([])
      })
    return () => {
      cancelled = true
    }
  }, [uid])

  const state: PromptState = useMemo(
    () => ({
      photoURL: profile?.photoURL ?? null,
      attendedCount: attendedEvents.length,
      upcomingRegistrations: registrations,
      // A group thread with unread messages is one the user has not caught up on.
      unopenedEventChatIds: threads.filter((t) => t.kind === 'group' && t.unread > 0).map((t) => t.id),
      connectionsCount: connectionUids.length,
    }),
    [profile?.photoURL, attendedEvents.length, registrations, threads, connectionUids.length],
  )

  // Keyed on the ROUTE, so a re-render at the same pathname cannot re-raise a cloud.
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    getSeenPrompts(uid).then((seen) => {
      if (cancelled) return
      const next = pickPrompt({ route: pathname, role, state, seen, now: new Date() })
      if (!next) return
      setPrompt(next)
      // Marked on QUEUE, not on dismiss: a force-quit mid-animation should not mean the
      // same cloud every launch.
      if (next.kind === 'coaching') void markCoachingSeen(uid, next.id)
      else void markNudgeFired(uid, next.id, new Date())
    })

    return () => {
      cancelled = true
    }
    // `state` is deliberately excluded: it changes as subscriptions settle, and
    // including it would re-run this mid-visit and raise a second cloud on one screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pathname, role])

  // Clear on account change, so a sign-out mid-cloud does not hand the next user
  // someone else's prompt.
  useEffect(() => {
    setPrompt(null)
  }, [uid])

  return (
    <CloudPrompt
      prompt={prompt}
      onDismiss={() => setPrompt(null)}
      onAct={(acted) => {
        setPrompt(null)
        if (acted.href) router.push(acted.href)
      }}
    />
  )
}

CloudPromptWatcher.displayName = 'CloudPromptWatcher'
