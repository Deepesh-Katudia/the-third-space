import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'

const PERKS = [
  { icon: '📅', title: 'Create events', body: 'Publish gatherings and open them up to your community.' },
  { icon: '📋', title: 'Manage your guest list', body: 'See who\'s coming and keep track of registrations.' },
  { icon: '🏠', title: 'Build a venue', body: 'Set up your space so members know where to find you.' },
]

export default function BecomeHost() {
  const router = useRouter()
  const { user, role } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const alreadyHost = role === 'hoster'

  const handleSwitch = async () => {
    if (!user || busy || alreadyHost) return
    setBusy(true)
    setError('')
    try {
      await updateDoc(doc(db, 'users', user.uid), { role: 'hoster' })
      // (app)/index redirects by role; the live useAuth subscription has already
      // flipped role to 'hoster' by the time we land there.
      ;(router.replace as (href: string) => void)('/(app)')
    } catch {
      setError("Couldn't switch to hosting. Try again.")
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Become a host</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.heading}>Start hosting on{'\n'}Your Third Space</Text>
        <Text style={styles.subtitle}>
          Switch your account to hosting to create events and grow your own community.
        </Text>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk.title} style={styles.perk}>
              <Text style={styles.perkIcon}>{perk.icon}</Text>
              <View style={styles.perkText}>
                <Text style={styles.perkTitle}>{perk.title}</Text>
                <Text style={styles.perkBody}>{perk.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <AuthButton
          label={alreadyHost ? 'You already host' : 'Switch to hosting'}
          onPress={handleSwitch}
          variant="primary"
          loading={busy}
          disabled={alreadyHost}
        />
        <Text style={styles.footnote}>
          You can keep attending events as a host. Your profile and connections stay with you.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  heading: { fontFamily: 'Poppins_800ExtraBold', fontSize: 30, color: '#15161A', letterSpacing: -0.5, marginBottom: 10 },
  subtitle: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#6B6F78', lineHeight: 22, marginBottom: 28 },
  perks: { gap: 16 },
  perk: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  perkIcon: { fontSize: 24 },
  perkText: { flex: 1 },
  perkTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', marginBottom: 3 },
  perkBody: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78', lineHeight: 19 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginTop: 16 },
  footer: { paddingHorizontal: 24, paddingBottom: 12 },
  footnote: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', textAlign: 'center', marginTop: 12, lineHeight: 18 },
})
