import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Announcement } from '../types/models'
import { palette, radius, space } from '../constants/design'
import { Body, Meta } from './ui/Text'

interface AnnouncementBannerProps {
  announcement: Announcement
  onPress: () => void
}

export function AnnouncementBanner({ announcement, onPress }: AnnouncementBannerProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Meta role="eyebrow" tone="clay" style={styles.label}>📣 Latest from the host</Meta>
      <Body role="bodyLg" tone="ink" numberOfLines={3}>{announcement.text}</Body>
      <Meta role="eyebrow" tone="clay" style={styles.cta}>Open chat →</Meta>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderLeftWidth: 3,
    borderLeftColor: palette.clay,
    borderRadius: radius.ticket,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    marginBottom: space.xl,
  },
  label: { marginBottom: space.xs + 2 },
  cta: { marginTop: space.sm },
})
