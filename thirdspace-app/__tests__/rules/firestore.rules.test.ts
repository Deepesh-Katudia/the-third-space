import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { collection, deleteDoc, doc, getDoc, getDocs, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { readFileSync } from 'fs'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'thirdspace-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(async () => env.cleanup())
beforeEach(async () => env.clearFirestore())

test('any signed-in user can read another profile', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/other'), { displayName: 'Maya', points: 0 })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/other')))
})

test('a user cannot write another user profile', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'profiles/other'), { displayName: 'x' }))
})

test('phoneIndex is never readable or writable by clients, even the owner', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'phoneIndex/+12125551234'), { uid: 'me', email: 'me@example.com' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'phoneIndex/+12125551234')))
  await assertFails(setDoc(doc(me, 'phoneIndex/+19995551234'), { uid: 'me', email: 'me@example.com' }))
})

test('owner can update points/tier together with a valid earn/revoke delta', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { bio: 'updated' }))
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { points: 50, tier: 'Newcomer' }))
})

test('owner cannot set points to an arbitrary value or mismatch tier', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 9999, tier: 'Insider' }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 50, tier: 'Insider' }))
})

test('owner can set verified + verifiedAt; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { verified: true, verifiedAt: new Date() }))
  await assertFails(updateDoc(doc(stranger, 'profiles/me'), { verified: true }))
})

test('owner can create their own redemption log entry; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 500, tier: 'Regular', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(setDoc(doc(me, 'profiles/me/redemptions/r1'), { rewardId: 'rw1', label: 'Free drink', cost: 500 }))
  await assertFails(setDoc(doc(stranger, 'profiles/me/redemptions/r2'), { rewardId: 'rw1', label: 'Free drink', cost: 500 }))
})

test('co-attendee can read the registration list; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'events/e1'), { venueId: 'host', registeredCount: 2 })
    await setDoc(doc(fs, 'events/e1/registrations/me'), { displayName: 'Me' })
    await setDoc(doc(fs, 'events/e1/registrations/you'), { displayName: 'You' })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(getDoc(doc(me, 'events/e1/registrations/you')))
  await assertFails(getDoc(doc(stranger, 'events/e1/registrations/you')))
})

test('an attender can increment registeredCount only by registering themselves in the same batch', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'events/e1'), { venueId: 'host', registeredCount: 0 })
  })
  const me = env.authenticatedContext('me').firestore()
  const batch = writeBatch(me)
  batch.set(doc(me, 'events/e1/registrations/me'), { displayName: 'Me' })
  batch.update(doc(me, 'events/e1'), { registeredCount: increment(1) })
  await assertSucceeds(batch.commit())
})

test('a user cannot inflate registeredCount without creating their registration', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'events/e1'), { venueId: 'host', registeredCount: 0 })
  })
  const me = env.authenticatedContext('me').firestore()
  // Bare counter bump with no matching registration write.
  await assertFails(updateDoc(doc(me, 'events/e1'), { registeredCount: increment(1) }))
  // Even a big jump is rejected — the delta must be exactly +1.
  await assertFails(updateDoc(doc(me, 'events/e1'), { registeredCount: 999 }))
})

test('an already-registered user cannot increment the count again without re-registering', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'events/e1'), { venueId: 'host', registeredCount: 1 })
    await setDoc(doc(fs, 'events/e1/registrations/me'), { displayName: 'Me' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'events/e1'), { registeredCount: increment(1) }))
})

test('an attender can decrement registeredCount by cancelling their own registration in the same batch', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'events/e1'), { venueId: 'host', registeredCount: 1 })
    await setDoc(doc(fs, 'events/e1/registrations/me'), { displayName: 'Me' })
  })
  const me = env.authenticatedContext('me').firestore()
  const batch = writeBatch(me)
  batch.delete(doc(me, 'events/e1/registrations/me'))
  batch.update(doc(me, 'events/e1'), { registeredCount: increment(-1) })
  await assertSucceeds(batch.commit())
})

