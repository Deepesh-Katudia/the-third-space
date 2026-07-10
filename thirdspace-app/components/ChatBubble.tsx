import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'

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
          <Text style={styles.systemText}>{message.text}</Text>
        </View>
      </View>
    )
  }

  if (isAnnouncement) {
    return (
      <View style={styles.announceRow}>
        <View style={styles.announceCard}>
          <Text style={styles.announceLabel}>📣 Announcement · {message.author}</Text>
          <Text style={styles.announceText}>{message.text}</Text>
          <Text style={styles.announceTime}>{message.time}</Text>
        </View>
      </View>
    )
  }

  if (isSelf) {
    return (
      <View style={[styles.row, styles.rowSelf]}>
        <View style={[styles.bubble, styles.bubbleSelf]}>
          <Text style={styles.selfText}>{message.text}</Text>
          <Text style={styles.selfTime}>{message.time}</Text>
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
        {showAuthor ? <Text style={styles.author}>{message.author}</Text> : null}
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={styles.otherText}>{message.text}</Text>
          <Text style={styles.otherTime}>{message.time}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  rowSelf: { justifyContent: 'flex-end' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarSpacer: { width: 30 },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: 'white' },
  otherCol: { maxWidth: '76%' },
  author: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', marginBottom: 4, marginLeft: 4 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleOther: { backgroundColor: 'white', borderTopLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  bubbleSelf: { backgroundColor: '#C4614A', borderTopRightRadius: 4, maxWidth: '76%' },
  otherText: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  selfText: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: 'white', lineHeight: 21 },
  otherTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#8C7B70', marginTop: 4, alignSelf: 'flex-end' },
  selfTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 4, alignSelf: 'flex-end' },
  systemRow: { alignItems: 'center', marginBottom: 14, paddingHorizontal: 16 },
  systemPill: { backgroundColor: 'rgba(140,123,112,0.15)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  systemText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', textAlign: 'center' },
  announceRow: { paddingHorizontal: 16, marginBottom: 14 },
  announceCard: { backgroundColor: 'rgba(242,197,160,0.22)', borderLeftWidth: 3, borderLeftColor: '#C4614A', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  announceLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B3F2A', letterSpacing: 0.4, marginBottom: 5 },
  announceText: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  announceTime: { fontFamily: 'DMSans_400Regular', fontSize: 10, color: '#8C7B70', marginTop: 5 },
})
