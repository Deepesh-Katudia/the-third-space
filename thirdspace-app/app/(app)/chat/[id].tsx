import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatBubble, ChatMessage } from '../../../components/ChatBubble'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { initials } from '../../../utils/avatar'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: subscribe to events/{id}/messages and send via a service write.
const MOCK_EVENT_TITLE = 'Sunset Rooftop Sketching'
const MOCK_PARTICIPANTS = 22
const SELF = 'You'

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', author: 'Devon Park', text: 'So excited for this! First time sketching outdoors.', time: '4:02 PM' },
  { id: 'm2', author: 'Maya Chen', text: 'Bringing extra charcoal if anyone needs some 🖤', time: '4:05 PM' },
  { id: 'm3', author: 'You', text: 'Amazing, thank you Maya! What time should we get there?', time: '4:08 PM' },
  { id: 'm4', author: 'Sofia Reyes', text: 'Host said doors open at 5:30, golden hour starts ~6.', time: '4:11 PM' },
]
// ──────────────────────────────────────────────────────────────────────────

export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES)
  const [draft, setDraft] = useState('')

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { id: `local-${prev.length}`, author: SELF, text, time: 'now' },
    ])
    setDraft('')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{initials(MOCK_EVENT_TITLE)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{MOCK_EVENT_TITLE}</Text>
          <Text style={styles.headerMeta}>{MOCK_PARTICIPANTS} in this chat</Text>
        </View>
        <AttendeeAvatarStack
          uids={Array.from({ length: 3 }, (_, i) => `${id}:${i}`)}
          count={MOCK_PARTICIPANTS}
          size={26}
          max={3}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          <ChatBubble
            isSelf={false}
            isSystem
            message={{ id: 'sys', author: '', text: 'You registered · welcome to the chat', time: '' }}
          />
          {messages.map((m, i) => {
            const isSelf = m.author === SELF
            const prev = messages[i - 1]
            const showAuthor = !prev || prev.author !== m.author
            return <ChatBubble key={m.id} message={m} isSelf={isSelf} showAuthor={showAuthor} />
          })}
        </ScrollView>

        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachBtn} hitSlop={6}>
            <Text style={styles.attachText}>＋</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message the group"
            placeholderTextColor="#8C7B70"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <TouchableOpacity style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!draft.trim()}>
            <Text style={styles.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242,197,160,0.5)',
  },
  back: { fontSize: 24, color: '#2C1810' },
  headerAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: 'white' },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  headerMeta: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70' },
  messages: { paddingTop: 16, paddingBottom: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(242,197,160,0.5)',
    backgroundColor: '#FBF7F2',
  },
  attachBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', alignItems: 'center', justifyContent: 'center' },
  attachText: { fontSize: 20, color: '#8C7B70' },
  input: { flex: 1, maxHeight: 110, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(196,97,74,0.4)' },
  sendText: { fontSize: 20, color: 'white', fontFamily: 'DMSans_500Medium' },
})
