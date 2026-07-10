import { onSnapshot } from 'firebase/firestore'
import { subscribeEventMessages } from '../../services/chat'

jest.mock('../../firebase/config', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  collection: (_db: unknown, ...segments: string[]) => ({ path: segments.join('/') }),
  query: (col: unknown, ...constraints: unknown[]) => ({ col, constraints }),
  orderBy: (field: string, dir: string) => ({ field, dir }),
  limit: (n: number) => ({ limit: n }),
  onSnapshot: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

it('maps a message kind through subscribeEventMessages', () => {
  let handler: (snap: { docs: { id: string; data: () => Record<string, unknown> }[] }) => void = () => {}
  ;(onSnapshot as jest.Mock).mockImplementation((_q, fn) => { handler = fn; return jest.fn() })
  const onChange = jest.fn()

  subscribeEventMessages('evt1', onChange, jest.fn())

  handler({ docs: [
    { id: 'm1', data: () => ({ authorUid: 'u', authorName: 'A', text: 'hey', createdAt: null }) },
    { id: 'm2', data: () => ({ authorUid: 'h', authorName: 'Host', text: 'Doors at 6', createdAt: null, kind: 'announcement' }) },
  ] })

  // subscribeEventMessages reverses the desc-ordered docs, so the input
  // [m1(group), m2(announcement)] is emitted as [m2(announcement), m1(group)].
  const emitted = onChange.mock.calls[0][0]
  expect(emitted[0].kind).toBe('announcement')
  expect(emitted[1].kind).toBe('group')
})
