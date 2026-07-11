import { setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { upsertPushToken, deletePushToken, setPushEnabled, getPushEnabled } from '../../services/pushTokens'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  serverTimestamp: () => '__ts',
}))

beforeEach(() => jest.clearAllMocks())

it('upserts a token doc keyed by the token string', async () => {
  await upsertPushToken('u1', 'tok1', 'ios')
  expect(setDoc).toHaveBeenCalledWith(
    { path: 'users/u1/pushTokens/tok1' },
    { token: 'tok1', platform: 'ios', updatedAt: '__ts' },
    { merge: true }
  )
})

it('deletes a token doc', async () => {
  await deletePushToken('u1', 'tok1')
  expect(deleteDoc).toHaveBeenCalledWith({ path: 'users/u1/pushTokens/tok1' })
})

it('writes the global pushEnabled flag with merge', async () => {
  await setPushEnabled('u1', false)
  expect(setDoc).toHaveBeenCalledWith({ path: 'users/u1' }, { pushEnabled: false }, { merge: true })
})

it('treats an absent pushEnabled field as enabled', async () => {
  ;(getDoc as jest.Mock).mockResolvedValue({ data: () => ({}) })
  expect(await getPushEnabled('u1')).toBe(true)
})

it('returns false only when pushEnabled is explicitly false', async () => {
  ;(getDoc as jest.Mock).mockResolvedValue({ data: () => ({ pushEnabled: false }) })
  expect(await getPushEnabled('u1')).toBe(false)
})
