import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface EmptyStateProps {
  emoji: string
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ emoji, title, body, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: '#15161A', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#6B6F78', textAlign: 'center' },
  action: { marginTop: 20, backgroundColor: '#FF9F3D', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  actionText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#15161A' },
})
