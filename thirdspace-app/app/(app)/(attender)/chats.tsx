import React, { useMemo, useState } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatRow, ChatSummary } from '../../../components/ChatRow'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { useAuth } from '../../../hooks/useAuth'
import { useChatList } from '../../../hooks/useChatList'
import { useMessageRequests } from '../../../hooks/useMessageRequests'
import { formatRelativeTime } from '../../../utils/chat'
import { Screen } from '../../../components/ui/Screen'
import { Display, Meta } from '../../../components/ui/Text'
import { palette, radius, space, NAV_CLEARANCE } from '../../../constants/design'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'group', label: 'Event groups' },
  { key: 'dm', label: 'Direct' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']

export default function Chats() {
  const router = useRouter()
  const { user } = useAuth()
  const { threads, loading } = useChatList(user?.uid)
  const { requests } = useMessageRequests(user?.uid)
  const [filter, setFilter] = useState<FilterKey>('all')

  const visible = useMemo(
    () => (filter === 'all' ? threads : threads.filter((t) => t.kind === filter)),
    [filter, threads]
  )

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Display role="screenTitle">Chats</Display>
        {requests.length > 0 ? (
          <TouchableOpacity onPress={() => router.push('/(app)/message-requests')} hitSlop={8}>
            <Meta role="eyebrow" tone="clay">Requests · {requests.length}</Meta>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterPill, active && styles.filterPillActive]}>
              <Meta role="eyebrow" tone={active ? 'clay' : 'inkSoft'}>{f.label}</Meta>
            </TouchableOpacity>
          )
        })}
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {visible.length === 0 ? (
            <EmptyState emoji="◈" title="No chats here" body="Register for an event to join its group chat." />
          ) : (
            visible.map((t) => {
              const summary: ChatSummary = {
                id: t.id,
                name: t.name,
                type: t.kind === 'group' ? 'group' : 'direct',
                lastMessage: t.lastMessageText || 'No messages yet',
                timestamp: formatRelativeTime(t.lastMessageAt ? t.lastMessageAt.toDate() : null),
                unread: t.unread,
                muted: t.muted,
              }
              return (
                <ChatRow
                  key={t.id}
                  chat={summary}
                  onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: t.id, kind: t.kind, name: t.name } })}
                />
              )
            })
          )}
        </ScrollView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md, marginBottom: space.md },
  filterRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, marginBottom: space.xs },
  filterPill: {
    borderRadius: radius.chip,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm - 1,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  filterPillActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  list: { paddingHorizontal: space.xl, paddingBottom: NAV_CLEARANCE, paddingTop: space.xs },
})
