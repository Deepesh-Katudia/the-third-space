import { handleReportCreated, SUPPORT_EMAIL, type ReportDoc } from './onReportCreated'

// Collects what would be written to the mail collection. The existing function tests use
// hand-rolled fakes per test (see onNewFollow.test.ts); this one needs only `add`.
let added: Record<string, unknown>[] = []

const fakeDb = {
  collection: (path: string) => ({
    add: async (data: Record<string, unknown>) => {
      if (path !== 'mail') throw new Error(`unexpected collection ${path}`)
      added.push(data)
      return { id: 'mail1' }
    },
  }),
} as never

const report = (over: Partial<ReportDoc> = {}): ReportDoc => ({
  reporterUid: 'maya',
  kind: 'user',
  targetUid: 'sam',
  reason: 'harassment',
  ...over,
})

beforeEach(() => {
  added = []
})

it('writes one mail document to the support address', async () => {
  await handleReportCreated(fakeDb, report())
  expect(added).toHaveLength(1)
  expect(added[0].to).toEqual([SUPPORT_EMAIL])
})

it('puts the kind and reason in the subject, so a queue can be triaged unopened', async () => {
  await handleReportCreated(fakeDb, report({ kind: 'message', reason: 'hate' }))
  expect((added[0].message as { subject: string }).subject).toBe('[Report] message — hate')
})

it('names the reporter, the target and every id needed to find the content', async () => {
  await handleReportCreated(
    fakeDb,
    report({ kind: 'message', threadId: 'maya_sam', messageId: 'm1', details: 'kept messaging me' })
  )
  const text = (added[0].message as { text: string }).text
  expect(text).toContain('maya')
  expect(text).toContain('sam')
  expect(text).toContain('maya_sam')
  expect(text).toContain('m1')
  expect(text).toContain('kept messaging me')
})

it('never writes the word undefined for an absent optional field', async () => {
  // A support queue is read by a human. "threadId: undefined" is the kind of thing that
  // makes somebody stop trusting the whole message.
  await handleReportCreated(fakeDb, report())
  const text = (added[0].message as { text: string }).text
  expect(text).not.toContain('undefined')
  expect(text).not.toContain('null')
})

it('includes the event id for an event report', async () => {
  await handleReportCreated(fakeDb, report({ kind: 'event', eventId: 'e1', reason: 'spam' }))
  expect((added[0].message as { text: string }).text).toContain('e1')
})

it('still sends when the reason is one it has no special copy for', async () => {
  await handleReportCreated(fakeDb, report({ reason: 'other' }))
  expect(added).toHaveLength(1)
})
