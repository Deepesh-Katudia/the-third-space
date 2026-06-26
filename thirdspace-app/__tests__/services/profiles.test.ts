import { writeBatch, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { createProfile, updateProfile, getProfile, subscribeProfile } from '../../services/profiles'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: { fromDate: (d: Date) => ({ __ts: d.getTime() }) },
}))

function mockBatch() {
  return { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
}

beforeEach(() => jest.clearAllMocks())

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

describe('subscribeProfile', () => {
  it('calls onChange with null when the profile does not exist', () => {
    let handler: (snap: { exists: () => boolean; data?: () => unknown }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_ref, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeProfile('u1', onChange, jest.fn())
    handler({ exists: () => false })
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('calls onChange with the profile data when it exists', () => {
    let handler: (snap: { exists: () => boolean; data: () => unknown }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_ref, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeProfile('u1', onChange, jest.fn())
    handler({ exists: () => true, data: () => ({ displayName: 'Maya' }) })
    expect(onChange).toHaveBeenCalledWith({ displayName: 'Maya' })
  })

  it('returns the unsubscribe function from onSnapshot', () => {
    const unsub = jest.fn()
    ;(onSnapshot as jest.Mock).mockReturnValue(unsub)
    expect(subscribeProfile('u1', jest.fn(), jest.fn())).toBe(unsub)
  })
})

describe('updateProfile', () => {
  it('calls updateDoc on the profiles document with the partial', async () => {
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await updateProfile('u1', { bio: 'updated' })
    expect(updateDoc).toHaveBeenCalledWith({ path: 'profiles/u1' }, { bio: 'updated' })
  })
})
