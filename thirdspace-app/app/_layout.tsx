import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans'
import { useAuth } from '../hooks/useAuth'

interface AuthRedirectProps {
  user: import('firebase/auth').User | null
  role: 'attender' | 'hoster' | null
  loading: boolean
}

function AuthRedirect({ user, role, loading }: AuthRedirectProps) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'
    const onRoleSelect = segments[1] === 'role-select'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (user && !role && !onRoleSelect) {
      router.replace('/(auth)/role-select')
    } else if (user && role && !inAppGroup) {
      router.replace('/(app)/')
    }
  }, [user, role, loading, segments])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  })
  const { user, role, loading } = useAuth()

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C1810' }}>
        <ActivityIndicator color="#C4614A" size="large" />
      </View>
    )
  }

  return (
    <>
      <AuthRedirect user={user} role={role} loading={loading} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
