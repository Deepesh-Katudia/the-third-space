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
  card: { backgroundColor: 'rgba(226,224,218,0.22)', borderLeftWidth: 3, borderLeftColor: '#FF9F3D', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 24 },
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#3A3A3A', letterSpacing: 0.4, marginBottom: 6 },
  text: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#15161A', lineHeight: 21 },
  cta: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF9F3D', marginTop: 8 },
})
