import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'

interface AttendeeAvatarStackProps {
  /** Seeds (names or uids) used to render initial-based avatars. */
  uids: string[]
  /** Total attendee count; drives the "+N" overflow chip. */
  count: number
  size?: number
  /** Max avatars rendered before collapsing into a "+N" chip. */
  max?: number
  /** Border color of each avatar (matches the surface it sits on). */
  ringColor?: string
}

export function AttendeeAvatarStack({
  uids,
  count,
  size = 32,
  max = 4,
  ringColor = '#FFF9F4',
}: AttendeeAvatarStackProps) {
  const shown = uids.slice(0, max)
  const overflow = count - shown.length
  const overlap = Math.round(size * 0.32)

  return (
    <View style={styles.row}>
      {shown.map((seed, i) => (
        <View
          key={`${seed}-${i}`}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: avatarColor(seed),
              borderColor: ringColor,
              marginLeft: i === 0 ? 0 : -overlap,
              zIndex: shown.length - i,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(seed)}</Text>
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={[
            styles.avatar,
            styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: ringColor,
              marginLeft: -overlap,
            },
          ]}
        >
          <Text style={[styles.overflowText, { fontSize: size * 0.34 }]}>+{overflow}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  initials: { fontFamily: 'DMSans_500Medium', color: 'white' },
  overflow: { backgroundColor: '#8C7B70' },
  overflowText: { fontFamily: 'DMSans_500Medium', color: 'white' },
})
