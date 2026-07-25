import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChatBubble } from '../../../components/ChatBubble'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { Banner } from '../../../components/Banner'
import { Toast } from '../../../components/Toast'
import { initials } from '../../../utils/avatar'
import { shouldShowAuthor, dmConversationId } from '../../../utils/chat'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useThreadMessages } from '../../../hooks/useThreadMessages'
import {
  subscribeEventChatMeta, subscribeConversation, sendEventMessage, sendDirectMessage,
  acceptRequest, markThreadRead, setThreadMuted, getThreadRead,
  MessageAuthor, ParticipantInfo,
} from '../../../services/chat'
import { Conversation } from '../../../types/models'

function clockTime(date: Date | null): string {
  if (!date) return 'now'
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; name?: string }>()
  const id = params.id
  const kind: 'group' | 'dm' = params.kind === 'dm' ? 'dm' : 'group'
  const router = useRouter()
  const { user } = useAuth()
  const myUid = user?.uid ?? ''
  const { profile } = useProfile(myUid || undefined)

  const otherUid = kind === 'dm' ? id.split('_').find((p) => p !== myUid) ?? '' : ''
  const { profile: otherProfile } = useProfile(kind === 'dm' ? otherUid : undefined)

  const { messages, loading } = useThreadMessages(kind, id)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messageCount, setMessageCount] = useState(0)
  const [muted, setMuted] = useState(false)
  const [draft, setDraft] = useState('')
  const [toast, setToast] = useState('')
  const [sendError, setSendError] = useState('')
  const scrollRef = useRef<ScrollView>(null)
  const everExisted = useRef(false)

  const myName = profile?.displayName ?? user?.displayName ?? 'You'
  const author: MessageAuthor = { uid: myUid, name: myName, photoURL: profile?.photoURL ?? null }

  const headerName = kind === 'dm' ? otherProfile?.displayName ?? params.name ?? 'Member' : params.name ?? 'Event chat'

  // Thread metadata: drives unread clearing + (dm) request state.
  useEffect(() => {
    if (!id) return
    if (kind === 'group') {
      return subscribeEventChatMeta(id, (meta) => setMessageCount(meta?.messageCount ?? 0), () => {})
    }
    return subscribeConversation(id, (c) => { setConversation(c); setMessageCount(c?.messageCount ?? 0) }, () => {})
  }, [id, kind])

  // Initialise mute state once.
  useEffect(() => {
    if (!myUid || !id) return
    let cancelled = false
    getThreadRead(myUid, id).then((r) => { if (!cancelled && r) setMuted(r.muted) }).catch(() => {})
    return () => { cancelled = true }
  }, [myUid, id])

  // Mark read whenever the visible message count advances.
  useEffect(() => {
    if (!myUid || !id || messageCount === 0) return
    markThreadRead(myUid, id, messageCount).catch(() => {})
  }, [myUid, id, messageCount])

  useEffect(() => {
    if (messages.length > 0) scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages.length])

  // Track whether this conversation was ever non-null so brand-new threads don't
  // incorrectly show the "no longer available" banner before any message is sent.
  useEffect(() => { if (conversation !== null) everExisted.current = true }, [conversation])

  const isPendingOutgoing = kind === 'dm' && conversation?.status === 'pending' && conversation.requestedBy === myUid
  const isPendingIncoming = kind === 'dm' && conversation?.status === 'pending' && conversation.requestedBy !== myUid
  const declined = kind === 'dm' && !loading && conversation === null && everExisted.current

  const send = async () => {
    const text = draft.trim()
    if (!text || !myUid) return
    setDraft('')
    setSendError('')
    try {
      if (kind === 'group') {
        await sendEventMessage(id, author, text)
      } else {
        const participants: ParticipantInfo[] = [
          { uid: myUid, name: myName, photoURL: profile?.photoURL ?? null },
          { uid: otherUid, name: otherProfile?.displayName ?? params.name ?? 'Member', photoURL: otherProfile?.photoURL ?? null },
        ]
        const { created } = await sendDirectMessage(id, participants, author, text)
        if (created) setToast(`Request sent to ${headerName}`)
      }
    } catch {
      // Put the text back so a failed send never loses what they typed.
      setDraft((current) => (current ? current : text))
      setSendError("Couldn't send that message. Check your connection and try again.")
    }
  }

  const recentSeeds = useMemo(() => {
    const seen: string[] = []
    for (let i = messages.length - 1; i >= 0 && seen.length < 3; i--) {
      if (!seen.includes(messages[i].authorName)) seen.push(messages[i].authorName)
    }
    return seen
  }, [messages])

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (myUid && id) setThreadMuted(myUid, id, next).catch(() => {})
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={[styles.headerAvatar, kind === 'dm' && styles.headerAvatarRound]}>
          <Text style={styles.headerAvatarText}>{initials(headerName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle} numberOfLines={1}>{headerName}</Text>
          <Text style={styles.headerMeta}>{kind === 'group' ? 'Group chat' : isPendingOutgoing ? 'Request pending' : 'Direct message'}</Text>
        </View>
        {kind === 'group' && recentSeeds.length > 0 ? (
          <AttendeeAvatarStack uids={recentSeeds} count={recentSeeds.length} size={26} max={3} />
        ) : (
          <TouchableOpacity onPress={toggleMute} hitSlop={8}>
            <Text style={styles.muteToggle}>{muted ? '🔕' : '🔔'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.messages} showsVerticalScrollIndicator={false}>
          {kind === 'group' ? (
            <ChatBubble isSelf={false} isSystem message={{ id: 'sys', author: '', text: 'You registered · welcome to the chat', time: '' }} />
          ) : null}
          {isPendingOutgoing ? (
            <Banner
              tone="success"
              message={`Message request sent. ${headerName} needs to accept before they can reply — you can keep adding to it in the meantime.`}
            />
          ) : null}
          {declined ? (
            <Banner message="This conversation is no longer available." />
          ) : null}
          {sendError ? <Banner message={sendError} /> : null}
          {messages.map((m, i) => {
            const isSelf = m.authorUid === myUid
            const isAnnouncement = m.kind === 'announcement'
            return (
              <ChatBubble
                key={m.id}
                message={{ id: m.id, author: m.authorName, text: m.text, time: clockTime(m.createdAt ? m.createdAt.toDate() : null) }}
                isSelf={isSelf && !isAnnouncement}
                isAnnouncement={isAnnouncement}
                showAuthor={!isSelf && shouldShowAuthor(messages, i)}
              />
            )
          })}
        </ScrollView>

        {isPendingIncoming ? (
          <View style={styles.acceptRow}>
            <Text style={styles.acceptHint}>Accept this request to reply.</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(id)}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={kind === 'group' ? 'Message the group' : 'Message'}
              placeholderTextColor="#6B6F78"
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]} onPress={send} disabled={!draft.trim()}>
              <Text style={styles.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
      {toast ? <Toast message={toast} onDismiss={() => setToast('')} /> : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(226,224,218,0.5)' },
  back: { fontSize: 24, color: '#15161A' },
  headerAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FF9F3D', alignItems: 'center', justifyContent: 'center' },
  headerAvatarRound: { borderRadius: 20 },
  headerAvatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A' },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A' },
  headerMeta: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78' },
  muteToggle: { fontSize: 18 },
  messages: { paddingTop: 16, paddingBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(226,224,218,0.5)', backgroundColor: '#F3F3F5' },
  input: { flex: 1, maxHeight: 110, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)', borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#15161A' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF9F3D', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(255,159,61,0.4)' },
  sendText: { fontSize: 20, color: '#15161A', fontFamily: 'Poppins_600SemiBold' },
  acceptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(226,224,218,0.5)' },
  acceptHint: { flex: 1, fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  acceptBtn: { backgroundColor: '#FF9F3D', borderRadius: 100, paddingHorizontal: 22, paddingVertical: 11 },
  acceptText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#15161A' },
})
