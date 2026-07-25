import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface BannerProps {
  message: string
  tone?: 'error' | 'success'
}

export function Banner({ message, tone = 'error' }: BannerProps) {
  const isError = tone === 'error'
  return (
    <View style={[styles.banner, isError ? styles.error : styles.success]}>
      <Text style={[styles.text, isError ? styles.errorText : styles.successText]}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  error: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  success: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  text: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  errorText: { color: '#FF3B30' },
  successText: { color: '#2FA365' },
})
