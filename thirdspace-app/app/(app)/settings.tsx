import React, { useEffect, useState } from 'react'
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { getPushEnabled, setPushEnabled } from '../../services/pushTokens'

export default function Settings() {
  const router = useRouter()
  const { user } = useAuth()
  const [enabled, setEnabled] = useState(true)

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
    setEnabled(value)
    if (user) await setPushEnabled(user.uid, value)
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
          trackColor={{ true: '#C4614A', false: 'rgba(140,123,112,0.4)' }}
        />
      </View>
      <Text style={styles.footnote}>
        If notifications are turned off at the device level, enable them in your phone's Settings first.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  rowText: { flex: 1, paddingRight: 12 },
  rowLabel: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  rowHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginTop: 3 },
  footnote: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginHorizontal: 24, marginTop: 12, lineHeight: 18 },
})
