import React, { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'expo-router'
import { CloudPrompt } from './CloudPrompt'
import { useAuth } from '../hooks/useAuth'
import { isFirstRun, pickPrompt, SESSION_STARTED_AT } from '../utils/cloudPrompts'
import { beginFirstRun, closeFirstRun, getSeenPrompts, markCoachingSeen } from '../services/cloudPromptsSeen'
import { tabAnchor } from '../constants/cloudPrompts'
import type { CloudPrompt as Prompt, PromptRole } from '../constants/cloudPrompts'

/**
 * Raises a cloud wherever the user happens to be, during their FIRST session only.
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
 *
 * This used to subscribe to the profile, the chat list, attendance and connections, and
 * to fetch registrations, because the behavioural nudges judged themselves against all of
 * it — and it needed a `ready` gate so a nudge was never decided on the empty first
 * snapshot. The nudges are gone, so all of that is too: a first-run hint depends on the
 * route and on local storage, both of which answer immediately.
 */
export function CloudPromptWatcher({ role }: { role: PromptRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const uid = user?.uid

  const [prompt, setPrompt] = useState<Prompt | null>(null)
  /** The `uid:pathname` visit a cloud was last raised for. See the raise effect. */
  const raisedFor = useRef<string | null>(null)

  // Keyed on the ROUTE, so a re-render at the same pathname cannot re-raise a cloud.
  useEffect(() => {
    if (!uid) return
    let cancelled = false

    // At most one raise per visit to a route, so a re-render at an unchanged pathname
    // cannot put back a cloud the user has just dismissed.
    const visit = `${uid}:${pathname}`
    if (raisedFor.current === visit) return

    void getSeenPrompts(uid).then((seen) => {
      if (cancelled) return

      if (!isFirstRun({ seen, sessionStartedAt: SESSION_STARTED_AT })) {
        // Close it once, then never ask the clock again: every subsequent navigation is
        // answered by the flag. Guarding on the flag is what keeps this from being an
        // AsyncStorage write per route change for the whole life of the install.
        if (!seen.firstRunDone) void closeFirstRun(uid)
        return
      }

      const next = pickPrompt({ route: pathname, role, seen, sessionStartedAt: SESSION_STARTED_AT })
      if (!next) return

      raisedFor.current = visit
      setPrompt(next)
      // Marked on QUEUE, not on dismiss: a force-quit mid-animation should not mean the
      // same cloud every launch.
      void markCoachingSeen(uid, next.id)
      // Stamped from the first hint actually raised rather than from mount, so an account
      // whose first launch shows nothing (no catalogue entry for the route it landed on)
      // still gets its tour on the next one.
      if (!seen.firstRunStartedAt) void beginFirstRun(uid, new Date())
    })

    return () => {
      cancelled = true
    }
  }, [uid, pathname, role])

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
