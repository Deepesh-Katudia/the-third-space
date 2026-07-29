import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
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
