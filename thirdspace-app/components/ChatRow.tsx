import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'
import { palette, radius, space, type as typeScale } from '../constants/design'
import { Display, Body, Meta } from './ui/Text'

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

/** Chat threads are not event surfaces, so this row carries no ticket notches. */
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
          <Display numberOfLines={1} style={styles.name}>{chat.name}</Display>
          <Meta>{chat.timestamp}</Meta>
        </View>
        <View style={styles.bottomLine}>
          <Body
            role="bodySm"
            tone={chat.unread > 0 ? 'ink' : 'inkSoft'}
            numberOfLines={1}
            style={styles.preview}
          >
            {chat.lastMessage}
          </Body>
          {chat.muted ? <Text style={styles.muted}>🔕</Text> : null}
          {chat.unread > 0 ? (
            <View style={styles.badge}>
              <Meta tone="ink">{chat.unread}</Meta>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  avatar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // Avatar tints sit outside the two-tone palette on purpose — they encode identity.
  avatarText: { ...typeScale.bodySm, color: palette.cream },
  middle: { flex: 1, minWidth: 0 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: 3 },
  name: { flex: 1 },
  bottomLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  preview: { flex: 1 },
  muted: { fontSize: 12 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.pill,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.clay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs + 2,
  },
})
