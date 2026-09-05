import { useSyncExternalStore } from 'react'
import { subscribeBlocks } from '../services/blocks'

/**
 * The blocked set, app-wide.
 *
 * A module store rather than a hook per screen — the `useUserLocation` /
 * `useDiscoverFilters` pattern — because five unrelated surfaces filter on it (the chat
 * list, Discover, a member profile, a guest list, the connections list) while exactly one
 * screen writes it. One subscription for the session is the honest shape for that.
 *
 * `loading` starts true so a surface never renders an unfiltered list and then removes
 * rows: a blocked member flashing into view is precisely the failure this feature exists
 * to prevent.
 */
interface BlocksState {
  blocked: ReadonlySet<string>
  loading: boolean
}

const EMPTY: ReadonlySet<string> = new Set()

let state: BlocksState = { blocked: EMPTY, loading: true }
let currentUid: string | undefined
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): BlocksState {
  return state
}

/**
 * Attach to one account's block list.
 *
 * Idempotent per uid, because the attach point is an effect in `(app)/_layout.tsx` that
 * re-runs whenever that layout renders — resubscribing there would open a Firestore
 * listener per render.
 *
 * Passing undefined (sign-out) tears down and clears. Leaving one account's blocks in
 * place for the next user of the device would leak who they had blocked.
 */
export function syncBlocks(uid: string | undefined): void {
  if (uid === currentUid) return
  currentUid = uid
  unsubscribe?.()
  unsubscribe = null

  if (!uid) {
    state = { blocked: EMPTY, loading: false }
    emit()
    return
  }

  state = { blocked: EMPTY, loading: true }
  emit()
  unsubscribe = subscribeBlocks(
    uid,
    (uids) => {
      state = { blocked: new Set(uids), loading: false }
      emit()
    },
    () => {
      // Fail OPEN, deliberately. The write gates in firestore.rules are the enforcement;
      // this set is presentation. A permanent loading state here would take out the chat
      // list, Discover and the guest list at once, which is a worse outcome than one
      // unfiltered list — and the blocked party still cannot reach the member.
      state = { blocked: EMPTY, loading: false }
      emit()
    }
  )
}

export function useBlocks() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return {
    blocked: snap.blocked,
    isBlocked: (uid: string) => snap.blocked.has(uid),
    loading: snap.loading,
  }
}
