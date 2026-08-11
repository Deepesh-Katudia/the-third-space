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

beforeEach(() => {
  jest.clearAllMocks()
  ;(isThreadMuted as jest.Mock).mockResolvedValue(false)
  ;(activeTokensFor as jest.Mock).mockResolvedValue([{ uid: 'guest', token: 't_guest' }])
})

function sentBody(): string {
  return (sendPush as jest.Mock).mock.calls[0][0][0].body
}

it('pushes a media label when an attachment arrives with no caption', async () => {
  await handleNewDirectMessage(fakeDb, 'c1', {
    authorUid: 'host', authorName: 'Rooftop', text: '', media: { type: 'image' },
  })
  expect(sentBody()).toBe('PHOTO')
})

it('labels a clip as VIDEO', async () => {
  await handleNewDirectMessage(fakeDb, 'c1', {
    authorUid: 'host', authorName: 'Rooftop', text: '', media: { type: 'video' },
  })
  expect(sentBody()).toBe('VIDEO')
})

it('prefers the caption over the label when both are present', async () => {
  await handleNewDirectMessage(fakeDb, 'c1', {
    authorUid: 'host', authorName: 'Rooftop', text: 'look at this', media: { type: 'image' },
  })
  expect(sentBody()).toBe('look at this')
})
