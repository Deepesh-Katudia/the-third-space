import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { Banner } from '../../components/Banner'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { palette, radius, space } from '../../constants/design'

type Role = 'attender' | 'hoster'

const ROLES: { role: Role; icon: string; title: string; body: string }[] = [
  {
    role: 'attender',
    icon: '👥',
    title: "I'm here to attend",
    body: "Join events, see who's going, connect with people before you arrive",
  },
  {
    role: 'hoster',
    icon: '🛡️',
    title: "I'm here to host",
    body: 'Create events, manage your guest list, build your community',
  },
]

export default function RoleSelect() {
  const [loading, setLoading] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelectRole = async (role: Role) => {
    const user = auth.currentUser
    if (!user) return

    setLoading(role)
    setError(null)

    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName ?? '',
          email: user.email ?? '',
          role,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
      // Attenders still need a profile before entering the app; hosters are done.
      ;(router.replace as (href: string) => void)(
        role === 'attender' ? '/(auth)/create-profile' : '/(app)'
      )
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code
      setError(
        code === 'permission-denied'
          ? 'Database permission denied — the Firestore security rules may not be deployed yet.'
          : `Couldn't save your role${code ? ` (${code})` : ''}. Please try again.`
      )
      setLoading(null)
    }
  }

  return (
    <Screen tone="cream">
      <View style={styles.content}>
        <Display role="screenTitle" style={styles.heading}>How will you use{'\n'}Your Third Space?</Display>
        <Body role="bodyLg" style={styles.subtitle}>
          Choose your role to get started. This can&apos;t be changed later — hosting needs its own account.
        </Body>

        {error ? <Banner message={error} /> : null}

        <View style={styles.cards}>
          {ROLES.map(({ role, icon, title, body }) => (
            <TouchableOpacity
              key={role}
              style={styles.card}
              onPress={() => handleSelectRole(role)}
              disabled={loading !== null}
              activeOpacity={0.75}
            >
              {loading === role ? (
                <ActivityIndicator color={palette.clay} size="large" />
              ) : (
                <>
                  <Text style={styles.icon}>{icon}</Text>
                  <Display style={styles.cardTitle}>{title}</Display>
                  <Body role="bodySm" style={styles.cardBody}>{body}</Body>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl + space.sm },
  heading: { marginBottom: space.sm },
  subtitle: { marginBottom: space.xxl },
  cards: { gap: space.lg },
  card: {
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    padding: space.xxl - space.xs,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  icon: { fontSize: 40, marginBottom: space.md },
  cardTitle: { marginBottom: space.xs + 2, textAlign: 'center' },
  cardBody: { textAlign: 'center' },
})
