import { Firestore } from 'firebase-admin/firestore'
import { activeTokensFor, isThreadMuted, isMutualFollow, pruneDeadTokens } from './recipients'

interface FakeData {
  users?: Record<string, { pushEnabled?: boolean }>
  tokens?: Record<string, string[]>   // uid -> token doc ids
  mutes?: Record<string, boolean>     // "uid/convId" -> muted
  follows?: Set<string>               // present follow doc ids
}

function fakeDb(data: FakeData, deleted: string[] = []) {
  return {
    doc: (path: string) => ({
      get: async () => {
        const parts = path.split('/')
        if (parts[0] === 'users' && parts.length === 2) {
          const u = data.users?.[parts[1]]
          return { exists: !!u, get: (f: string) => (u ? (u as Record<string, unknown>)[f] : undefined) }
        }
        if (parts[0] === 'users' && parts[2] === 'chatReads') {
          const muted = data.mutes?.[`${parts[1]}/${parts[3]}`]
          return { exists: muted !== undefined, get: () => muted }
        }
        if (parts[0] === 'follows') {
          return { exists: !!data.follows?.has(parts[1]), get: () => undefined }
        }
        return { exists: false, get: () => undefined }
      },
      delete: async () => { deleted.push(path) },
    }),
    collection: (path: string) => ({
      get: async () => {
        const uid = path.split('/')[1]
        const toks = data.tokens?.[uid] ?? []
        return { docs: toks.map((id) => ({ id })) }
      },
    }),
  } as unknown as Firestore
}

describe('activeTokensFor', () => {
  it('skips users with pushEnabled=false and expands tokens for the rest', async () => {
    const db = fakeDb({
      users: { a: {}, b: { pushEnabled: false }, c: { pushEnabled: true } },
      tokens: { a: ['t_a1', 't_a2'], b: ['t_b'], c: ['t_c'] },
    })
    const targets = await activeTokensFor(db, ['a', 'b', 'c'])
    expect(targets).toEqual([
      { uid: 'a', token: 't_a1' },
      { uid: 'a', token: 't_a2' },
      { uid: 'c', token: 't_c' },
    ])
  })
})

describe('isThreadMuted', () => {
  it('is true only when the read doc marks the thread muted', async () => {
    const db = fakeDb({ mutes: { 'u/conv1': true, 'u/conv2': false } })
    expect(await isThreadMuted(db, 'u', 'conv1')).toBe(true)
    expect(await isThreadMuted(db, 'u', 'conv2')).toBe(false)
    expect(await isThreadMuted(db, 'u', 'conv3')).toBe(false)
  })
})

describe('isMutualFollow', () => {
  it('detects the reverse follow document', async () => {
    const db = fakeDb({ follows: new Set(['target_follower']) })
    expect(await isMutualFollow(db, 'follower', 'target')).toBe(true)
    expect(await isMutualFollow(db, 'nobody', 'target')).toBe(false)
  })
})

describe('pruneDeadTokens', () => {
  it('deletes only the dead token docs', async () => {
    const deleted: string[] = []
    const db = fakeDb({}, deleted)
    await pruneDeadTokens(
      db,
      [{ uid: 'a', token: 't1' }, { uid: 'a', token: 't2' }, { uid: 'b', token: 't3' }],
      ['t2', 't3']
    )
    expect(deleted.sort()).toEqual(['users/a/pushTokens/t2', 'users/b/pushTokens/t3'])
  })
})
