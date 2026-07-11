jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  isThreadMuted: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor, isThreadMuted } from './recipients'
import { handleNewDirectMessage } from './onNewDirectMessage'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({
      get: (f: string) => (path === 'conversations/c1' && f === 'participants' ? ['host', 'guest'] : undefined),
    }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('messages the other participant, skipping the author and muted recipients', async () => {
  ;(isThreadMuted as jest.Mock).mockResolvedValue(false)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'guest', token: 't_guest' }])

  await handleNewDirectMessage(fakeDb, 'c1', { authorUid: 'host', authorName: 'Rooftop', text: 'hi there' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['guest'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't_guest', title: 'Rooftop', body: 'hi there', data: { type: 'dm', convId: 'c1' } },
  ])
})

it('sends nothing when the only other participant muted the thread', async () => {
  ;(isThreadMuted as jest.Mock).mockResolvedValue(true)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([])

  await handleNewDirectMessage(fakeDb, 'c1', { authorUid: 'host', authorName: 'Rooftop', text: 'hi' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, [])
  expect(sendPush).toHaveBeenCalledWith([])
})
