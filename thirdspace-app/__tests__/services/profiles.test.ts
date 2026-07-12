import { writeBatch, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'
import { createProfile, updateProfile, getProfile, subscribeProfile, redeemReward, submitVerification } from '../../services/profiles'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (dbOrRef: unknown, ...segments: string[]) => {
    if (segments.length === 0 && typeof dbOrRef === 'object' && dbOrRef !== null && 'path' in (dbOrRef as { path?: string })) {
      return { path: `${(dbOrRef as { path: string }).path}/auto-id` }
    }
    return { path: segments.join('/') }
  },
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  writeBatch: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
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

describe('redeemReward', () => {
  it('deducts points, recomputes tier, and logs the redemption', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)
    const reward = { id: 'rw1', label: 'Free drink at Cellar 9', cost: 500 }

    await redeemReward('u1', reward, 600)

    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { points: { __increment: -500 }, tier: 'Newcomer' },
      { merge: true }
    )
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'profiles/u1/redemptions/auto-id' },
      expect.objectContaining({ rewardId: 'rw1', label: 'Free drink at Cellar 9', cost: 500, redeemedAt: '__serverTimestamp' })
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('submitVerification', () => {
  it('marks the profile verified with a server timestamp', async () => {
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await submitVerification('u1')
    expect(updateDoc).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { verified: true, verifiedAt: '__serverTimestamp' }
    )
  })
})
