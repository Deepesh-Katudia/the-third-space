import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { ChatBubble } from '../../../components/ChatBubble'
import { MediaViewer } from '../../../components/MediaViewer'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { Banner } from '../../../components/Banner'
import { Toast } from '../../../components/Toast'
import { initials } from '../../../utils/avatar'
import { shouldShowAuthor } from '../../../utils/chat'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useThreadMessages } from '../../../hooks/useThreadMessages'
import {
  subscribeEventChatMeta, subscribeConversation, sendEventMessage, sendDirectMessage,
  acceptRequest, markThreadRead, setThreadMuted, getThreadRead, newMessageRef,
  MessageAuthor, ParticipantInfo,
} from '../../../services/chat'
import { pickMedia, uploadMedia, deleteMedia, MediaLimitError, type PickedMedia } from '../../../services/media'
import { limitMessage } from '../../../utils/media'
import { Conversation, MediaAsset } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { BackButton } from '../../../components/ui/BackButton'
import { palette, radius, space, type as typeScale } from '../../../constants/design'

function clockTime(date: Date | null): string {
  if (!date) return 'now'
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** An attachment mid-flight: uploading, then writing the message doc. */
interface Pending { id: string; media: MediaAsset; progress: number }

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; name?: string }>()
  const id = params.id
  const kind: 'group' | 'dm' = params.kind === 'dm' ? 'dm' : 'group'
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
  /** Chosen but not yet sent. Nothing has touched the network at this point. */
  const [staged, setStaged] = useState<PickedMedia | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
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

  // One definition, used by both the text-only and attachment paths — two inline copies
  // would eventually disagree about who the participants are.
  const participants: ParticipantInfo[] = useMemo(() => ([
    { uid: myUid, name: myName, photoURL: profile?.photoURL ?? null },
    { uid: otherUid, name: otherProfile?.displayName ?? params.name ?? 'Member', photoURL: otherProfile?.photoURL ?? null },
  ]), [myUid, myName, profile?.photoURL, otherUid, otherProfile?.displayName, otherProfile?.photoURL, params.name])

  // A staged attachment is sendable on its own — an attachment-only message is the
  // whole point. `pending` blocks a second send while one is in flight.
  const canSend = (draft.trim().length > 0 || staged !== null) && pending === null

  // Picking STAGES the attachment; nothing uploads or posts until send is pressed.
  const handleAttach = async () => {
    if (pending) return
    const picked = await pickMedia({ allowVideo: true })
    if (picked) setStaged(picked)
  }

  const sendText = async (text: string) => {
    if (kind === 'group') {
      await sendEventMessage(id, author, text)
    } else {
      const { created } = await sendDirectMessage(id, participants, author, text)
      if (created) setToast(`Request sent to ${headerName}`)
    }
  }

  const send = async () => {
    if (!myUid || pending) return
    const text = draft
    if (!text.trim() && !staged) return
    setSendError('')

    if (!staged) {
      setDraft('')
      try {
        await sendText(text.trim())
      } catch {
        // Put the text back so a failed send never loses what they typed.
        setDraft((current) => (current ? current : text))
        // Neutral on purpose: a message into a thread where either party has blocked the
        // other is denied by firestore.rules with permission-denied, which is
        // indistinguishable from being offline — and must stay that way. Naming the block
        // here would leak it to the person who was blocked.
        setSendError('This message could not be sent.')
      }
      return
    }

    const picked = staged
    // Mint the message id first — the storage path contains it.
    const msgRef = newMessageRef(kind, id)
    // Move it out of the composer and into the thread as an optimistic bubble, so a
    // slow clip shows progress where the message will actually appear.
    const local: MediaAsset = {
      type: picked.type, url: picked.uri, thumbURL: picked.uri,
      width: picked.width, height: picked.height,
      ...(picked.durationMs != null ? { durationMs: picked.durationMs } : {}),
    }
    setStaged(null)
    setPending({ id: msgRef.id, media: local, progress: 0 })

    // Declared OUTSIDE the try: if the upload succeeds and the Firestore write then
    // fails, this holds the REAL uploaded asset. Cleaning up `local` instead would
    // pass a file:// URI to deleteMedia, which silently does nothing and leaves the
    // actual bytes orphaned in the bucket.
    let uploaded: MediaAsset | null = null

    try {
      uploaded = await uploadMedia(
        { kind: 'chat', authorUid: myUid, threadId: id, messageId: msgRef.id },
        picked,
        (fraction) => setPending((p) => (p ? { ...p, progress: fraction } : p))
      )
      if (kind === 'group') {
        await sendEventMessage(id, author, text, uploaded, msgRef)
      } else {
        const { created } = await sendDirectMessage(id, participants, author, text, uploaded, msgRef)
        if (created) setToast(`Request sent to ${headerName}`)
      }
      setDraft('')
    } catch (e: unknown) {
      // A size/duration rejection is the caller's own file and safe to explain. Anything
      // else stays neutral for the same reason as the text path above.
      setSendError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : 'This message could not be sent.')
      if (uploaded) void deleteMedia(uploaded)
      // Put it back in the composer so the send can be retried without re-picking.
      setStaged(picked)
    } finally {
      // On success the real message arrives through the snapshot; drop the optimistic copy.
      setPending(null)
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
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <View style={[styles.headerAvatar, kind === 'dm' && styles.headerAvatarRound]}>
          <Text style={styles.headerAvatarText}>{initials(headerName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Display numberOfLines={1}>{headerName}</Display>
          <Meta>{kind === 'group' ? 'Group chat' : isPendingOutgoing ? 'Request pending' : 'Direct message'}</Meta>
        </View>
        {kind === 'group' && recentSeeds.length > 0 ? (
          <AttendeeAvatarStack uids={recentSeeds} count={recentSeeds.length} size={26} max={3} ringColor={palette.cream} />
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
            <View style={styles.bannerWrap}>
              <Banner
                tone="success"
                message={`Message request sent. ${headerName} needs to accept before they can reply — you can keep adding to it in the meantime.`}
              />
            </View>
          ) : null}
          {declined ? (
            <View style={styles.bannerWrap}><Banner message="This conversation is no longer available." /></View>
          ) : null}
          {sendError ? <View style={styles.bannerWrap}><Banner message={sendError} /></View> : null}
          {messages.map((m, i) => {
            const isSelf = m.authorUid === myUid
            const isAnnouncement = m.kind === 'announcement'
            return (
              <ChatBubble
                key={m.id}
                message={{
                  id: m.id,
                  author: m.authorName,
                  text: m.text,
                  time: clockTime(m.createdAt ? m.createdAt.toDate() : null),
                  media: m.media,
                }}
                isSelf={isSelf && !isAnnouncement}
                isAnnouncement={isAnnouncement}
                showAuthor={!isSelf && shouldShowAuthor(messages, i)}
                onPressMedia={() => setViewing(m.media ?? null)}
              />
            )
          })}
          {pending ? (
            <ChatBubble
              key={pending.id}
              message={{ id: pending.id, author: '', text: draft, time: '', media: pending.media }}
              isSelf
              uploadProgress={pending.progress}
            />
          ) : null}
        </ScrollView>

        {isPendingIncoming ? (
          <View style={styles.acceptRow}>
            <Body role="bodySm" style={styles.flex}>Accept this request to reply.</Body>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(id)}>
              <Body role="button" style={styles.onInk}>Accept</Body>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {staged ? (
              <View style={styles.stagedRow}>
                <Image source={{ uri: staged.uri }} style={styles.stagedThumb} />
                <Body role="bodySm" style={styles.flex}>
                  {staged.type === 'video' ? 'Clip ready to send' : 'Photo ready to send'}
                </Body>
                <TouchableOpacity
                  testID="chat-staged-remove"
                  onPress={() => setStaged(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remove attachment"
                >
                  <Ionicons name="close" size={18} color={palette.ink} />
                </TouchableOpacity>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TouchableOpacity
                testID="chat-attach"
                style={styles.attachBtn}
                onPress={handleAttach}
                disabled={pending !== null || staged !== null}
                accessibilityRole="button"
                accessibilityLabel="Add a photo or clip"
              >
                <Ionicons name="image-outline" size={20} color={palette.ink} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder={kind === 'group' ? 'Message the group' : 'Message'}
                placeholderTextColor={palette.inkSoft}
                value={draft}
                onChangeText={setDraft}
                multiline
              />
              <TouchableOpacity style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]} onPress={send} disabled={!canSend}>
                <Body role="button" style={styles.onInk}>↑</Body>
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
      {toast ? <Toast message={toast} onDismiss={() => setToast('')} /> : null}
      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl - 4,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: radius.ticket - 2, backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule, alignItems: 'center', justifyContent: 'center' },
  headerAvatarRound: { borderRadius: 20 },
  headerAvatarText: { ...typeScale.bodySm, color: palette.ink },
  headerText: { flex: 1, minWidth: 0 },
  muteToggle: { fontSize: 18 },
  messages: { paddingTop: space.lg, paddingBottom: space.md },
  bannerWrap: { paddingHorizontal: space.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm + 2,
    paddingHorizontal: space.lg,
    paddingTop: space.sm + 2,
    paddingBottom: space.sm + 2,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    backgroundColor: palette.cream,
  },
  input: {
    ...typeScale.bodyLg,
    flex: 1,
    maxHeight: 110,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingTop: space.sm + 2,
    paddingBottom: space.sm + 2,
    color: palette.ink,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule,
  },
  stagedRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.lg, paddingVertical: space.sm,
    borderTopWidth: 1, borderTopColor: palette.rule, backgroundColor: palette.cream,
  },
  stagedThumb: { width: 44, height: 44, borderRadius: radius.ticket - 6 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: palette.inkSoft },
  onInk: { color: palette.cream },
  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
  },
  acceptBtn: { backgroundColor: palette.ink, borderRadius: radius.pill, paddingHorizontal: space.xl - 2, paddingVertical: space.md - 1 },
})
