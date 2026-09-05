/**
 * An in-memory Firestore double, enough for the deletion cascade.
 *
 * The other function tests hand-roll a stub per test (see onNewFollow.test.ts), which is
 * right when a function touches one document. The cascade touches eight collections, two
 * collection groups and a batch, so a shared double earns its keep — and a fake rather
 * than the emulator keeps `cd functions && npx jest` a plain unit run with no Java and no
 * ports.
 *
 * It is deliberately not a Firestore: no transactions, no ordering guarantees beyond
 * insertion, no field transforms except the increment sentinel it stores verbatim. If a
 * behaviour the cascade depends on cannot be expressed here, that is a signal to check it
 * against the emulator by hand rather than to grow this file.
 */

export interface FakeDoc {
  id: string
  ref: { path: string; id: string }
  exists: boolean
  data: () => Record<string, unknown> | undefined
  get: (field: string) => unknown
}

type Store = Map<string, Record<string, unknown>>

function parent(path: string): string {
  return path.split('/').slice(0, -1).join('/')
}

function collectionName(path: string): string {
  const segments = path.split('/')
  // A collection path has an odd segment count; a document path an even one. The
  // collection a document belongs to is its second-to-last segment.
  return segments[segments.length - 2]
}

export class FakeFirestore {
  readonly store: Store = new Map()
  /** Every write, in order, so a test can assert what happened and in what sequence. */
  readonly writes: { op: 'set' | 'update' | 'delete'; path: string; data?: Record<string, unknown> }[] = []

  constructor(seed: Record<string, Record<string, unknown>> = {}) {
    for (const [path, data] of Object.entries(seed)) this.store.set(path, data)
  }

  private snapshot(path: string): FakeDoc {
    const data = this.store.get(path)
    return {
      id: path.split('/').pop() as string,
      ref: { path, id: path.split('/').pop() as string },
      exists: data !== undefined,
      data: () => data,
      get: (field: string) => data?.[field],
    }
  }

  doc(path: string) {
    return {
      path,
      id: path.split('/').pop() as string,
      get: async () => this.snapshot(path),
      set: async (data: Record<string, unknown>) => {
        this.store.set(path, data)
        this.writes.push({ op: 'set', path, data })
      },
      update: async (data: Record<string, unknown>) => {
        this.store.set(path, { ...(this.store.get(path) ?? {}), ...data })
        this.writes.push({ op: 'update', path, data })
      },
      delete: async () => {
        this.store.delete(path)
        this.writes.push({ op: 'delete', path })
      },
    }
  }

  private query(matches: (path: string, data: Record<string, unknown>) => boolean) {
    const run = () => {
      const docs: FakeDoc[] = []
      for (const [path, data] of this.store) if (matches(path, data)) docs.push(this.snapshot(path))
      return { docs, empty: docs.length === 0, size: docs.length }
    }
    const builder = {
      where: (field: string, _op: string, value: unknown) =>
        this.query((path, data) => matches(path, data) && data[field] === value),
      orderBy: () => builder,
      limit: (n: number) => ({ get: async () => ({ ...run(), docs: run().docs.slice(0, n) }) }),
      get: async () => run(),
    }
    return builder
  }

  collection(path: string) {
    const asQuery = this.query((docPath) => parent(docPath) === path)
    return {
      ...asQuery,
      doc: (id: string) => this.doc(`${path}/${id}`),
      add: async (data: Record<string, unknown>) => {
        const id = `auto${this.store.size + 1}`
        await this.doc(`${path}/${id}`).set(data)
        return { id }
      },
    }
  }

  collectionGroup(name: string) {
    return this.query((docPath) => collectionName(docPath) === name)
  }

  batch() {
    const ops: (() => Promise<void>)[] = []
    return {
      set: (ref: { path: string }, data: Record<string, unknown>) => {
        ops.push(() => this.doc(ref.path).set(data))
      },
      update: (ref: { path: string }, data: Record<string, unknown>) => {
        ops.push(() => this.doc(ref.path).update(data))
      },
      delete: (ref: { path: string }) => {
        ops.push(() => this.doc(ref.path).delete())
      },
      commit: async () => {
        for (const op of ops) await op()
      },
      get length() {
        return ops.length
      },
    }
  }

  /** Paths currently stored, for assertions like "nothing under profiles/me survives". */
  paths(): string[] {
    return [...this.store.keys()].sort()
  }
}

export function fakeBucket() {
  const deleted: string[] = []
  return {
    deleted,
    deleteFiles: async ({ prefix }: { prefix: string }) => {
      deleted.push(prefix)
    },
  }
}

export function fakeAuth() {
  const deletedUsers: string[] = []
  return {
    deletedUsers,
    deleteUser: async (uid: string) => {
      deletedUsers.push(uid)
    },
  }
}
