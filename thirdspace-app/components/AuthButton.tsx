import React from 'react'
import { TouchableOpacity, Text, Platform, ActivityIndicator, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Body } from './ui/Text'

type Variant = 'primary' | 'google' | 'apple' | 'ghost'

interface AuthButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
}

export function AuthButton({ label, onPress, variant = 'primary', loading = false, disabled = false }: AuthButtonProps) {
  if (variant === 'apple' && Platform.OS !== 'ios') return null
  const isDisabled = disabled || loading

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.buttonBase, styles.primaryButton, { opacity: isDisabled ? 0.7 : 1 }]}
      >
        {loading
          ? <ActivityIndicator color={palette.cream} />
          : <Body role="button" style={styles.onInk}>{label}</Body>}
      </TouchableOpacity>
    )
  }
  if (variant === 'google') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.googleButton, { opacity: isDisabled ? 0.7 : 1 }]}>
        <Text style={styles.googleG}>G</Text>
        <Body role="button" tone="ink">{label}</Body>
      </TouchableOpacity>
    )
  }
  if (variant === 'apple') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.appleButton, { opacity: isDisabled ? 0.7 : 1 }]}>
        <Body role="button" style={styles.onInk}>{label}</Body>
      </TouchableOpacity>
    )
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.ghostButton, { opacity: isDisabled ? 0.7 : 1 }]}>
      <Body role="button" tone="ink">{label}</Body>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  buttonBase: { paddingVertical: space.lg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm },
  // The comp's primary CTA is the dark ink pill, not an orange fill — orange is reserved
  // for accents and icon buttons, where it carries ink glyphs rather than white ones.
  primaryButton: { backgroundColor: palette.ink, borderRadius: radius.pill },
  googleButton: { backgroundColor: palette.cream, borderRadius: radius.pill, borderWidth: 1, borderColor: palette.rule },
  googleG: { fontSize: 18 },
  appleButton: { backgroundColor: palette.ink, borderRadius: radius.pill },
  ghostButton: { borderRadius: radius.pill, borderWidth: 1.5, borderColor: palette.clay },
  // Cream on ink is 13.6:1. The palette has no white, by design.
  onInk: { color: palette.cream },
})
