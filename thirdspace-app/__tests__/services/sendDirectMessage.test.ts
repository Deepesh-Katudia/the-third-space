import { getDoc, setDoc, writeBatch } from 'firebase/firestore'
import { sendDirectMessage, MessageAuthor, ParticipantInfo } from '../../services/chat'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_dbOrCol: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  writeBatch: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
  serverTimestamp: () => '__serverTimestamp',
}))

const author: MessageAuthor = { uid: 'me', name: 'Me', photoURL: null }
const participants: ParticipantInfo[] = [
  { uid: 'me', name: 'Me', photoURL: null },
  { uid: 'you', name: 'Maya', photoURL: null },
]

beforeEach(() => jest.clearAllMocks())

describe('sendDirectMessage', () => {
  it('reports created:true and opens a pending request when no conversation exists', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => false })
    ;(setDoc as jest.Mock).mockResolvedValue(undefined)

    const result = await sendDirectMessage('me_you', participants, author, 'hey')

    expect(result).toEqual({ created: true })
    expect(setDoc).toHaveBeenCalledTimes(2)
    const [convRef, convData] = (setDoc as jest.Mock).mock.calls[0]
    expect(convRef).toEqual({ path: 'conversations/me_you' })
    expect(convData).toMatchObject({ participants: ['me', 'you'], status: 'pending', requestedBy: 'me' })
  })

  it('reports created:false and appends when the conversation already exists', async () => {
    ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true })
    const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }
    ;(writeBatch as jest.Mock).mockReturnValue(batch)

    const result = await sendDirectMessage('me_you', participants, author, 'hey again')

    expect(result).toEqual({ created: false })
    expect(setDoc).not.toHaveBeenCalled()
    expect(batch.commit).toHaveBeenCalledTimes(1)
  })

  it('reports created:false and writes nothing for whitespace-only text', async () => {
    const result = await sendDirectMessage('me_you', participants, author, '   ')

    expect(result).toEqual({ created: false })
    expect(getDoc).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })
})
