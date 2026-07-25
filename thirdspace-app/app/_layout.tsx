import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import {
  useFonts,
  Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins'
import { useAuth } from '../hooks/useAuth'
import { resolveAuthRoute } from '../utils/authRoute'
import { colors } from '../constants/theme'

interface AuthRedirectProps {
  user: import('firebase/auth').User | null
  role: 'attender' | 'hoster' | null
  hasProfile: boolean
  loading: boolean
}

function AuthRedirect({ user, role, hasProfile, loading }: AuthRedirectProps) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const target = resolveAuthRoute({
      hasUser: !!user,
      role,
      hasProfile,
      segment0: segments[0],
      segment1: segments[1],
    })
    if (target) (router.replace as (href: string) => void)(target)
  }, [user, role, hasProfile, loading, segments])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_800ExtraBold,
    Poppins_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  })
  const { user, role, hasProfile, loading } = useAuth()

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    )
  }

  return (
    <>
      <AuthRedirect user={user} role={role} hasProfile={hasProfile} loading={loading} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