test('a user cannot decrement registeredCount without removing their registration', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    await setDoc(doc(fs, 'events/e1'), { venueId: 'host', registeredCount: 1 })
    await setDoc(doc(fs, 'events/e1/registrations/me'), { displayName: 'Me' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'events/e1'), { registeredCount: increment(-1) }))
})

test('the event owner can still update other event fields freely', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'events/e1'), { venueId: 'host', registeredCount: 3, cancelled: false })
  })
  const host = env.authenticatedContext('host').firestore()
  await assertSucceeds(updateDoc(doc(host, 'events/e1'), { cancelled: true }))
})

test('a user can create their own follow edge with a matching id', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'follows/me_you'), { follower: 'me', target: 'you' }))
})

test('a user cannot forge a follow from someone else or mismatch the doc id', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/you_me'), { follower: 'you', target: 'me' }))
  await assertFails(setDoc(doc(me, 'follows/me_you'), { follower: 'me', target: 'someoneelse' }))
})

test('a user cannot follow themselves', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/me_me'), { follower: 'me', target: 'me' }))
})

test('a user can delete their own follow edge; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'follows/me_you'), { follower: 'me', target: 'you' })
  })
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertFails(deleteDoc(doc(stranger, 'follows/me_you')))
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(deleteDoc(doc(me, 'follows/me_you')))
})

test('any signed-in user can read follow edges', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'follows/me_you'), { follower: 'me', target: 'you' })
  })
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(getDoc(doc(stranger, 'follows/me_you')))
})

// ── Conversations (DM request flow) ─────────────────────────────────────────
test('a participant can probe a conversation that does not exist yet', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'conversations/me_you')))
})

test('a participant can create a pending request then send the first message', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'conversations/me_you'), {
    participants: ['me', 'you'], status: 'pending', requestedBy: 'me', messageCount: 1,
  }))
  await assertSucceeds(setDoc(doc(me, 'conversations/me_you/messages/m1'), { authorUid: 'me', text: 'hi' }))
})

test('a non-participant cannot read a conversation', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations/me_you'), {
      participants: ['me', 'you'], status: 'pending', requestedBy: 'me',
    })
  })
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertFails(getDoc(doc(stranger, 'conversations/me_you')))
})

// ── Profile socials (mutual-follow gated) ───────────────────────────────────
// Socials live at profiles/{uid}/private/socials specifically so the read can be
// gated. The one-way-follower case below is the whole point: it is the difference
// between "connections" and "anyone who follows you", and a naive single-exists()
// rule gets it wrong.
async function seedSocials(env: RulesTestEnvironment, uid: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `profiles/${uid}/private/socials`), { instagram: 'maya' })
  })
}

async function seedFollow(env: RulesTestEnvironment, follower: string, target: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `follows/${follower}_${target}`), { follower, target })
  })
}

test('owner can read their own socials', async () => {
  await seedSocials(env, 'me')
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/me/private/socials')))
})

test('a mutual follow can read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'me', 'other')
  await seedFollow(env, 'other', 'me')
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a one-way follower CANNOT read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'me', 'other') // I follow them; they do not follow back
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a followed-by-only user CANNOT read socials', async () => {
  await seedSocials(env, 'other')
  await seedFollow(env, 'other', 'me') // they follow me; I do not follow back
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('a stranger cannot read socials', async () => {
  await seedSocials(env, 'other')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/other/private/socials')))
})

test('only the owner can write socials, and only the three known keys', async () => {
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'maya', x: 'maya' }))
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), {}))
  await assertFails(setDoc(doc(stranger, 'profiles/me/private/socials'), { instagram: 'evil' }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'maya', payload: 'x'.repeat(100) }))
})

