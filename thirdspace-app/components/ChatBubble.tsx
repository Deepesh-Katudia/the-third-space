import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'
import { palette, radius, space, font } from '../constants/design'
import { Body, Meta } from './ui/Text'

export interface ChatMessage {
  id: string
  author: string
  text: string
  time: string
}

interface ChatBubbleProps {
  message: ChatMessage
  isSelf: boolean
  isSystem?: boolean
  /** Render the highlighted broadcast variant (host announcement). */
  isAnnouncement?: boolean
  /** Show the author's name + avatar (first message in a run from others). */
  showAuthor?: boolean
}

export function ChatBubble({ message, isSelf, isSystem = false, isAnnouncement = false, showAuthor = true }: ChatBubbleProps) {
  if (isSystem) {
    return (
      <View style={styles.systemRow}>
        <View style={styles.systemPill}>
          <Meta style={styles.center}>{message.text}</Meta>
        </View>
      </View>
    )
  }

  if (isAnnouncement) {
    return (
      <View style={styles.announceRow}>
        <View style={styles.announceCard}>
          <Meta role="eyebrow" tone="clay" style={styles.announceLabel}>📣 Announcement · {message.author}</Meta>
          <Body role="bodyLg" tone="ink">{message.text}</Body>
          <Meta style={styles.time}>{message.time}</Meta>
        </View>
      </View>
    )
  }

  if (isSelf) {
    return (
      <View style={[styles.row, styles.rowSelf]}>
        <View style={[styles.bubble, styles.bubbleSelf]}>
          <Body role="bodyLg" style={styles.onInk}>{message.text}</Body>
          <Meta style={[styles.time, styles.onInk]}>{message.time}</Meta>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.row}>
      {showAuthor ? (
        <View style={[styles.avatar, { backgroundColor: avatarColor(message.author) }]}>
          <Text style={styles.avatarText}>{initials(message.author)}</Text>
        </View>
      ) : (
        <View style={styles.avatarSpacer} />
      )}
      <View style={styles.otherCol}>
        {showAuthor ? <Meta style={styles.author}>{message.author}</Meta> : null}
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Body role="bodyLg" tone="ink">{message.text}</Body>
          <Meta style={styles.time}>{message.time}</Meta>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginBottom: space.md, paddingHorizontal: space.lg },
  rowSelf: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarSpacer: { width: 30 },
  // Avatar tints sit outside the two-tone palette on purpose — they encode identity.
  avatarText: { fontFamily: font.bodySemi, fontSize: 12, color: palette.cream },
  otherCol: { maxWidth: '76%' },
  author: { marginBottom: space.xs, marginLeft: space.xs },
  bubble: { borderRadius: 18, paddingHorizontal: space.md + 2, paddingVertical: space.sm + 2 },
  bubbleOther: { backgroundColor: palette.orangeLight, borderTopLeftRadius: 4, borderWidth: 1, borderColor: palette.rule },
  bubbleSelf: { backgroundColor: palette.ink, borderTopRightRadius: 4, maxWidth: '76%' },
  onInk: { color: palette.cream },
  time: { marginTop: space.xs, alignSelf: 'flex-end' },
  center: { textAlign: 'center' },
  systemRow: { alignItems: 'center', marginBottom: space.md + 2, paddingHorizontal: space.lg },
  systemPill: { backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule, borderRadius: radius.pill, paddingHorizontal: space.md + 2, paddingVertical: space.xs + 2 },
  announceRow: { paddingHorizontal: space.lg, marginBottom: space.md + 2 },
  announceCard: {
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderLeftWidth: 3,
    borderLeftColor: palette.clay,
    borderRadius: radius.ticket,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.md,
  },
  announceLabel: { marginBottom: 5 },
})
