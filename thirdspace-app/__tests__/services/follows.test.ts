import { setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'
import {
  followUser, unfollowUser, subscribeFollowStatus, subscribeFollowing, subscribeFollowers,
} from '../../services/follows'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (col: { path: string }, ...constraints: unknown[]) => ({ col, constraints }),
  where: (field: string, op: string, value: unknown) => ({ field, op, value }),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__serverTimestamp',
}))

beforeEach(() => jest.clearAllMocks())

describe('followUser', () => {
  it('writes the edge doc at follows/{follower_target} with follower, target, createdAt', async () => {
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)
    await followUser('me', 'you')
    expect(setDoc).toHaveBeenCalledWith(
      { path: 'follows/me_you' },
      { follower: 'me', target: 'you', createdAt: '__serverTimestamp' }
    )
  })

  it('throws on self-follow without writing', async () => {
    await expect(followUser('me', 'me')).rejects.toThrow()
    expect(setDoc).not.toHaveBeenCalled()
  })
})

describe('unfollowUser', () => {
  it('deletes the edge doc at follows/{follower_target}', async () => {
    ;(deleteDoc as jest.Mock).mockResolvedValue(undefined)
    await unfollowUser('me', 'you')
    expect(deleteDoc).toHaveBeenCalledWith({ path: 'follows/me_you' })
  })
})

describe('subscribeFollowStatus', () => {
  it('emits true when the edge doc exists and false when it does not', () => {
    let handler: (snap: { exists: () => boolean }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_ref, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowStatus('me', 'you', onChange, jest.fn())
    expect((onSnapshot as jest.Mock).mock.calls[0][0]).toEqual({ path: 'follows/me_you' })
    handler({ exists: () => true })
    expect(onChange).toHaveBeenCalledWith(true)
    handler({ exists: () => false })
    expect(onChange).toHaveBeenCalledWith(false)
  })
})

describe('subscribeFollowing', () => {
  it('queries by follower and emits the target uids', () => {
    let handler: (snap: { docs: { data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowing('me', onChange, jest.fn())
    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.constraints).toEqual([{ field: 'follower', op: '==', value: 'me' }])
    handler({ docs: [{ data: () => ({ follower: 'me', target: 'a' }) }, { data: () => ({ follower: 'me', target: 'b' }) }] })
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
  })
})

describe('subscribeFollowers', () => {
  it('queries by target and emits the follower uids', () => {
    let handler: (snap: { docs: { data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => {
      handler = fn
      return jest.fn()
    })
    const onChange = jest.fn()
    subscribeFollowers('me', onChange, jest.fn())
    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.constraints).toEqual([{ field: 'target', op: '==', value: 'me' }])
    handler({ docs: [{ data: () => ({ follower: 'x', target: 'me' }) }] })
    expect(onChange).toHaveBeenCalledWith(['x'])
  })
})
