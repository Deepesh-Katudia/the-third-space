import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
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
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { palette, radius, space } from '../../constants/design'

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

  if (loading) return <LoadingView tone="cream" />

  if (hasError || !profile) {
    return (
      <Screen tone="cream">
        <StatusBar style="dark" />
        <EmptyState emoji="🫥" title="Profile unavailable" body="We couldn't load your settings. Try again." />
        <TouchableOpacity onPress={() => router.back()} style={styles.backCenter}>
          <Body role="bodySm">← Go back</Body>
        </TouchableOpacity>
      </Screen>
    )
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Display style={styles.back}>←</Display>
        </TouchableOpacity>
        <Display role="screenTitle">Who can message me</Display>
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
                <Display>{option.label}</Display>
                <Body role="bodySm" style={styles.rowHint}>{option.hint}</Body>
              </View>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

      <Body role="bodySm" style={styles.footnote}>
        This controls who can start a new conversation with you. People you&apos;ve already accepted can always reach you.
      </Body>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  back: { fontSize: 24 },
  card: {
    marginHorizontal: space.xl,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  rowText: { flex: 1, paddingRight: space.md },
  rowHint: { marginTop: 3 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.rule },
  backCenter: { alignItems: 'center', paddingBottom: space.xxl + space.sm },
  footnote: { marginHorizontal: space.xl, marginTop: space.md + 2 },
  error: { marginHorizontal: space.xl, marginTop: space.sm + 2 },
})
