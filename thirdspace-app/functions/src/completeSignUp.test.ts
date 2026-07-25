import { claimPhoneNumber } from './completeSignUp'

function fakeDb(initial: Record<string, any> = {}) {
  const store: Record<string, any> = { ...initial }
  const doc = (path: string) => ({ __path: path })
  const runTransaction = async (fn: (tx: any) => Promise<void>) => {
    const tx = {
      get: async (ref: { __path: string }) => ({
        exists: ref.__path in store,
        data: () => store[ref.__path],
      }),
      set: (ref: { __path: string }, data: any, opts?: { merge?: boolean }) => {
        store[ref.__path] = opts?.merge ? { ...(store[ref.__path] ?? {}), ...data } : data
      },
    }
    await fn(tx)
  }
  return { doc, runTransaction, store } as any
}

it('claims the phone number and writes users/{uid}.phoneNumber', async () => {
  const db = fakeDb()

  await claimPhoneNumber(db, 'uid1', 'sam@example.com', '+12125551234')

  expect(db.store['phoneIndex/+12125551234']).toEqual({ uid: 'uid1', email: 'sam@example.com' })
  expect(db.store['users/uid1']).toEqual({ uid: 'uid1', email: 'sam@example.com', phoneNumber: '+12125551234' })
})

it('merges into an existing users/{uid} doc instead of overwriting it', async () => {
  const db = fakeDb({ 'users/uid1': { role: 'attender' } })

  await claimPhoneNumber(db, 'uid1', 'sam@example.com', '+12125551234')

  expect(db.store['users/uid1']).toEqual({
    role: 'attender',
    uid: 'uid1',
    email: 'sam@example.com',
    phoneNumber: '+12125551234',
  })
})

it('rejects a phone number that is already claimed', async () => {
  const db = fakeDb({ 'phoneIndex/+12125551234': { uid: 'other', email: 'other@example.com' } })

  await expect(claimPhoneNumber(db, 'uid1', 'sam@example.com', '+12125551234')).rejects.toMatchObject({
    code: 'already-exists',
  })
})

it('rejects a malformed phone number', async () => {
  const db = fakeDb()

  await expect(claimPhoneNumber(db, 'uid1', 'sam@example.com', '2125551234')).rejects.toMatchObject({
    code: 'invalid-argument',
  })
})
