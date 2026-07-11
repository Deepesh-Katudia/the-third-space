import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { Firestore, getFirestore } from 'firebase-admin/firestore'
import { sendPush, truncateBody, PushMessage } from './sendPush'
import { activeTokensFor, isMutualFollow, pruneDeadTokens } from './recipients'

interface FollowDoc {
  follower: string
  target: string
}

export async function handleNewFollow(db: Firestore, follow: FollowDoc): Promise<void> {
  const profSnap = await db.doc(`profiles/${follow.follower}`).get()
  const name = (profSnap.get('displayName') as string | undefined) ?? 'Someone'

  const mutual = await isMutualFollow(db, follow.follower, follow.target)
  const title = mutual ? 'New connection' : 'New follower'
  const body = mutual ? `You're now connected with ${name}` : `${name} started following you`

  const targets = await activeTokensFor(db, [follow.target])
  const messages: PushMessage[] = targets.map((t) => ({
    to: t.token,
    title,
    body: truncateBody(body),
    data: { type: 'follow', uid: follow.follower },
  }))

  const dead = await sendPush(messages)
  await pruneDeadTokens(db, targets, dead)
}

export const onNewFollow = onDocumentCreated('follows/{followId}', async (event) => {
  const snap = event.data
  if (!snap) return
  await handleNewFollow(getFirestore(), snap.data() as FollowDoc)
})
