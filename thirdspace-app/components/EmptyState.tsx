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
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#2C1810', marginBottom: 8, textAlign: 'center' },
  body: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#8C7B70', textAlign: 'center' },
  action: { marginTop: 20, backgroundColor: '#C4614A', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  actionText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
})
