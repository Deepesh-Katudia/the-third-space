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
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, color: 'white' },
  middle: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', flex: 1, marginRight: 8 },
  time: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78' },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78', flex: 1 },
  previewUnread: { color: '#15161A', fontFamily: 'Poppins_600SemiBold' },
  muted: { fontSize: 12 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'white' },
})
