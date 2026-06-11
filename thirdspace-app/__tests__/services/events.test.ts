import { writeBatch } from 'firebase/firestore'
import { registerForEvent, cancelRegistration } from '../../services/events'

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

describe('registerForEvent', () => {
  it('atomically creates the registration, bumps the count, and tracks it on the user', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

    await registerForEvent('e1', 'u1', 'Maya')

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/e1/registrations/u1' },
      { displayName: 'Maya', registeredAt: '__serverTimestamp' }
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
})

describe('cancelRegistration', () => {
  it('atomically removes the registration, decrements the count, and untracks it', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

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
})
