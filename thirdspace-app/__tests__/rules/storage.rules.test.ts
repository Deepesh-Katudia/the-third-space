import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage'
import { readFileSync } from 'fs'

let env: RulesTestEnvironment

/** A byte payload of an exact size, so the caps can be probed on both sides. */
function bytes(size: number): Uint8Array {
  return new Uint8Array(size)
}

const IMAGE = { contentType: 'image/jpeg' }
const VIDEO = { contentType: 'video/mp4' }

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'thirdspace-storage-rules-test',
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})
afterAll(async () => env.cleanup())
beforeEach(async () => env.clearStorage())

test('a signed-in member can read another member profile photo', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE)
  })
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(getBytes(ref(me, 'profilePhotos/other/avatar.jpg')))
})

test('an anonymous visitor can read nothing', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE)
  })
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'profilePhotos/other/avatar.jpg')))
})

test('a member writes their own avatar but not somebody else\'s', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/avatar.jpg'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE))
})

test('the avatar slot refuses video, because an avatar is always an image', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/avatar.jpg'), bytes(10), VIDEO))
})

test('a vibe slot accepts both an image and a video', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0'), bytes(10), IMAGE))
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe2'), bytes(10), VIDEO))
})

test('a vibe poster must be an image, never a video', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0_thumb'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe0_thumb'), bytes(10), VIDEO))
})

test('the prefix is not an open bucket — only the named slots are writable', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe9'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/anything.zip'), bytes(10), IMAGE))
})

test('the image cap is a strict inequality: one byte under passes, the ceiling itself fails', async () => {
  const me = env.authenticatedContext('me').storage()
  const CAP = 5 * 1024 * 1024
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0'), bytes(CAP - 1), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe1'), bytes(CAP), IMAGE))
})

test('a hoster writes a cover under their own uid, and nobody else can', async () => {
  const host = env.authenticatedContext('host').storage()
  const other = env.authenticatedContext('other').storage()
  await assertSucceeds(uploadBytes(ref(host, 'eventCovers/host/e1/cover'), bytes(10), VIDEO))
  await assertSucceeds(uploadBytes(ref(host, 'eventCovers/host/e1/cover_thumb'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(other, 'eventCovers/host/e1/cover'), bytes(10), IMAGE))
})

test('venue slots are bounded to 0-5', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'venuePhotos/me/5'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'venuePhotos/me/6'), bytes(10), IMAGE))
})

test('chat media is writable only by its author', async () => {
  const me = env.authenticatedContext('me').storage()
  const other = env.authenticatedContext('other').storage()
  await assertSucceeds(uploadBytes(ref(me, 'chatMedia/me/t1/msg1'), bytes(10), VIDEO))
  await assertFails(uploadBytes(ref(other, 'chatMedia/me/t1/msg1'), bytes(10), IMAGE))
})

test('chat media is READABLE by any signed-in member — this is the known limitation', async () => {
  // Storage rules cannot get() a Firestore document, so a DM attachment cannot be
  // gated on conversation membership. It is protected by an unguessable download
  // token, not by this rule. Asserted so the trade-off is visible, not accidental.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'chatMedia/someone/t1/msg1'), bytes(10), IMAGE)
  })
  const stranger = env.authenticatedContext('stranger').storage()
  await assertSucceeds(getBytes(ref(stranger, 'chatMedia/someone/t1/msg1')))
})

test('delete is allowed for the owner without a contentType on the request', async () => {
  // On delete there is no request.resource. If create/update and delete were not
  // split, validMedia() would raise an evaluation error rather than returning false.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/me/vibe0'), bytes(10), IMAGE)
  })
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(deleteObject(ref(me, 'profilePhotos/me/vibe0')))
})

test('delete is refused for a non-owner', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/me/vibe0'), bytes(10), IMAGE)
  })
  const other = env.authenticatedContext('other').storage()
  await assertFails(deleteObject(ref(other, 'profilePhotos/me/vibe0')))
})
