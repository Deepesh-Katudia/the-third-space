import React, { useEffect, useState } from 'react'
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { getPushEnabled, setPushEnabled } from '../../services/pushTokens'

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>Push notifications</Text>
          <Text style={styles.rowHint}>Messages, announcements, and new connections</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={toggle}
          trackColor={{ true: '#FF9F3D', false: 'rgba(107,111,120,0.4)' }}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isPasswordUser ? (
        <TouchableOpacity style={styles.navRow} onPress={() => router.push('/(app)/change-password')} activeOpacity={0.7}>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Change password</Text>
            <Text style={styles.rowHint}>Update the password for your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6B6F78" />
        </TouchableOpacity>
      ) : null}

      <Text style={styles.footnote}>
        If notifications are turned off at the device level, enable them in your phone's Settings first.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 12, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A' },
  rowHint: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', marginTop: 3 },
  footnote: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', marginHorizontal: 24, marginTop: 12, lineHeight: 18 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginHorizontal: 24, marginTop: 10 },
})
