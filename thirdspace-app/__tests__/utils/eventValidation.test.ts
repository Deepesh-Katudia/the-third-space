import { validateEventForm } from '../../utils/eventValidation'

const now = new Date('2026-06-10T12:00:00')

const validInput = {
  title: 'Ceramics Night',
  description: 'Hands-on wheel throwing for beginners.',
  category: 'Creative Arts',
  startsAt: new Date('2026-06-20T19:00:00'),
  capacity: '12',
}

describe('validateEventForm', () => {
  it('returns no errors for valid input', () => {
    expect(validateEventForm(validInput, now)).toEqual({})
  })

  it('requires title, description, and category', () => {
    const errors = validateEventForm(
      { ...validInput, title: '  ', description: '', category: '' },
      now
    )
    expect(errors.title).toBe('Title is required.')
    expect(errors.description).toBe('Description is required.')
    expect(errors.category).toBe('Pick a category.')
  })

  it('rejects a start time in the past', () => {
    const errors = validateEventForm(
      { ...validInput, startsAt: new Date('2026-06-09T19:00:00') },
      now
    )
    expect(errors.startsAt).toBe('Event must be in the future.')
  })

  it('rejects non-numeric, fractional, and out-of-range capacity', () => {
    expect(validateEventForm({ ...validInput, capacity: 'abc' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '2.5' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '0' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
    expect(validateEventForm({ ...validInput, capacity: '501' }, now).capacity).toBe(
      'Capacity must be a whole number between 1 and 500.'
    )
  })
})
