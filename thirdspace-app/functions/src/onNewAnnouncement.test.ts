jest.mock('./sendPush', () => ({
  sendPush: jest.fn().mockResolvedValue([]),
  truncateBody: (t: string) => t,
}))
jest.mock('./recipients', () => ({
  activeTokensFor: jest.fn(),
  pruneDeadTokens: jest.fn().mockResolvedValue(undefined),
}))

import { sendPush } from './sendPush'
import { activeTokensFor } from './recipients'
import { handleNewAnnouncement } from './onNewAnnouncement'

const fakeDb = {
  doc: (path: string) => ({
    get: async () => ({ get: (f: string) => (path === 'events/e1' && f === 'title' ? 'Rooftop Sketching' : undefined) }),
  }),
  collection: (path: string) => ({
    get: async () => ({
      docs: path === 'events/e1/registrations' ? [{ id: 'host' }, { id: 'guest1' }, { id: 'guest2' }] : [],
    }),
  }),
} as any

beforeEach(() => jest.clearAllMocks())

it('fans out to registrations except the author, with the event title', async () => {
  ;(activeTokensFor as jest.Mock).mockResolvedValue([
    { uid: 'guest1', token: 't1' },
    { uid: 'guest2', token: 't2' },
  ])

  await handleNewAnnouncement(fakeDb, 'e1', { authorUid: 'host', authorName: 'Host', text: 'Doors at 6' })

  expect(activeTokensFor).toHaveBeenCalledWith(fakeDb, ['guest1', 'guest2'])
  expect(sendPush).toHaveBeenCalledWith([
    { to: 't1', title: '📣 Rooftop Sketching', body: 'Doors at 6', data: { type: 'announcement', eventId: 'e1' } },
    { to: 't2', title: '📣 Rooftop Sketching', body: 'Doors at 6', data: { type: 'announcement', eventId: 'e1' } },
  ])
})
