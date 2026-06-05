import React from 'react'
import { TouchableOpacity, Text, Platform, ActivityIndicator, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

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
      <LinearGradient colors={['#C4614A', '#E8855F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pillRadius}>
        <TouchableOpacity onPress={onPress} disabled={isDisabled} style={[styles.buttonBase, { opacity: isDisabled ? 0.7 : 1 }]}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.primaryLabel}>{label}</Text>}
        </TouchableOpacity>
      </LinearGradient>
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
  pillRadius: { borderRadius: 100, overflow: 'hidden' },
  buttonBase: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryLabel: { color: 'white', fontFamily: 'DMSans_500Medium', fontSize: 16 },
  googleButton: { backgroundColor: '#FFF9F4', borderRadius: 100, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  googleG: { fontSize: 18 },
  googleLabel: { color: '#2C1810', fontFamily: 'DMSans_500Medium', fontSize: 16 },
  appleButton: { backgroundColor: 'black', borderRadius: 100 },
  appleLabel: { color: 'white', fontFamily: 'DMSans_500Medium', fontSize: 16 },
  ghostButton: { borderRadius: 100, borderWidth: 1.5, borderColor: '#C4614A' },
  ghostLabel: { color: '#C4614A', fontFamily: 'DMSans_500Medium', fontSize: 16 },
})
