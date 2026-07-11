import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, isThreadMuted, pruneDeadTokens } from './recipients'

interface DirectMessageDoc {
  authorUid: string
  authorName: string
  text: string
}

export async function handleNewDirectMessage(db: Firestore, cid: string, message: DirectMessageDoc): Promise<void> {
  const convSnap = await db.doc(`conversations/${cid}`).get()
  const participants = (convSnap.get('participants') as string[] | undefined) ?? []

  const others = participants.filter((uid) => uid !== message.authorUid)
  const muteFlags = await Promise.all(others.map((uid) => isThreadMuted(db, uid, cid)))
  const unmuted = others.filter((_, i) => !muteFlags[i])

  const targets = await activeTokensFor(db, unmuted)
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title: message.authorName || 'New message',
    body: truncateBody(message.text || ''),
    data: { type: 'dm', convId: cid },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewDirectMessage = onDocumentCreated('conversations/{cid}/messages/{mid}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewDirectMessage(getFirestore(), event.params.cid, snap.data() as DirectMessageDoc)
})
