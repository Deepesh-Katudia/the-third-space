import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { SocialHandles } from '../types/models'
import { SOCIAL_PLATFORMS, socialUrl, hasAnyHandle } from '../utils/socials'
import { Meta } from './ui/Text'
import { palette, radius, space } from '../constants/design'

interface SocialChipsProps {
  handles: SocialHandles
  onOpen: (url: string) => void
}

export function SocialChips({ handles, onOpen }: SocialChipsProps) {
  if (!hasAnyHandle(handles)) return null

  return (
    <View style={styles.wrap}>
      {SOCIAL_PLATFORMS.filter((p) => handles[p.id]).map((p) => {
        const handle = handles[p.id] as string
        return (
          <TouchableOpacity
            key={p.id}
            style={styles.chip}
            onPress={() => onOpen(socialUrl(p.id, handle))}
            accessibilityRole="link"
            accessibilityLabel={`${p.label}, @${handle}`}
          >
            <Meta role="eyebrow" tone="ink">{p.label}</Meta>
            <Meta tone="inkSoft">@{handle}</Meta>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// Matches the interest-chip treatment on member/[uid] so the section reads as part
// of the profile rather than a bolted-on widget.
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xxl - 4 },
  chip: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
    gap: space.xs - 2,
  },
})
