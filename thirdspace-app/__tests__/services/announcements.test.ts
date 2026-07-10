import { onSnapshot, writeBatch } from 'firebase/firestore'
import { sendAnnouncement, subscribeAnnouncements } from '../../services/announcements'

const mockBatch = () => ({
  set: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
})

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  // doc(collectionRef) generates an auto-id ref → mirror the collection's path.
  doc: (dbOrColl: { path?: string; _isCollection?: boolean }, ...segments: string[]) =>
    segments.length === 0 && dbOrColl && dbOrColl._isCollection
      ? { path: dbOrColl.path }
      : { path: segments.join('/') },
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/'), _isCollection: true }),
  query: (col: { path: string }, ...constraints: unknown[]) => ({ col, constraints }),
  orderBy: (field: string, dir: string) => ({ field, dir }),
  onSnapshot: jest.fn(),
  serverTimestamp: () => '__ts',
  increment: (n: number) => ({ __increment: n }),
  writeBatch: jest.fn(),
}))

const author = { uid: 'host1', name: 'Rooftop Bar', photoURL: null }

beforeEach(() => jest.clearAllMocks())

describe('sendAnnouncement', () => {
  it('is a no-op for whitespace-only text', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

    await sendAnnouncement('evt1', author, '   ', 22)
    expect(batch.set).not.toHaveBeenCalled()
    expect(batch.commit).not.toHaveBeenCalled()
  })

  it('batches the announcement doc, an announcement chat message, and a chat-meta merge', async () => {
    const batch = mockBatch()
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

    await sendAnnouncement('evt1', author, '  Doors at 6  ', 22)

    // announcement doc
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'events/evt1/announcements' },
      { text: 'Doors at 6', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: '__ts' }
    )
    // chat message carries kind:'announcement' and the trimmed text
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'eventChats/evt1/messages' },
      { authorUid: 'host1', authorName: 'Rooftop Bar', authorPhotoURL: null, text: 'Doors at 6', kind: 'announcement', createdAt: '__ts' }
    )
    // chat meta merge with messageCount increment
    expect(batch.set).toHaveBeenCalledWith(
      { path: 'eventChats/evt1' },
      { lastMessageText: 'Doors at 6', lastMessageAt: '__ts', lastMessageAuthor: 'Rooftop Bar', messageCount: { __increment: 1 } },
      { merge: true }
    )
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeAnnouncements', () => {
  it('queries events/{id}/announcements ordered by createdAt desc and maps docs', () => {
    let handler: (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void = () => {}
    ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => { handler = fn; return jest.fn() })
    const onChange = jest.fn()

    subscribeAnnouncements('evt1', onChange, jest.fn())

    const q = (onSnapshot as jest.Mock).mock.calls[0][0]
    expect(q.col).toEqual({ path: 'events/evt1/announcements', _isCollection: true })
    expect(q.constraints).toEqual([{ field: 'createdAt', dir: 'desc' }])

    handler({ docs: [
      { id: 'a1', data: () => ({ text: 'Hi', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: null }) },
    ] })
    expect(onChange).toHaveBeenCalledWith([
      { id: 'a1', text: 'Hi', authorUid: 'host1', authorName: 'Rooftop Bar', recipientCount: 22, createdAt: null },
    ])
  })
})
