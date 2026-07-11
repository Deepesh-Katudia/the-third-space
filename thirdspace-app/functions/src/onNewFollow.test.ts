jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  isMutualFollow: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor, isMutualFollow } from './recipients'
import { handleNewFollow } from './onNewFollow'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({ get: (f: string) => (path === 'profiles/maya' && f === 'displayName' ? 'Maya' : undefined) }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('notifies the target that a new follower started following them', async () => {
  ;(isMutualFollow as jest.Mock).mockResolvedValue(false)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'sam', token: 't_sam' }])

  await handleNewFollow(fakeDb, { follower: 'maya', target: 'sam' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['sam'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_sam', title: 'New follower', body: 'Maya started following you', data: { type: 'follow', uid: 'maya' } },
  ])
})

it('uses connection copy when the follow is mutual', async () => {
  ;(isMutualFollow as jest.Mock).mockResolvedValue(true)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'sam', token: 't_sam' }])

  await handleNewFollow(fakeDb, { follower: 'maya', target: 'sam' })

  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_sam', title: 'New connection', body: "You're now connected with Maya", data: { type: 'follow', uid: 'maya' } },
  ])
})
