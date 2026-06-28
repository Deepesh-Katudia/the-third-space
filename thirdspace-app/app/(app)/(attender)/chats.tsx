import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatRow, ChatSummary } from '../../../components/ChatRow'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { useAuth } from '../../../hooks/useAuth'
import { useChatList } from '../../../hooks/useChatList'
import { useMessageRequests } from '../../../hooks/useMessageRequests'
import { formatRelativeTime } from '../../../utils/chat'

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        {requests.length > 0 ? (
          <TouchableOpacity onPress={() => router.push('/(app)/message-requests')} hitSlop={8}>
            <Text style={styles.requestsLink}>Requests · {requests.length}</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)} style={[styles.filterPill, active && styles.filterPillActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, marginBottom: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5 },
  requestsLink: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#C4614A' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 4 },
  filterPill: { borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  filterPillActive: { backgroundColor: '#2C1810', borderColor: '#2C1810' },
  filterText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  filterTextActive: { color: 'white' },
  list: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 4 },
})
