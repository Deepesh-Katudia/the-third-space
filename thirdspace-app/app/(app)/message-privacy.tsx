import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { LoadingView } from '../../components/LoadingView'
import { EmptyState } from '../../components/EmptyState'
import { updateProfile } from '../../services/profiles'
import { MESSAGE_PRIVACY_OPTIONS, DEFAULT_MESSAGE_PRIVACY } from '../../utils/profile'
import { MessagePrivacy } from '../../types/models'

export default function MessagePrivacyScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading, hasError } = useProfile(user?.uid)
  const [pending, setPending] = useState<MessagePrivacy | null>(null)
  const [error, setError] = useState('')

  const selected = pending ?? profile?.messagePrivacy ?? DEFAULT_MESSAGE_PRIVACY

  const choose = async (value: MessagePrivacy) => {
    if (!user || value === selected) return
    const previous = pending
    setPending(value)
    setError('')
    try {
      await updateProfile(user.uid, { messagePrivacy: value })
    } catch {
      setPending(previous)
      setError("Couldn't update. Try again.")
    }
  }

  if (loading) return <LoadingView />

  if (hasError || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <EmptyState emoji="🫥" title="Profile unavailable" body="We couldn't load your settings. Try again." />
        <TouchableOpacity onPress={() => router.back()} style={styles.backCenter}>
          <Text style={styles.backCenterText}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Who can message me</Text>
      </View>

      <View style={styles.card}>
        {MESSAGE_PRIVACY_OPTIONS.map((option, index) => {
          const isSelected = option.value === selected
          const isLast = index === MESSAGE_PRIVACY_OPTIONS.length - 1
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.row, isLast && styles.rowLast]}
              onPress={() => choose(option.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{option.label}</Text>
                <Text style={styles.rowHint}>{option.hint}</Text>
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color="#FF9F3D" />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.footnote}>
        This controls who can start a new conversation with you. People you've already accepted can always reach you.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  card: { marginHorizontal: 24, backgroundColor: 'white', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(226,224,218,0.4)' },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A' },
  rowHint: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', marginTop: 3, lineHeight: 17 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(107,111,120,0.4)' },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backCenterText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  footnote: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', marginHorizontal: 24, marginTop: 14, lineHeight: 18 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginHorizontal: 24, marginTop: 10 },
})
