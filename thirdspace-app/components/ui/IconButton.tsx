import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { palette } from '../../constants/design'

interface IconButtonProps {
  name: React.ComponentProps<typeof Ionicons>['name']
  onPress: () => void
  accessibilityLabel: string
  size?: number
}

/** Ink circle with an orange-light glyph — the comp's "+" button. Never white on orange. */
export function IconButton({ name, onPress, accessibilityLabel, size = 30 }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Ionicons name={name} size={size * 0.55} color={palette.orangeLight} />
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: { backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
})
