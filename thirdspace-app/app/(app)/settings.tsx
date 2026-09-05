import React, { useEffect, useState } from 'react'
import { View, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { getPushEnabled, setPushEnabled } from '../../services/pushTokens'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

export default function Settings() {
  const router = useRouter()
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(true)
  const [error, setError] = useState('')

  // Only email/password accounts have a password to change; Google/Apple do not.
  const isPasswordUser = user?.providerData?.some((p) => p.providerId === 'password') ?? false

  useEffect(() => {
    if (!user) return
    let cancelled = false
    getPushEnabled(user.uid).then((v) => {
      if (!cancelled) setEnabled(v)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const toggle = async (value: boolean) => {
    const previous = enabled
    setEnabled(value)
    setError('')
    if (user) {
      try {
        await setPushEnabled(user.uid, value)
      } catch {
        setEnabled(previous)
        setError('Couldn\'t update. Try again.')
      }
    }
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Settings</Display>
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Display>Push notifications</Display>
          <Body role="bodySm" style={styles.rowHint}>Messages, announcements, and new connections</Body>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ true: palette.clay, false: palette.rule }}
          thumbColor={palette.cream}
        />
      </View>
      {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

      {isPasswordUser ? (
        <TouchableOpacity style={styles.navRow} onPress={() => router.push('/(app)/change-password')} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Display>Change password</Display>
            <Body role="bodySm" style={styles.rowHint}>Update the password for your account</Body>
          </View>
          <Ionicons name="chevron-forward" size={20} color={palette.inkSoft} />
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.navRow} onPress={() => router.push('/(app)/blocked-users')} activeOpacity={0.7}>
        <View style={styles.rowText}>
          <Display>Blocked members</Display>
          <Body role="bodySm" style={styles.rowHint}>Who you have blocked, and how to undo it</Body>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.inkSoft} />
      </TouchableOpacity>

      <Body role="bodySm" style={styles.footnote}>
        If notifications are turned off at the device level, enable them in your phone&apos;s Settings first.
      </Body>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.xl,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.xl,
    marginTop: space.md,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  rowText: { flex: 1, paddingRight: space.md },
  rowHint: { marginTop: 3 },
  footnote: { marginHorizontal: space.xl, marginTop: space.md },
  error: { marginHorizontal: space.xl, marginTop: space.sm + 2 },
})
