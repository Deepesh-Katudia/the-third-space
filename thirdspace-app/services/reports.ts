import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { ReportKind, ReportReason } from '../types/models'

/**
 * The only writer of `reports`. There is deliberately no reader: firestore.rules denies
 * every read, so a report is written blind and handled through the console, the Admin SDK,
 * or the notification `onReportCreated` sends.
 */
export interface SubmitReportInput {
  reporterUid: string
  kind: ReportKind
  targetUid: string
  reason: ReportReason
  threadId?: string
  messageId?: string
  eventId?: string
  details?: string
}

export async function submitReport(input: SubmitReportInput): Promise<void> {
  // Optional keys are SPREAD in rather than assigned: Firestore rejects an explicit
  // undefined, and the ids are optional precisely because a user report has no thread.
  await addDoc(collection(db, 'reports'), {
    reporterUid: input.reporterUid,
    kind: input.kind,
    targetUid: input.targetUid,
    reason: input.reason,
    ...(input.threadId ? { threadId: input.threadId } : {}),
    ...(input.messageId ? { messageId: input.messageId } : {}),
    ...(input.eventId ? { eventId: input.eventId } : {}),
    ...(input.details && input.details.trim() ? { details: input.details.trim() } : {}),
    createdAt: serverTimestamp(),
  })
}
