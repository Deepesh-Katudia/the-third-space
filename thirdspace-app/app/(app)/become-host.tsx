import React, { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

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
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Become a host</Display>
      </View>

      <View style={styles.body}>
        <Display role="screenTitle" style={styles.heading}>Start hosting on{'\n'}Your Third Space</Display>
        <Body role="bodyLg" style={styles.subtitle}>
          Switch your account to hosting to create events and grow your own community.
        </Body>

        <View style={styles.perks}>
          {PERKS.map((perk) => (
            <View key={perk.title} style={styles.perk}>
              <Text style={styles.perkIcon}>{perk.icon}</Text>
              <View style={styles.perkText}>
                <Display style={styles.perkTitle}>{perk.title}</Display>
                <Body role="bodySm">{perk.body}</Body>
              </View>
            </View>
          ))}
        </View>

        {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}
      </View>

      <View style={styles.footer}>
        <AuthButton
          label={alreadyHost ? 'You already host' : 'Switch to hosting'}
          onPress={handleSwitch}
          variant="primary"
          loading={busy}
          disabled={alreadyHost}
        />
        <Body role="bodySm" style={styles.footnote}>
          You can keep attending events as a host. Your profile and connections stay with you.
        </Body>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  heading: { marginBottom: space.sm + 2 },
  subtitle: { marginBottom: space.xxl - space.xs },
  perks: { gap: space.lg },
  perk: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md + 2,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  perkIcon: { fontSize: 24 },
  perkText: { flex: 1, minWidth: 0 },
  perkTitle: { marginBottom: 3 },
  error: { marginTop: space.lg },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md },
  footnote: { textAlign: 'center', marginTop: space.md },
})
