export interface EventFormErrors {
  title?: string
  description?: string
  category?: string
  startsAt?: string
  capacity?: string
}

export interface EventFormInput {
  title: string
  description: string
  category: string
  startsAt: Date
  capacity: string
}

const CAPACITY_MIN = 1
const CAPACITY_MAX = 500

export function validateEventForm(input: EventFormInput, now: Date = new Date()): EventFormErrors {
  const errors: EventFormErrors = {}

  if (!input.title.trim()) errors.title = 'Title is required.'
  if (!input.description.trim()) errors.description = 'Description is required.'
  if (!input.category) errors.category = 'Pick a category.'
  if (input.startsAt.getTime() <= now.getTime()) errors.startsAt = 'Event must be in the future.'

  const capacity = Number(input.capacity)
  if (!Number.isInteger(capacity) || capacity < CAPACITY_MIN || capacity > CAPACITY_MAX) {
    errors.capacity = 'Capacity must be a whole number between 1 and 500.'
  }

  return errors
}
