import React from 'react'
import { TouchableOpacity, Text, Platform, ActivityIndicator, StyleSheet } from 'react-native'

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
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryLabel}>{label}</Text>}
      </TouchableOpacity>
    )
  }
  if (variant === 'google') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.googleButton, { opacity: isDisabled ? 0.7 : 1 }]}>
        <Text style={styles.googleG}>G</Text>
        <Text style={styles.googleLabel}>{label}</Text>
      </TouchableOpacity>
    )
  }
  if (variant === 'apple') {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.appleButton, { opacity: isDisabled ? 0.7 : 1 }]}>
        <Text style={styles.appleLabel}>{label}</Text>
      </TouchableOpacity>
    )
  }
  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, styles.ghostButton, { opacity: isDisabled ? 0.7 : 1 }]}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  buttonBase: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  // The comp's primary CTA is the dark ink pill, not an orange fill — orange is reserved
  // for accents and icon buttons, where it carries ink glyphs rather than white ones.
  primaryButton: { backgroundColor: '#1C1C1E', borderRadius: 100 },
  primaryLabel: { color: 'white', fontFamily: 'Poppins_700Bold', fontSize: 16 },
  googleButton: { backgroundColor: '#FFFFFF', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)' },
  googleG: { fontSize: 18 },
  googleLabel: { color: '#15161A', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  appleButton: { backgroundColor: 'black', borderRadius: 100 },
  appleLabel: { color: 'white', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  ghostButton: { borderRadius: 100, borderWidth: 1.5, borderColor: '#FF9F3D' },
  ghostLabel: { color: '#15161A', fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
})
