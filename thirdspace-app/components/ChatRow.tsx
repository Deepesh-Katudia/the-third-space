import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'

export interface ChatSummary {
  id: string
  name: string
  type: 'group' | 'direct'
  lastMessage: string
  timestamp: string
  unread: number
  muted: boolean
}

interface ChatRowProps {
  chat: ChatSummary
  onPress: () => void
}

export function ChatRow({ chat, onPress }: ChatRowProps) {
  const isGroup = chat.type === 'group'
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.row}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: avatarColor(chat.name), borderRadius: isGroup ? 14 : 24 },
        ]}
      >
        <Text style={styles.avatarText}>{initials(chat.name)}</Text>
      </View>
      <View style={styles.middle}>
        <View style={styles.topLine}>
          <Text style={styles.name} numberOfLines={1}>{chat.name}</Text>
          <Text style={styles.time}>{chat.timestamp}</Text>
        </View>
        <View style={styles.bottomLine}>
          <Text style={[styles.preview, chat.unread > 0 && styles.previewUnread]} numberOfLines={1}>
            {chat.lastMessage}
          </Text>
          {chat.muted ? <Text style={styles.muted}>🔕</Text> : null}
          {chat.unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 17, color: 'white' },
  middle: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', flex: 1, marginRight: 8 },
  time: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70' },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', flex: 1 },
  previewUnread: { color: '#2C1810', fontFamily: 'DMSans_500Medium' },
  muted: { fontSize: 12 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
})
