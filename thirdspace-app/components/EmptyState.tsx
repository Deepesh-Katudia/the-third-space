import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Display, Body } from './ui/Text'

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
      <Display role="screenTitle" style={styles.title}>{title}</Display>
      <Body role="bodyLg" style={styles.body}>{body}</Body>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} style={styles.action}>
          <Body role="bodySm" tone="ink" style={styles.actionText}>{actionLabel}</Body>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: space.xxl + space.lg, paddingHorizontal: space.xl },
  emoji: { fontSize: 40, marginBottom: space.md },
  title: { marginBottom: space.sm, textAlign: 'center' },
  body: { textAlign: 'center' },
  // Ink pill, matching the primary CTA — orange stays reserved for accents.
  action: {
    marginTop: space.xl,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  actionText: { textAlign: 'center' },
})
