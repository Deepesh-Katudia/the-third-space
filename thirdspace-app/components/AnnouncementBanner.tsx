import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Announcement } from '../types/models'

interface AnnouncementBannerProps {
  announcement: Announcement
  onPress: () => void
}

export function AnnouncementBanner({ announcement, onPress }: AnnouncementBannerProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.label}>📣 Latest from the host</Text>
      <Text style={styles.text} numberOfLines={3}>{announcement.text}</Text>
      <Text style={styles.cta}>Open chat →</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'rgba(242,197,160,0.22)', borderLeftWidth: 3, borderLeftColor: '#C4614A', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#6B3F2A', letterSpacing: 0.4, marginBottom: 6 },
  text: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  cta: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4614A', marginTop: 8 },
})
