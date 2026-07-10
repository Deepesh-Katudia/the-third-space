import React, { useEffect, useState } from 'react'
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
import { useAuth } from '../../../../hooks/useAuth'
import { useProfile } from '../../../../hooks/useProfile'
import { subscribeEvent } from '../../../../services/events'
import { sendAnnouncement, subscribeAnnouncements, AnnouncementAuthor } from '../../../../services/announcements'
import { formatSentSummary } from '../../../../utils/announcementHelpers'
import { formatDayDate, formatTime } from '../../../../utils/eventHelpers'
import { CommunityEvent, Announcement } from '../../../../types/models'

const TEMPLATES = [
  { label: 'What to bring', text: 'A quick reminder to bring: ' },
  { label: 'Location change', text: 'Heads up — the location has changed to: ' },
  { label: 'Running late', text: "We're running about 15 minutes behind. Hang tight!" },
  { label: 'Thank you', text: 'Thank you all for coming — it was a wonderful evening!' },
]

export default function Announcement() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { profile } = useProfile(user?.uid || undefined)

  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [latest, setLatest] = useState<Announcement | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setError("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeAnnouncements(id, (list) => setLatest(list[0] ?? null), () => {})
  }, [id])

  const recipientCount = event?.registeredCount ?? 0
  const whenLine = event ? `${formatDayDate(event.startsAt.toDate())} · ${formatTime(event.startsAt.toDate())}` : ''

  const send = async () => {
    const text = message.trim()
    if (!text || !user || sending) return
    setSending(true)
    setError('')
    const author: AnnouncementAuthor = {
      uid: user.uid,
      name: profile?.displayName ?? user.displayName ?? 'Host',
      photoURL: profile?.photoURL ?? null,
    }
    try {
      await sendAnnouncement(id, author, text, recipientCount)
      router.back()
    } catch {
      setError('Could not send. Try again.')
      setSending(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Send announcement</Text>
          <Text style={styles.subtitle}>To {recipientCount} registered {recipientCount === 1 ? 'attendee' : 'attendees'}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{event?.title ?? '…'}</Text>
            <Text style={styles.eventWhen}>{whenLine}</Text>
          </View>

          <TextInput
            style={styles.textarea}
            placeholder="Write your announcement…"
            placeholderTextColor="#8C7B70"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.caption}>Posts to the event chat as a pinned notice</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Quick templates</Text>
          <View style={styles.templateWrap}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity key={t.label} style={styles.templateChip} onPress={() => setMessage(t.text)}>
                <Text style={styles.templateText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {latest ? (
            <>
              <Text style={styles.sectionLabel}>Most recent</Text>
              <View style={styles.recentCard}>
                <Text style={styles.recentText}>{latest.text}</Text>
                <Text style={styles.recentStats}>
                  {formatSentSummary(latest.createdAt ? latest.createdAt.toDate() : null, latest.recipientCount)}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!message.trim() || sending}
          >
            <Text style={styles.sendText}>{sending ? 'Sending…' : `Send to ${recipientCount} ${recipientCount === 1 ? 'attendee' : 'attendees'}`}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810', letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  eventCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  eventTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 18, color: '#2C1810', marginBottom: 4 },
  eventWhen: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  textarea: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 16, padding: 16, minHeight: 130, fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 22 },
  caption: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginTop: 8, marginBottom: 24 },
  error: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginTop: 8 },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  templateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  templateChip: { backgroundColor: 'white', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  templateText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  recentCard: { backgroundColor: 'rgba(242,197,160,0.15)', borderRadius: 16, padding: 16 },
  recentText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', lineHeight: 20, marginBottom: 8 },
  recentStats: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70' },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 10, borderTopWidth: 1, borderTopColor: 'rgba(242,197,160,0.5)', backgroundColor: '#FBF7F2' },
  sendBtn: { backgroundColor: '#C4614A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: 'rgba(196,97,74,0.4)' },
  sendText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
})
