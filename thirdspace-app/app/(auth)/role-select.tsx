import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'

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
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>How will you use{'\n'}Your Third Space?</Text>
        <Text style={styles.subtitle}>Choose your role to get started.</Text>

        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

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
                <ActivityIndicator color="#FF9F3D" size="large" />
              ) : (
                <>
                  <Text style={styles.icon}>{icon}</Text>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <Text style={styles.cardBody}>{body}</Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F3F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontFamily: 'Poppins_800ExtraBold',
    fontSize: 32,
    color: '#15161A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    color: '#6B6F78',
    marginBottom: 32,
  },
  banner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bannerText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#FF3B30',
  },
  cards: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    minHeight: 140,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    color: '#15161A',
    textAlign: 'center',
  },
  cardBody: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#6B6F78',
    textAlign: 'center',
    lineHeight: 20,
  },
})
