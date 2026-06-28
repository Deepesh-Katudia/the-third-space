import { EventCategory } from '../types/models'

export type DateFilter = 'today' | 'weekend' | 'week' | null

export interface EventFilters {
  date: DateFilter
  neighborhoods: string[]
  hide21: boolean
  categories: EventCategory[]
}

export const EMPTY_FILTERS: EventFilters = {
  date: null,
  neighborhoods: [],
  hide21: false,
  categories: [],
}
