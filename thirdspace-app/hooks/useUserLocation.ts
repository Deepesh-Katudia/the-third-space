import { useSyncExternalStore } from 'react'
import { Borough } from '../types/models'
import { detectBorough } from '../services/location'
import { getLocationOverride, setLocationOverride } from '../services/preferences'

export type LocationSource = 'manual' | 'gps' | 'profile' | 'default'

interface LocationState {
  borough: Borough | null
  source: LocationSource
  loading: boolean
}

// Module-level, not useState: the borough picker is a separate route from Discover,
// so both must read one shared source of truth. Same pattern as useDiscoverFilters.
let state: LocationState = { borough: null, source: 'default', loading: true }
const listeners = new Set<() => void>()

// Invalidates any in-flight resolveLocation chain. Without this, a manual pick made
// while GPS/permission resolution is still in flight (the dialog + fix window can be
// long) gets silently clobbered when that chain finally resolves — violating "a
// manual borough pick is permanent until changed."
let epoch = 0

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): LocationState {
  return state
}

/** A deliberate choice. Wins over GPS permanently, until changed again. */
export function setBorough(next: Borough | null): void {
  epoch++ // invalidate any resolveLocation chain in flight
  state = { borough: next, source: 'manual', loading: false }
  emit()
  setLocationOverride(next).catch(() => {
    // A failed write only costs persistence across launches, not this session.
  })
}

/**
 * Runs the resolution chain: manual > gps > profile > default. Safe to call more
 * than once; each call fully overwrites the state — except that a manual pick made
 * while this chain is still awaiting the permission dialog / GPS fix must win. The
 * epoch check before each assignment guards exactly that race.
 */
export async function resolveLocation(profileBorough: Borough | null): Promise<void> {
  const mine = ++epoch
  state = { ...state, loading: true }
  emit()

  const override = await getLocationOverride()
  if (mine !== epoch) return
  if (override) {
    state = { borough: override.borough, source: 'manual', loading: false }
    emit()
    return
  }

  const gps = await detectBorough()
  if (mine !== epoch) return
  if (gps) {
    state = { borough: gps, source: 'gps', loading: false }
    emit()
    return
  }

  if (profileBorough) {
    state = { borough: profileBorough, source: 'profile', loading: false }
    emit()
    return
  }

  state = { borough: null, source: 'default', loading: false }
  emit()
}

export function useUserLocation() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return { borough: snap.borough, source: snap.source, loading: snap.loading, setBorough }
}
