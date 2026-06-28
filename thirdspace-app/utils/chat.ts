import { ChatRead, ChatThread, Conversation, EventChatMeta, Message } from '../types/models'

export function dmConversationId(a: string, b: string): string {
  return [a, b].sort().join('_')
}

export function computeUnread(messageCount: number, readCount: number, muted: boolean): number {
  if (muted) return 0
  return Math.max(0, messageCount - readCount)
}

export function shouldShowAuthor(messages: Message[], index: number): boolean {
  const prev = messages[index - 1]
  return !prev || prev.authorUid !== messages[index].authorUid
}

export function sortThreadsByRecency(threads: ChatThread[]): ChatThread[] {
  return [...threads].sort((a, b) => {
    const at = a.lastMessageAt ? a.lastMessageAt.toMillis() : 0
    const bt = b.lastMessageAt ? b.lastMessageAt.toMillis() : 0
    return bt - at
  })
}

export function formatRelativeTime(date: Date | null, now: Date = new Date()): string {
  if (!date) return ''
  const min = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return date.toLocaleDateString(undefined, { weekday: 'short' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export interface GroupChatInput {
  eventId: string
  title: string
  meta: EventChatMeta | null
}

export type ReadMap = Record<string, ChatRead>

export function buildChatThreads(
  groups: GroupChatInput[],
  conversations: Conversation[],
  reads: ReadMap,
  myUid: string
): ChatThread[] {
  const groupThreads: ChatThread[] = groups.map((g) => {
    const read = reads[g.eventId]
    const muted = read?.muted ?? false
    return {
      id: g.eventId,
      kind: 'group',
      name: g.title,
      photoURL: null,
      lastMessageText: g.meta?.lastMessageText ?? '',
      lastMessageAt: g.meta?.lastMessageAt ?? null,
      unread: computeUnread(g.meta?.messageCount ?? 0, read?.readCount ?? 0, muted),
      muted,
    }
  })

  const dmThreads: ChatThread[] = conversations
    .filter((c) => c.status === 'open' || (c.status === 'pending' && c.requestedBy === myUid))
    .map((c) => {
      const otherUid = c.participants.find((p) => p !== myUid) ?? myUid
      const read = reads[c.id]
      const muted = read?.muted ?? false
      return {
        id: c.id,
        kind: 'dm',
        name: c.names[otherUid] ?? 'Member',
        photoURL: c.photos[otherUid] ?? null,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
        unread: computeUnread(c.messageCount, read?.readCount ?? 0, muted),
        muted,
      }
    })

  return sortThreadsByRecency([...groupThreads, ...dmThreads])
}

export function selectIncomingRequests(conversations: Conversation[], myUid: string): Conversation[] {
  return conversations.filter((c) => c.status === 'pending' && c.requestedBy !== myUid)
}
