import { lookupEmailForPhone } from './resolveEmailForPhone'

function fakeDb(initial: Record<string, any> = {}) {
  const store: Record<string, any> = { ...initial }
  const doc = (path: string) => ({
    get: async () => ({
      exists: path in store,
      get: (f: string) => store[path]?.[f],
    }),
  })
  return { doc } as any
}

it('resolves the email for a claimed phone number', async () => {
  const db = fakeDb({ 'phoneIndex/+12125551234': { uid: 'uid1', email: 'sam@example.com' } })

  await expect(lookupEmailForPhone(db, '+12125551234')).resolves.toBe('sam@example.com')
})

it('throws not-found for an unclaimed phone number', async () => {
  const db = fakeDb()

  await expect(lookupEmailForPhone(db, '+19995551234')).rejects.toMatchObject({ code: 'not-found' })
})