// The above key-name test reads like a size test but the 'x'.repeat(100) is doing no
// work there — it fails on the key NAME 'payload', not the length. These test the value
// bound itself: type, size, and the empty-string-is-not-a-valid-value rule.
test('socials values are bounded by type and per-platform length', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'x'.repeat(31) }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { x: 'x'.repeat(16) }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: { nested: 'map' } }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: '' }))
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'x'.repeat(30) }))
  // Character set, matching utils/socials.ts exactly — a client bypassing the SDK
  // validation should never be able to store an unusable/broken-link handle.
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'has space' }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { instagram: 'Caps' }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { x: 'has.dot' }))
  await assertFails(setDoc(doc(me, 'profiles/me/private/socials'), { tiktok: 'a' }))
  await assertSucceeds(setDoc(doc(me, 'profiles/me/private/socials'), { tiktok: 'ab' }))
})

test('an unauthenticated client cannot read socials', async () => {
  await seedSocials(env, 'other')
  const anon = env.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(anon, 'profiles/other/private/socials')))
})

test('the private subcollection does not over-grant beyond the socials doc', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me/private/somethingElse'), { a: 1 })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'profiles/me/private/somethingElse')))
})

// ── users/{uid}: role is write-once ────────────────────────────────────────
// Role switching was removed from the app (there is no longer any screen that
// rewrites `role`), but the UI is not the enforcement — these rules are. The doc
// still takes ordinary updates from setPushEnabled, the birthdate write and the
// registeredEventIds counters, so this cannot simply forbid updates.
test('owner can set role when creating their own user doc', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'users/me'), { uid: 'me', role: 'attender' }))
})

test('owner cannot change role once it is set', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', role: 'attender' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'users/me'), { role: 'hoster' }))
})

test('owner can update other fields while re-sending an unchanged role', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', role: 'attender' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'users/me'), { role: 'attender', displayName: 'Me' }, { merge: true }))
})

test('owner can update fields that do not touch role', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', role: 'attender' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(updateDoc(doc(me, 'users/me'), { pushEnabled: true, registeredEventIds: ['e1'] }))
})

test('owner can set role on a user doc that does not have one yet', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', pushEnabled: true })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'users/me'), { role: 'attender' }, { merge: true }))
})

test('owner cannot delete their user doc, which would reset role', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', role: 'attender' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(deleteDoc(doc(me, 'users/me')))
})

test('a stranger cannot write another user doc', async () => {
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertFails(setDoc(doc(stranger, 'users/me'), { uid: 'me', role: 'hoster' }))
})

// ── users/{uid}/blocks: private, and unenumerable by the blocked party ─────
// The privacy property IS the feature: if the blocked party could read this, a block
// would become a notification, which is exactly what stops people using one. It stays
// enforceable anyway because exists() inside a rule bypasses read rules, so the write
// gates below still work without anybody being able to list them.
test('owner can block, list and unblock', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'users/me/blocks/them'), { createdAt: new Date() }))
  await assertSucceeds(getDocs(collection(me, 'users/me/blocks')))
  await assertSucceeds(deleteDoc(doc(me, 'users/me/blocks/them')))
})

test('nobody can read who has blocked them', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me/blocks/them'), { createdAt: new Date() })
  })
  const them = env.authenticatedContext('them').firestore()
  await assertFails(getDoc(doc(them, 'users/me/blocks/them')))
  await assertFails(getDocs(collection(them, 'users/me/blocks')))
})

test('a third party can neither read nor write a block list they do not own', async () => {
  const other = env.authenticatedContext('other').firestore()
  await assertFails(setDoc(doc(other, 'users/me/blocks/them'), { createdAt: new Date() }))
  await assertFails(getDoc(doc(other, 'users/me/blocks/them')))
})

// -- Blocking gates the write paths, symmetrically -------------------------
// Symmetric on writes so neither party can reach the other; asymmetric on reads, which
// is handled client-side. Each direction is a separate exists() in the rule, so each
// direction gets its own test -- one direction only ever proves a one-way relationship,
// the same reason the socials tests cover each way separately.
async function seedBlock(blocker: string, blocked: string) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), `users/${blocker}/blocks/${blocked}`), { createdAt: new Date() })
  })
}

