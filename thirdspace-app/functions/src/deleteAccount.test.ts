import { cascadeDelete, STORAGE_PREFIXES } from './deleteAccount'
import { FakeFirestore, fakeAuth, fakeBucket } from './testing/fakeFirestore'

const NOW = new Date('2026-09-05T12:00:00.000Z')
const FUTURE = { toMillis: () => NOW.getTime() + 86_400_000 }
const PAST = { toMillis: () => NOW.getTime() - 86_400_000 }

/** A member with a bit of everything: two threads, a registration, follows both ways. */
function seedAttender() {
  return new FakeFirestore({
    'users/me': { uid: 'me', role: 'attender', registeredEventIds: ['e1'] },
    'users/me/pushTokens/t1': { token: 't1' },
    'users/me/chatReads/e1': { readCount: 2, muted: false },
    'users/me/blocks/bad': { createdAt: null },
    'profiles/me': { displayName: 'Me', points: 100 },
    'profiles/me/private/socials': { instagram: 'me' },
    'profiles/me/redemptions/r1': { rewardId: 'rw1' },
    'events/e1': { title: 'Sketching', venueId: 'host', registeredCount: 4, startsAt: FUTURE },
    'events/e1/registrations/me': { uid: 'me', displayName: 'Me' },
    'eventChats/e1': { lastMessageText: 'mine', lastMessageAuthor: 'Me', messageCount: 2, lastMessageAt: PAST },
    'eventChats/e1/messages/m1': { authorUid: 'other', authorName: 'Other', text: 'theirs', createdAt: PAST },
    'eventChats/e1/messages/m2': { authorUid: 'me', authorName: 'Me', text: 'mine', createdAt: FUTURE },
    'conversations/me_you': { participants: ['me', 'you'], lastMessageText: 'mine', lastMessageAuthor: 'Me', messageCount: 1, lastMessageAt: PAST },
    'conversations/me_you/messages/d1': { authorUid: 'me', authorName: 'Me', text: 'mine', createdAt: PAST },
    'follows/me_you': { follower: 'me', target: 'you' },
    'follows/you_me': { follower: 'you', target: 'me' },
    'follows/other_third': { follower: 'other', target: 'third' },
  })
}

const deps = (db: FakeFirestore) => ({
  db: db as never,
  bucket: fakeBucket(),
  auth: fakeAuth(),
  now: NOW,
})

it('deletes the Auth user LAST, after every cascade step', async () => {
  const db = seedAttender()
  const d = deps(db)
  const steps: string[] = []
  await cascadeDelete({ ...d, onStep: (s) => steps.push(s) }, 'me')
  expect(steps[steps.length - 1]).toBe('auth')
  expect(d.auth.deletedUsers).toEqual(['me'])
})

it('leaves the Auth user intact when a cascade step throws', async () => {
  // A mid-way failure must leave a recoverable, still-signed-in account rather than an
  // unreachable orphan whose data survives with nobody able to delete it.
  const db = seedAttender()
  const d = deps(db)
  const exploding = {
    ...d,
    bucket: { deleteFiles: async () => { throw new Error('storage unavailable') } },
  }
  await expect(cascadeDelete(exploding, 'me')).rejects.toThrow('storage unavailable')
  expect(d.auth.deletedUsers).toEqual([])
})

it('hard deletes every message the user authored and nobody elses', async () => {
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  expect(db.store.has('eventChats/e1/messages/m2')).toBe(false)
  expect(db.store.has('conversations/me_you/messages/d1')).toBe(false)
  expect(db.store.has('eventChats/e1/messages/m1')).toBe(true)
})

it('repairs a thread whose last message was the deleted users', async () => {
  // Otherwise the thread keeps showing text whose message document is gone.
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  const chat = db.store.get('eventChats/e1') as Record<string, unknown>
  expect(chat.lastMessageText).toBe('theirs')
  expect(chat.lastMessageAuthor).toBe('Other')
  expect(chat.messageCount).toBe(1)
})

it('clears the snapshot when no message survives in the thread', async () => {
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  const conv = db.store.get('conversations/me_you') as Record<string, unknown>
  expect(conv.lastMessageText).toBe('')
  expect(conv.lastMessageAuthor).toBe('')
  expect(conv.messageCount).toBe(0)
})

it('deletes the registration and decrements that events count', async () => {
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  expect(db.store.has('events/e1/registrations/me')).toBe(false)
  expect((db.store.get('events/e1') as Record<string, unknown>).registeredCount).toBe(3)
})

