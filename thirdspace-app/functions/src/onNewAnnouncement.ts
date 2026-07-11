import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, pruneDeadTokens } from './recipients'

interface AnnouncementDoc {
  authorUid: string
  authorName: string
  text: string
}

export async function handleNewAnnouncement(db: Firestore, eventId: string, announcement: AnnouncementDoc): Promise<void> {
  const eventSnap = await db.doc(`events/${eventId}`).get()
  const title = (eventSnap.get('title') as string | undefined) ?? 'Event'

  const regsSnap = await db.collection(`events/${eventId}/registrations`).get()
  const uids = regsSnap.docs.map((d) => d.id).filter((uid) => uid !== announcement.authorUid)

  const targets = await activeTokensFor(db, uids)
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title: `📣 ${title}`,
    body: truncateBody(announcement.text || ''),
    data: { type: 'announcement', eventId },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewAnnouncement = onDocumentCreated('events/{eventId}/announcements/{announcementId}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewAnnouncement(getFirestore(), event.params.eventId, snap.data() as AnnouncementDoc)
})
