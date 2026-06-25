import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatRow, ChatSummary } from '../../../components/ChatRow'
import { EmptyState } from '../../../components/EmptyState'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: subscribe to the user's chat threads.
const MOCK_CHATS: ChatSummary[] = [
  { id: 'feat-1', name: 'Sunset Rooftop Sketching', type: 'group', lastMessage: 'Devon: bringing extra charcoal if anyone needs', timestamp: '2m', unread: 3, muted: false },
  { id: 'c1', name: 'Natural Wine Social', type: 'group', lastMessage: 'You: see you all Friday!', timestamp: '1h', unread: 0, muted: false },
  { id: 'dm-1', name: 'Maya Chen', type: 'direct', lastMessage: 'That sounds great — count me in', timestamp: '3h', unread: 1, muted: false },
  { id: 'dm-2', name: 'Liam Walsh', type: 'direct', lastMessage: 'Thanks for the rec!', timestamp: 'Tue', unread: 0, muted: true },
]

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'group', label: 'Event groups' },
  { key: 'direct', label: 'Direct' },
] as const
type FilterKey = (typeof FILTERS)[number]['key']
// ──────────────────────────────────────────────────────────────────────────

export default function Chats() {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterKey>('all')

  const visible = useMemo(
    () => (filter === 'all' ? MOCK_CHATS : MOCK_CHATS.filter((c) => c.type === filter)),
    [filter]
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/message-requests')} hitSlop={8}>
          <Text style={styles.requestsLink}>Requests · 2</Text>
        </TouchableOpacity>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {visible.length === 0 ? (
          <EmptyState emoji="◈" title="No chats here" body="Register for an event to join its group chat." />
        ) : (
          visible.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: chat.id } })}
            />
          ))
        )}
      </ScrollView>
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
