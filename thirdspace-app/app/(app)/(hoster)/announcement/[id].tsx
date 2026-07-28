import React, { useEffect, useState } from 'react'
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../../hooks/useAuth'
import { useProfile } from '../../../../hooks/useProfile'
import { subscribeEvent } from '../../../../services/events'
import { sendAnnouncement, subscribeAnnouncements, AnnouncementAuthor } from '../../../../services/announcements'
import { formatSentSummary } from '../../../../utils/announcementHelpers'
import { formatDayDate, formatTime } from '../../../../utils/eventHelpers'
import { CommunityEvent, Announcement } from '../../../../types/models'
import { Screen } from '../../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../../components/ui/Text'
import { palette, radius, space, type as typeScale } from '../../../../constants/design'

const TEMPLATES = [
  { label: 'What to bring', text: 'A quick reminder to bring: ' },
  { label: 'Location change', text: 'Heads up — the location has changed to: ' },
  { label: 'Running late', text: "We're running about 15 minutes behind. Hang tight!" },
  { label: 'Thank you', text: 'Thank you all for coming — it was a wonderful evening!' },
]

export default function AnnouncementScreen() {
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
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Display style={styles.back}>←</Display>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Display role="screenTitle">Send announcement</Display>
          <Body role="bodySm">To {recipientCount} registered {recipientCount === 1 ? 'attendee' : 'attendees'}</Body>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={8}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.eventCard}>
            <Display>{event?.title ?? '…'}</Display>
            <Body role="bodySm">{whenLine}</Body>
          </View>

          <TextInput
            style={styles.textarea}
            placeholder="Write your announcement…"
            placeholderTextColor={palette.inkSoft}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
          <Body role="bodySm" style={styles.caption}>Posts to the event chat as a pinned notice</Body>
          {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

          <Meta role="eyebrow" style={styles.sectionLabel}>Quick templates</Meta>
          <View style={styles.templateWrap}>
            {TEMPLATES.map((t) => (
              <TouchableOpacity key={t.label} style={styles.templateChip} onPress={() => setMessage(t.text)}>
                <Meta role="eyebrow" tone="inkSoft">{t.label}</Meta>
              </TouchableOpacity>
            ))}
          </View>

          {latest ? (
            <>
              <Meta role="eyebrow" style={styles.sectionLabel}>Most recent</Meta>
              <View style={styles.recentCard}>
                <Body role="bodyLg" tone="ink" style={styles.recentText}>{latest.text}</Body>
                <Meta>
                  {formatSentSummary(latest.createdAt ? latest.createdAt.toDate() : null, latest.recipientCount)}
                </Meta>
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
            <Body role="button" style={styles.onInk}>{sending ? 'Sending…' : `Send to ${recipientCount} ${recipientCount === 1 ? 'attendee' : 'attendees'}`}</Body>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { fontSize: 24 },
  headerText: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  eventCard: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  textarea: {
    ...typeScale.bodyLg,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    padding: space.lg,
    minHeight: 130,
    color: palette.ink,
  },
  caption: { marginTop: space.sm, marginBottom: space.xl },
  error: { marginTop: space.sm },
  sectionLabel: { marginBottom: space.md },
  templateWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  templateChip: {
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm + 1,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  recentCard: { backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule, borderRadius: radius.ticket, padding: space.lg },
  recentText: { marginBottom: space.sm },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    paddingBottom: space.sm + 2,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    backgroundColor: palette.cream,
  },
  sendBtn: { backgroundColor: palette.ink, borderRadius: radius.ticket, paddingVertical: space.lg, alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: palette.inkSoft },
  onInk: { color: palette.cream },
})
