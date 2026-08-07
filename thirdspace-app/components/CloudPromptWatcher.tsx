import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import { tabAnchor } from '../constants/cloudPrompts'
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

  // Only attenders have nudges — every hoster entry is coaching, with no condition, so
  // none of the state below is ever read for one. Handing these hooks `undefined` for a
  // hoster keeps four live subscriptions and a fetch from opening to feed a decision
  // nobody makes. Same reasoning that keeps RewardWatcher off the hoster layout.
  const stateUid = role === 'attender' ? uid : undefined

  const { profile, loading: profileLoading } = useProfile(stateUid)
  const { threads, loading: threadsLoading } = useChatList(stateUid)
  const { attendedEvents, loading: attendanceLoading } = useAttendanceStats(stateUid)
  const { connectionUids, loading: connectionsLoading } = useConnections(stateUid)

  const [registrations, setRegistrations] = useState<CommunityEvent[]>([])
  const [registrationsLoaded, setRegistrationsLoaded] = useState(false)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  /** The `uid:pathname` visit a cloud was last raised for. See the raise effect. */
  const raisedFor = useRef<string | null>(null)

  // One-shot rather than a subscription: `getMyRegisteredEvents` is what my-events
  // already uses, and a nudge does not need live updates to decide whether to appear.
  useEffect(() => {
    if (!stateUid) {
      setRegistrations([])
      setRegistrationsLoaded(true)
      return
    }
    let cancelled = false
    setRegistrationsLoaded(false)
    getMyRegisteredEvents(stateUid)
      .then((events) => {
        if (!cancelled) {
          setRegistrations(events)
          setRegistrationsLoaded(true)
        }
      })
      // A failed load simply means the events-based nudges stay quiet. It must never
      // take the screen down — and it must still count as settled, or a Firestore
      // outage would hold every nudge back forever.
      .catch(() => {
        if (!cancelled) {
          setRegistrations([])
          setRegistrationsLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [stateUid])

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

  /**
   * Whether `state` describes the account or merely describes nothing having loaded yet.
   *
   * Every one of these sources starts empty and settles later, while AsyncStorage answers
   * in a tick — so judging a nudge at mount asks the catalogue about a member with no
   * photo, no events and no connections, which is exactly the shape `no-photo`,
   * `no-rsvp-yet` and `no-connections` all test for. A veteran would be told they had
   * never been to anything, and the firing would burn the 3-day cooldown that was
   * supposed to protect the REAL nudge.
   *
   * Coaching does not read state at all, but it is gated alongside: it is a first-visit
   * hint, and a few hundred milliseconds later is still the first visit.
   */
  const ready =
    !profileLoading && !threadsLoading && !attendanceLoading && !connectionsLoading && registrationsLoaded

  // Keyed on the ROUTE, so a re-render at the same pathname cannot re-raise a cloud.
  useEffect(() => {
    if (!uid || !ready) return
    let cancelled = false

    // At most one raise per visit to a route. `ready` is part of the key below, and a
    // token refresh can retrigger the profile subscription's loading flag, so the effect
    // can legitimately re-run at an unchanged pathname — without this, that would put
    // back a cloud the user had just dismissed.
    const visit = `${uid}:${pathname}`
    if (raisedFor.current === visit) return

    getSeenPrompts(uid).then((seen) => {
      if (cancelled) return
      const next = pickPrompt({ route: pathname, role, state, seen, now: new Date() })
      if (!next) return
      raisedFor.current = visit
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
    // `ready` stands in for it — one flip, from "nothing has loaded" to "this is the
    // account", which is the only change of state a prompt decision should react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pathname, role, ready])

  // Clear on account change, so a sign-out mid-cloud does not hand the next user
  // someone else's prompt — nor the next user's first visit the last one's visit record.
  useEffect(() => {
    setPrompt(null)
    raisedFor.current = null
  }, [uid])

  return (
    <CloudPrompt
      prompt={prompt}
      // Resolved here rather than inside CloudPrompt because the role is what makes it
      // answerable — the component is handed a position, not asked to work one out.
      anchor={prompt ? tabAnchor(prompt, role) : null}
      onDismiss={() => setPrompt(null)}
      onAct={(acted) => {
        setPrompt(null)
        if (acted.href) router.push(acted.href)
      }}
    />
  )
}

CloudPromptWatcher.displayName = 'CloudPromptWatcher'
