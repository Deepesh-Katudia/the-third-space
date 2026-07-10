import {
  collection, doc, onSnapshot, orderBy, query, serverTimestamp, increment, writeBatch,
  DocumentData, QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { Announcement } from '../types/models'

export interface AnnouncementAuthor { uid: string; name: string; photoURL: string | null }

function toAnnouncement(d: QueryDocumentSnapshot<DocumentData>): Announcement {
  const data = d.data()
  return {
    id: d.id,
    text: (data.text as string) ?? '',
    authorUid: (data.authorUid as string) ?? '',
    authorName: (data.authorName as string) ?? 'Host',
    recipientCount: (data.recipientCount as number) ?? 0,
    createdAt: (data.createdAt as Announcement['createdAt']) ?? null,
  }
}

// Atomic batch: announcement doc + announcement chat message + chat-meta merge.
export async function sendAnnouncement(
  eventId: string,
  author: AnnouncementAuthor,
  text: string,
  recipientCount: number
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return

  const batch = writeBatch(db)

  const annRef = doc(collection(db, 'events', eventId, 'announcements'))
  batch.set(annRef, {
    text: trimmed,
    authorUid: author.uid,
    authorName: author.name,
    recipientCount,
    createdAt: serverTimestamp(),
  })

  const msgRef = doc(collection(db, 'eventChats', eventId, 'messages'))
  batch.set(msgRef, {
    authorUid: author.uid,
    authorName: author.name,
    authorPhotoURL: author.photoURL,
    text: trimmed,
    kind: 'announcement',
    createdAt: serverTimestamp(),
  })

  batch.set(
    doc(db, 'eventChats', eventId),
    { lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1) },
    { merge: true }
  )

  await batch.commit()
}

export function subscribeAnnouncements(
  eventId: string,
  onChange: (announcements: Announcement[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'events', eventId, 'announcements'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toAnnouncement)), onError)
}
