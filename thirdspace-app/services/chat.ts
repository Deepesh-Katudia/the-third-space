import {
  collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  DocumentData, QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { ChatRead, Conversation, EventChatMeta, Message } from '../types/models'

const MESSAGE_PAGE = 50
const DECLINE_BATCH_SIZE = 400

export interface MessageAuthor { uid: string; name: string; photoURL: string | null }
export interface ParticipantInfo { uid: string; name: string; photoURL: string | null }
export interface ChatReadEntry { id: string; readCount: number; muted: boolean }

function toMessage(d: QueryDocumentSnapshot<DocumentData>): Message {
  const data = d.data()
  return {
    id: d.id,
    authorUid: (data.authorUid as string) ?? '',
    authorName: (data.authorName as string) ?? 'Member',
    authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
    text: (data.text as string) ?? '',
    createdAt: (data.createdAt as Message['createdAt']) ?? null,
    kind: (data.kind as Message['kind']) ?? 'group',
  }
}

// ── Group chats ───────────────────────────────────────────────────────────
export function subscribeEventMessages(
  eventId: string,
  onChange: (messages: Message[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'eventChats', eventId, 'messages'), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toMessage).reverse()), onError)
}

export function subscribeEventChatMeta(
  eventId: string,
  onChange: (meta: EventChatMeta | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'eventChats', eventId),
    (snap) => onChange(snap.exists() ? (snap.data() as EventChatMeta) : null),
    onError
  )
}

export async function sendEventMessage(eventId: string, author: MessageAuthor, text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const batch = writeBatch(db)
  const msgRef = doc(collection(db, 'eventChats', eventId, 'messages'))
  batch.set(msgRef, {
    authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
    text: trimmed, createdAt: serverTimestamp(),
  })
  batch.set(
    doc(db, 'eventChats', eventId),
    { lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1) },
    { merge: true }
  )
  await batch.commit()
}

// ── Direct messages ─────────────────────────────────────────────────────────
function toConversation(snap: { id: string; data: () => DocumentData }): Conversation {
  const data = snap.data()
  return {
    id: snap.id,
    participants: (data.participants as string[]) ?? [],
    names: (data.names as Record<string, string>) ?? {},
    photos: (data.photos as Record<string, string | null>) ?? {},
    status: (data.status as 'pending' | 'open') ?? 'pending',
    requestedBy: (data.requestedBy as string) ?? '',
    lastMessageText: (data.lastMessageText as string) ?? '',
    lastMessageAt: (data.lastMessageAt as Conversation['lastMessageAt']) ?? null,
    lastMessageAuthor: (data.lastMessageAuthor as string) ?? '',
    messageCount: (data.messageCount as number) ?? 0,
  }
}

export function subscribeConversation(
  convId: string,
  onChange: (conversation: Conversation | null) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    doc(db, 'conversations', convId),
    (snap) => onChange(snap.exists() ? toConversation(snap) : null),
    onError
  )
}

export function subscribeConversationMessages(
  convId: string,
  onChange: (messages: Message[]) => void,
  onError: () => void
): () => void {
  const q = query(collection(db, 'conversations', convId, 'messages'), orderBy('createdAt', 'desc'), limit(MESSAGE_PAGE))
  return onSnapshot(q, (snap) => onChange(snap.docs.map(toMessage).reverse()), onError)
}

export async function sendDirectMessage(
  convId: string,
  participants: ParticipantInfo[],
  author: MessageAuthor,
  text: string
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) return
  const convRef = doc(db, 'conversations', convId)
  const snap = await getDoc(convRef)
  if (!snap.exists()) {
    // Two sequential awaited writes: conversation doc first so Firestore security rules
    // can resolve get(conversations/{convId}) when evaluating the message-create rule.
    const names: Record<string, string> = {}
    const photos: Record<string, string | null> = {}
    participants.forEach((p) => { names[p.uid] = p.name; photos[p.uid] = p.photoURL })
    await setDoc(convRef, {
      participants: participants.map((p) => p.uid),
      names, photos,
      status: 'pending', requestedBy: author.uid,
      lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: 1,
    })
    await setDoc(doc(collection(db, 'conversations', convId, 'messages')), {
      authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
      text: trimmed, createdAt: serverTimestamp(),
    })
  } else {
    // Subsequent sends: conversation already exists, safe to batch.
    const batch = writeBatch(db)
    const msgRef = doc(collection(db, 'conversations', convId, 'messages'))
    batch.set(msgRef, {
      authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
      text: trimmed, createdAt: serverTimestamp(),
    })
    batch.update(convRef, {
      lastMessageText: trimmed, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1),
    })
    await batch.commit()
  }
}

export async function acceptRequest(convId: string): Promise<void> {
  await updateDoc(doc(db, 'conversations', convId), { status: 'open' })
}

export async function declineRequest(convId: string): Promise<void> {
  const msgs = await getDocs(collection(db, 'conversations', convId, 'messages'))
  const docs = msgs.docs
  for (let i = 0; i < docs.length; i += DECLINE_BATCH_SIZE) {
    const batch = writeBatch(db)
    docs.slice(i, i + DECLINE_BATCH_SIZE).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
  await deleteDoc(doc(db, 'conversations', convId))
}

export function subscribeMyConversations(
  uid: string,
  onChange: (conversations: Conversation[]) => void,
  onError: () => void
): () => void {
  // array-contains only (no orderBy) -> no composite index; sorting is client-side.
  const q = query(collection(db, 'conversations'), where('participants', 'array-contains', uid))
  return onSnapshot(q, (snap) => onChange(snap.docs.map((d) => toConversation(d))), onError)
}

// ── Read state ───────────────────────────────────────────────────────────────
export function subscribeChatReads(
  uid: string,
  onChange: (reads: ChatReadEntry[]) => void,
  onError: () => void
): () => void {
  return onSnapshot(
    collection(db, 'users', uid, 'chatReads'),
    (snap) => onChange(snap.docs.map((d) => {
      const data = d.data()
      return { id: d.id, readCount: (data.readCount as number) ?? 0, muted: (data.muted as boolean) ?? false }
    })),
    onError
  )
}

export async function getThreadRead(uid: string, threadId: string): Promise<ChatRead | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'chatReads', threadId))
  if (!snap.exists()) return null
  const data = snap.data()
  return { readCount: (data.readCount as number) ?? 0, muted: (data.muted as boolean) ?? false }
}

export async function markThreadRead(uid: string, threadId: string, count: number): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'chatReads', threadId), { readCount: count }, { merge: true })
}

export async function setThreadMuted(uid: string, threadId: string, muted: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'chatReads', threadId), { muted }, { merge: true })
}