const convBody = (a: string, b: string, requestedBy: string) => ({
  participants: [a, b],
  names: {},
  photos: {},
  status: 'pending',
  requestedBy,
  lastMessageText: 'hi',
  lastMessageAt: new Date(),
  lastMessageAuthor: 'A',
  messageCount: 1,
})

test('the blocker cannot open a DM with the person they blocked', async () => {
  await seedBlock('me', 'them')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'conversations/me_them'), convBody('me', 'them', 'me')))
})

test('the blocked party cannot open a DM with the blocker', async () => {
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(setDoc(doc(them, 'conversations/me_them'), convBody('me', 'them', 'them')))
})

test('an unrelated pair can still open a DM', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'conversations/me_other'), convBody('me', 'other', 'me')))
})

test('an existing thread goes cold once a block lands', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations/me_them'), {
      ...convBody('me', 'them', 'them'),
      status: 'open',
    })
  })
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(
    setDoc(doc(them, 'conversations/me_them/messages/m1'), {
      authorUid: 'them',
      authorName: 'Them',
      authorPhotoURL: null,
      text: 'still here',
      createdAt: new Date(),
    })
  )
})

test('an open thread between unblocked participants still takes messages', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'conversations/me_other'), {
      ...convBody('me', 'other', 'other'),
      status: 'open',
    })
  })
  const other = env.authenticatedContext('other').firestore()
  await assertSucceeds(
    setDoc(doc(other, 'conversations/me_other/messages/m1'), {
      authorUid: 'other',
      authorName: 'Other',
      authorPhotoURL: null,
      text: 'hello',
      createdAt: new Date(),
    })
  )
})

test('the blocked party cannot follow the blocker', async () => {
  await seedBlock('me', 'them')
  const them = env.authenticatedContext('them').firestore()
  await assertFails(setDoc(doc(them, 'follows/them_me'), { follower: 'them', target: 'me', createdAt: new Date() }))
})

test('the blocker cannot follow the person they blocked', async () => {
  await seedBlock('me', 'them')
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'follows/me_them'), { follower: 'me', target: 'them', createdAt: new Date() }))
})

test('following an unrelated member still works', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'follows/me_other'), { follower: 'me', target: 'other', createdAt: new Date() }))
})

// -- reports: create-only, and unreadable by everyone ----------------------
// A report is an accusation about a third party. Making it client-readable would leak who
// reported whom, so it is written blind and read only through the console or the Admin
// SDK, both of which bypass rules. That is also why nobody can update or delete one --
// not even its author, who could otherwise retract an accusation after it was acted on.
const reportBody = (reporterUid: string) => ({
  reporterUid,
  kind: 'user',
  targetUid: 'them',
  reason: 'harassment',
  createdAt: new Date(),
})

test('a signed-in member can file a report as themselves', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(setDoc(doc(me, 'reports/r1'), reportBody('me')))
})

test('a member cannot file a report in somebody elses name', async () => {
  const me = env.authenticatedContext('me').firestore()
  await assertFails(setDoc(doc(me, 'reports/r2'), reportBody('someone-else')))
})

test('a signed-out visitor cannot file a report at all', async () => {
  const anon = env.unauthenticatedContext().firestore()
  await assertFails(setDoc(doc(anon, 'reports/r3'), reportBody('me')))
})

test('nobody can read, update or delete a report -- not even its author', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'reports/r4'), reportBody('me'))
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(getDoc(doc(me, 'reports/r4')))
  await assertFails(getDocs(collection(me, 'reports')))
  await assertFails(updateDoc(doc(me, 'reports/r4'), { reason: 'spam' }))
  await assertFails(deleteDoc(doc(me, 'reports/r4')))
})

test('owner can stamp terms acceptance without tripping the write-once role rule', async () => {
  // The two features meet here: acceptance is merged onto users/{uid}, which is the doc
  // whose `role` field can never change. A merge that leaves role alone must pass.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users/me'), { uid: 'me', role: 'attender' })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertSucceeds(
    setDoc(doc(me, 'users/me'), { termsAcceptedAt: new Date(), termsVersion: '2026-09-05' }, { merge: true })
  )
})
