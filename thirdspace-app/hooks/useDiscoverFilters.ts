import { useSyncExternalStore } from 'react'
import { EventFilters, EMPTY_FILTERS } from '../constants/filters'

interface DiscoverState {
  filters: EventFilters
  query: string
}

let state: DiscoverState = { filters: EMPTY_FILTERS, query: '' }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): DiscoverState {
  return state
}

function setFilters(filters: EventFilters): void {
  state = { ...state, filters }
  emit()
}

function setQuery(query: string): void {
  state = { ...state, query }
  emit()
}

function reset(): void {
  state = { filters: EMPTY_FILTERS, query: '' }
  emit()
}

export function useDiscoverFilters() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return { filters: snap.filters, query: snap.query, setFilters, setQuery, reset }
}
