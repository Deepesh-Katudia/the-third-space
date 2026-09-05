import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'

/**
 * Turns a new report into something a human actually receives.
 *
 * This is what makes Apple's "timely responses to concerns" clause operable: the
 * requirement is a company process, not a database table, and a queue nobody is told about
 * is never read.
 *
 * It writes to `mail/{autoId}` in the shape the official *Trigger Email from Firestore*
 * extension consumes, rather than calling an email provider directly. No provider or
 * credential exists in this project, and inventing one would be a fake — this way the
 * contract ("a report becomes a notification") is real and testable today, and installing
 * the extension is a deployment step. Swapping this write for a provider API call later
 * touches one function and no callers.
 */
export const SUPPORT_EMAIL = 'support@yourthirdspace.app'

export interface ReportDoc {
  reporterUid: string
  kind: 'user' | 'message' | 'event'
  targetUid: string
  reason: string
  threadId?: string
  messageId?: string
  eventId?: string
  details?: string
}

/**
 * Only the fields that are actually present. A support queue is read by a person, and
 * "threadId: undefined" is the kind of detail that makes somebody stop trusting the whole
 * message.
 */
function describe(report: ReportDoc): string {
  const lines = [
    `Kind:      ${report.kind}`,
    `Reason:    ${report.reason}`,
    `Reporter:  ${report.reporterUid}`,
    `About:     ${report.targetUid}`,
  ]
  if (report.threadId) lines.push(`Thread:    ${report.threadId}`)
  if (report.messageId) lines.push(`Message:   ${report.messageId}`)
  if (report.eventId) lines.push(`Event:     ${report.eventId}`)
  if (report.details) lines.push('', 'Details from the reporter:', report.details)
  lines.push(
    '',
    'Reports are not readable from the app by anyone, including their author.',
    'Open the reports collection in the Firebase console to act on this one.'
  )
  return lines.join('\n')
}

export async function handleReportCreated(db: Firestore, report: ReportDoc): Promise<void> {
  await db.collection('mail').add({
    to: [SUPPORT_EMAIL],
    message: {
      subject: `[Report] ${report.kind} — ${report.reason}`,
      text: describe(report),
    },
  })
}

export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const data = event.data?.data()
  // A trigger with no snapshot means the document was already gone. Nothing to notify
  // about, and throwing here would retry forever.
  if (!data) return
  await handleReportCreated(getFirestore(), data as ReportDoc)
})
