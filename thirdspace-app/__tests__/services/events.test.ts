import { writeBatch, getDoc, addDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore'
import { registerForEvent, cancelRegistration, createEvent, deleteEventWithRegistrations } from '../../services/events'

jest.mock('../../firebase/config', () => ({ db: {} }))

jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
  arrayUnion: (value: unknown) => ({ __arrayUnion: value }),
  arrayRemove: (value: unknown) => ({ __arrayRemove: value }),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
}))

function mockBatch() {
  return {
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('registerForEvent', () => {
  it('atomically creates the registration, bumps the count, and tracks it on the user', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => undefined })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      expect.objectContaining({ displayName: 'Maya', registeredAt: '__serverTimestamp' })
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'events/e1' },
      { registeredCount: { __increment: 1 } }
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { registeredEventIds: { __arrayUnion: 'e1' } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('writes a denormalized profile snippet and bumps the profile eventsCount', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ photoURL: 'http://x/a.jpg', age: 27, neighborhood: 'Bushwick', interests: ['Art', 'Coffee', 'Film', 'Music'], points: 0 }),
    })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      expect.objectContaining({
        displayName: 'Maya', photoURL: 'http://x/a.jpg', age: 27,
        neighborhood: 'Bushwick', interestsPreview: ['Art', 'Coffee', 'Film'],
      })
    )
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: 1 }, points: { __increment: 50 }, tier: 'Newcomer' },
      { merge: true }
    )
  })

  it('awards points into the next tier when the resulting total crosses a threshold', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 480 }) })

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: 1 }, points: { __increment: 50 }, tier: 'Regular' },
      { merge: true }
    )
  })
})

describe('cancelRegistration', () => {
  it('atomically removes the registration, decrements the count, and untracks it', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 100 }) })

    await cancelRegistration('e1', 'u1')

    expect(batch.delete).toHaveBeenCalledWith({ path: 'events/e1/registrations/u1' })
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'events/e1' },
      { registeredCount: { __increment: -1 } }
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { registeredEventIds: { __arrayRemove: 'e1' } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('decrements the profile eventsCount and revokes the points/tier it earned', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 550 }) })

    await cancelRegistration('e1', 'u1')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: -1 }, points: { __increment: -50 }, tier: 'Regular' },
      { merge: true }
    )
  })

  it('treats a missing profile as zero points and never goes negative', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false, data: () => undefined })

    await cancelRegistration('e1', 'u1')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: -1 }, points: { __increment: -50 }, tier: 'Newcomer' },
      { merge: true }
    )
  })
})

describe('createEvent', () => {
  it('increments the venue eventsCount after creating the event', async () => {
    ;(addDoc as jest.Mock).mockResolvedValue({ id: 'e1' })
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    const venue = { name: 'V', borough: 'Brooklyn' as const, neighborhood: 'N', description: 'd' }
    await createEvent('v1', venue, {
      title: 'T', description: 'd', category: 'Social' as const,
      startsAt: new Date('2030-01-01'), capacity: 10, ageRequirement: '18+' as const,
    })
    expect(updateDoc).toHaveBeenCalledWith({ path: 'venues/v1' }, { eventsCount: { __increment: 1 } })
  })
})

describe('deleteEventWithRegistrations', () => {
  it('decrements the venue eventsCount after deleting the event', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ venueId: 'v1' }) })
    ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await deleteEventWithRegistrations('e1')
    expect(updateDoc).toHaveBeenCalledWith({ path: 'venues/v1' }, { eventsCount: { __increment: -1 } })
  })
})
