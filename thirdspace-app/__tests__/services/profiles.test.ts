import { writeBatch, setDoc, getDoc } from 'firebase/firestore'
import { createProfile, updateProfile, getProfile } from '../../services/profiles'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: { fromDate: (d: Date) => ({ __ts: d.getTime() }) },
}))

function mockBatch() {
  return { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
}

describe('createProfile', () => {
  it('writes the public profile with neutral defaults and the private birthdate in one batch', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    const input = {
      displayName: 'Maya', photoURL: null, vibePhotos: [], bio: 'hi',
      interests: ['Art', 'Coffee', 'Film'], neighborhood: 'Williamsburg',
      borough: 'Brooklyn' as const, age: 27,
    }

    await createProfile('u1', input, new Date('1999-01-01'))

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      expect.objectContaining({
        displayName: 'Maya', interests: ['Art', 'Coffee', 'Film'],
        eventsCount: 0, points: 0, tier: 'Newcomer', verified: false,
        joinedAt: '__serverTimestamp',
      })
    )
    expect(batch.update).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { birthdate: { __ts: new Date('1999-01-01').getTime() } }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('getProfile', () => {
  it('returns null when the profile does not exist', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
    expect(await getProfile('nope')).toBeNull()
  })

  it('returns the profile data when it exists', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ displayName: 'Maya' }) })
    expect(await getProfile('u1')).toEqual({ displayName: 'Maya' })
  })
})
