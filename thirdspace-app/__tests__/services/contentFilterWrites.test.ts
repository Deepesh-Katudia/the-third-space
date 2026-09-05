import { getDoc, setDoc, writeBatch } from 'firebase/firestore'
import { sendDirectMessage, sendEventMessage, MessageAuthor, ParticipantInfo } from '../../services/chat'
import { buildEventDoc } from '../../services/events'
import { createProfile, updateProfile } from '../../services/profiles'
import { ContentRejectedError, BLOCKED_TERMS } from '../../utils/contentFilter'
import type { CreateProfileInput, Venue } from '../../types/models'

jest.mock('../../firebase/config', () => ({ db: {} }))

// services/events reaches the media service only to clean up an event cover on delete.
// Mocking it keeps firebase/storage and expo-image-manipulator (both ESM) out of this
// suite's parse — the same reason events.test.ts mocks it.
jest.mock('../../services/media', () => ({ deleteMedia: jest.fn(), mediaPreviewLabel: () => 'Photo' }))
jest.mock('firebase/firestore', () => ({
  doc: (_dbOrCol: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  writeBatch: jest.fn(),
  onSnapshot: jest.fn(),
  increment: (n: number) => ({ __increment: n }),
  serverTimestamp: () => '__serverTimestamp',
  Timestamp: { fromDate: (d: Date) => ({ __date: d.toISOString() }) },
}))

/**
 * One shipped term, taken from the list rather than hardcoded, so this suite keeps working
 * if the list is reworded — and so it never contains a slur of its own.
 */
const BLOCKED = BLOCKED_TERMS[0]

const author: MessageAuthor = { uid: 'me', name: 'Me', photoURL: null }
const participants: ParticipantInfo[] = [
  { uid: 'me', name: 'Me', photoURL: null },
  { uid: 'you', name: 'Maya', photoURL: null },
]
const venue = { name: 'Cellar 9', neighborhood: 'Bushwick', borough: 'Brooklyn' } as Venue
const eventInput = {
  title: 'Sketching',
  description: 'Bring a pencil',
  category: 'creative-outlet',
  startsAt: new Date('2026-10-01T18:00:00Z'),
  capacity: 12,
  ageRequirement: '18+',
} as Parameters<typeof buildEventDoc>[2]
const profileInput = {
  displayName: 'Sam',
  photoURL: null,
  vibePhotos: [],
  bio: 'Here for the pottery',
  interests: [],
  neighborhood: 'Bushwick',
  borough: 'Brooklyn',
  age: 29,
} as CreateProfileInput

const batch = { set: jest.fn(), update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) }

beforeEach(() => {
  jest.clearAllMocks()
  ;(writeBatch as jest.Mock).mockReturnValue(batch)
  ;(getDoc as jest.Mock).mockResolvedValue({ exists: () => true, data: () => ({ participants: ['me', 'you'] }) })
  ;(setDoc as jest.Mock).mockResolvedValue(undefined)
})

describe('a rejected message writes nothing at all', () => {
  it('rejects a group message and never touches Firestore', async () => {
    // A partial write would be worse than the rejection: a message doc without its thread
    // bump, or a bumped thread with no message behind it.
    await expect(sendEventMessage('e1', author, `you ${BLOCKED}`)).rejects.toThrow(ContentRejectedError)
    expect(writeBatch).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('rejects a direct message and never touches Firestore', async () => {
    await expect(sendDirectMessage('me_you', participants, author, `you ${BLOCKED}`)).rejects.toThrow(
      ContentRejectedError
    )
    expect(getDoc).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('still sends clean text', async () => {
    await sendEventMessage('e1', author, 'see you there')
    expect(batch.set).toHaveBeenCalled()
  })
})

describe('events', () => {
  it('rejects an objectionable title, tagged as title', () => {
    // buildEventDoc is the choke point every event write goes through, and it runs before
    // the cover upload is committed to.
    expect(() => buildEventDoc('host', venue, { ...eventInput, title: `${BLOCKED} night` })).toThrow(
      'content-rejected:title'
    )
  })

  it('rejects an objectionable description, tagged as description', () => {
    expect(() =>
      buildEventDoc('host', venue, { ...eventInput, description: `bring a ${BLOCKED}` })
    ).toThrow('content-rejected:description')
  })

  it('builds a clean event', () => {
    expect(buildEventDoc('host', venue, eventInput)).toEqual(
      expect.objectContaining({ title: 'Sketching', venueId: 'host' })
    )
  })
})

describe('profiles', () => {
  it('rejects an objectionable display name on create', async () => {
    await expect(
      createProfile('me', { ...profileInput, displayName: BLOCKED }, new Date('1996-01-01'))
    ).rejects.toThrow('content-rejected:name')
    expect(batch.set).not.toHaveBeenCalled()
  })

  it('rejects an objectionable bio on create', async () => {
    await expect(
      createProfile('me', { ...profileInput, bio: `I am a ${BLOCKED}` }, new Date('1996-01-01'))
    ).rejects.toThrow('content-rejected:bio')
  })

  it('checks only the fields an edit actually touches', async () => {
    // Partial update: running assertClean over an absent field would reject an edit that
    // never went near it.
    await expect(updateProfile('me', { neighborhood: 'Bushwick' })).resolves.toBeUndefined()
    await expect(updateProfile('me', { bio: `a ${BLOCKED}` })).rejects.toThrow('content-rejected:bio')
  })
})
