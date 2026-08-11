import { writeBatch, getDoc, setDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore'
import {
  registerForEvent, cancelRegistration, createEvent, newEventRef, buildEventDoc,
  deleteEventWithRegistrations,
} from '../../services/events'
import { deleteMedia } from '../../services/media'

jest.mock('../../firebase/config', () => ({ db: {} }))

// services/events reaches into the media service only to clean up an event cover on
// delete. Mocking it keeps expo-image-manipulator (ESM) out of this suite's parse.
jest.mock('../../services/media', () => ({ deleteMedia: jest.fn() }))

jest.mock('firebase/firestore', () => ({
  // Two call shapes: doc(db, ...segments) addresses a known path, and doc(collectionRef)
  // mints a new id — which is what newEventRef() needs so the cover path is known
  // before the event document is written.
  doc: (dbOrRef: { path?: string }, ...segments: string[]) =>
    segments.length === 0 && dbOrRef?.path
      ? { path: `${dbOrRef.path}/auto-id`, id: 'auto-id' }
      : { path: segments.join('/') },
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
  setDoc: jest.fn(),
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
      { eventsCount: { __increment: -1 } },
      { merge: true }
    )
  })

  it('does not touch points/tier when the balance is already below one event\'s worth (e.g. spent via redemption)', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ points: 0 }) })

    await cancelRegistration('e1', 'u1')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { eventsCount: { __increment: -1 } },
      { merge: true }
    )
  })
})

describe('createEvent', () => {
  const input = {
    title: 'T', description: 'd', category: 'lets-eat' as const,
    startsAt: new Date('2030-01-01'), capacity: 10, ageRequirement: '18+' as const,
  }

  it('increments the venue eventsCount after creating the event', async () => {
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    const venue = { name: 'V', borough: 'Brooklyn' as const, neighborhood: 'N', description: 'd' }
    await createEvent(newEventRef(), 'v1', venue, input)
    expect(updateDoc).toHaveBeenCalledWith({ path: 'venues/v1' }, { eventsCount: { __increment: 1 } })
  })

  it('denormalizes the venue borough onto the event so the feed can filter without a join', async () => {
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    const venue = { name: 'V', borough: 'Queens' as const, neighborhood: 'Astoria', description: 'd' }
    await createEvent(newEventRef(), 'v1', venue, input)
    expect(setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'auto-id' }),
      expect.objectContaining({ borough: 'Queens', neighborhood: 'Astoria' })
    )
  })

  it('writes the event at the caller-supplied ref, so the cover path is known before upload', () => {
    const ref = newEventRef()
    expect(typeof ref.id).toBe('string')
    expect(ref.id.length).toBeGreaterThan(0)
  })

  it('omits `cover` entirely when no cover was supplied, rather than writing undefined', () => {
    // Firestore rejects an explicit `undefined`; the field must simply be absent.
    const venue = { name: 'V', borough: 'Queens' as const, neighborhood: 'Astoria', description: 'd' }
    expect('cover' in buildEventDoc('v1', venue, input, undefined)).toBe(false)
  })

  it('includes `cover` when one was supplied', () => {
    const venue = { name: 'V', borough: 'Queens' as const, neighborhood: 'Astoria', description: 'd' }
    const cover = { type: 'image' as const, url: 'u', thumbURL: 'u', width: 1, height: 1 }
    expect(buildEventDoc('v1', venue, input, cover).cover).toEqual(cover)
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

  it('deletes the cover while the event doc is still readable', async () => {
    const cover = { type: 'image' as const, url: 'u', thumbURL: 'u', width: 1, height: 1 }
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ venueId: 'v1', cover }) })
    ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await deleteEventWithRegistrations('e1')
    expect(deleteMedia).toHaveBeenCalledWith(cover)
  })

  it('does not call the media service for an event that never had a cover', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ venueId: 'v1' }) })
    ;(getDocs as jest.Mock).mockResolvedValue({ docs: [] })
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await deleteEventWithRegistrations('e1')
    expect(deleteMedia).not.toHaveBeenCalled()
  })
})