it('never drives a registered count below zero', async () => {
  // Defensive: a count that has already drifted must not be made nonsensical.
  const db = new FakeFirestore({
    'users/me': { uid: 'me', role: 'attender', registeredEventIds: ['e1'] },
    'events/e1': { title: 'X', venueId: 'host', registeredCount: 0, startsAt: FUTURE },
    'events/e1/registrations/me': { uid: 'me' },
  })
  await cascadeDelete(deps(db), 'me')
  expect((db.store.get('events/e1') as Record<string, unknown>).registeredCount).toBe(0)
})

it('deletes follows where the user is the target as well as the follower', async () => {
  // The client cannot do this half: rules only let the FOLLOWER delete an edge, so an
  // inbound follow would survive a client-side delete and leave a dangling connection.
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  expect(db.store.has('follows/me_you')).toBe(false)
  expect(db.store.has('follows/you_me')).toBe(false)
  expect(db.store.has('follows/other_third')).toBe(true)
})

it('removes the profile, its subcollections and the user doc', async () => {
  const db = seedAttender()
  await cascadeDelete(deps(db), 'me')
  for (const path of [
    'profiles/me',
    'profiles/me/private/socials',
    'profiles/me/redemptions/r1',
    'users/me',
    'users/me/pushTokens/t1',
    'users/me/chatReads/e1',
    'users/me/blocks/bad',
  ]) {
    expect(db.store.has(path)).toBe(false)
  }
})

it('cancels a hosters FUTURE events and leaves past ones alone', async () => {
  // Attendees' history and points would be corrupted by removing an event they genuinely
  // attended; nobody should turn up to a future one with no host.
  const db = new FakeFirestore({
    'users/host': { uid: 'host', role: 'hoster' },
    'venues/host': { name: 'Cellar 9' },
    'events/past': { title: 'Was', venueId: 'host', startsAt: PAST, registeredCount: 2 },
    'events/soon': { title: 'Will be', venueId: 'host', startsAt: FUTURE, registeredCount: 2 },
    'events/theirs': { title: 'Other host', venueId: 'someone', startsAt: FUTURE, registeredCount: 1 },
  })
  await cascadeDelete(deps(db), 'host')
  expect(db.store.has('venues/host')).toBe(false)
  expect((db.store.get('events/soon') as Record<string, unknown>).cancelled).toBe(true)
  expect(db.store.get('events/past')).toEqual(expect.not.objectContaining({ cancelled: true }))
  expect(db.store.has('events/past')).toBe(true)
  expect(db.store.get('events/theirs')).toEqual(expect.not.objectContaining({ cancelled: true }))
})

it('clears all four storage prefixes for the user', async () => {
  const db = seedAttender()
  const d = deps(db)
  await cascadeDelete(d, 'me')
  expect(d.bucket.deleted.sort()).toEqual(STORAGE_PREFIXES.map((p) => p('me')).sort())
})

it('chunks writes at 400', async () => {
  // Firestore's own batch limit, and the number deleteEvent already uses.
  const seed: Record<string, Record<string, unknown>> = {
    'users/me': { uid: 'me', role: 'attender', registeredEventIds: [] },
    'conversations/me_you': { participants: ['me', 'you'], lastMessageText: 'x', lastMessageAuthor: 'Me', messageCount: 900, lastMessageAt: PAST },
  }
  for (let i = 0; i < 900; i++) {
    seed[`conversations/me_you/messages/m${i}`] = { authorUid: 'me', authorName: 'Me', text: 'x', createdAt: PAST }
  }
  const db = new FakeFirestore(seed)
  const report = await cascadeDelete(deps(db), 'me')
  expect(report.messages).toBe(900)
  expect(report.batches).toBeGreaterThanOrEqual(3)
})

it('reports what it removed', async () => {
  const db = seedAttender()
  const report = await cascadeDelete(deps(db), 'me')
  expect(report).toEqual(expect.objectContaining({ messages: 2, registrations: 1, follows: 2, threadsRepaired: 2 }))
})

it('completes for an account with nothing but a user doc', async () => {
  // The account somebody creates and abandons: no profile, no messages, no registrations.
  const db = new FakeFirestore({ 'users/ghost': { uid: 'ghost', role: 'attender' } })
  const d = deps(db)
  await expect(cascadeDelete(d, 'ghost')).resolves.toEqual(
    expect.objectContaining({ messages: 0, registrations: 0, follows: 0 })
  )
  expect(d.auth.deletedUsers).toEqual(['ghost'])
})
