import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useFonts } from 'expo-font'
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter'
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono'
import { useAuth } from '../hooks/useAuth'
import { resolveAuthRoute } from '../utils/authRoute'
import { LoadingView } from '../components/LoadingView'
import { navigatorBackground } from '../constants/design'

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
    BebasNeue_400Regular,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
  })
  const { user, role, hasProfile, loading } = useAuth()

  // The very first frame of the app. LoadingView carries the ambient field, so the field
  // is already there before fonts resolve rather than fading in after them.
  if (!fontsLoaded || loading) return <LoadingView />

  return (
    <>
      <AuthRedirect user={user} role={role} hasProfile={hasProfile} loading={loading} />
      <Stack screenOptions={{ headerShown: false, contentStyle: navigatorBackground }} />
    </>
  )
}
