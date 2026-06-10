import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { auth } from '../firebase/config'

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID

// Google.useAuthRequest throws during render if the platform's client ID is
// undefined, which crashes the whole auth screen. A placeholder keeps the
// screen alive; promptGoogleSignIn is gated behind isGoogleAuthConfigured so
// the placeholder is never sent to Google.
const PLACEHOLDER_CLIENT_ID = 'google-auth-not-configured'

export const isGoogleAuthConfigured = Boolean(
  Platform.select({
    ios: IOS_CLIENT_ID,
    android: ANDROID_CLIENT_ID,
    default: WEB_CLIENT_ID,
  })
)

const NOT_CONFIGURED_MESSAGE =
  'Google sign-in is not set up yet. Use email or Apple instead.'
const FAILED_MESSAGE = 'Google sign-in failed. Try again.'

interface UseGoogleAuthOptions {
  onSuccess: () => void
  onError: (message: string) => void
}

export function useGoogleAuth({ onSuccess, onError }: UseGoogleAuthOptions) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const callbacksRef = useRef({ onSuccess, onError })
  callbacksRef.current = { onSuccess, onError }

  const [, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    webClientId: WEB_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
  })

  useEffect(() => {
    if (response?.type !== 'success') return
    const idToken = response.params?.id_token
    if (!idToken) return
    const credential = GoogleAuthProvider.credential(idToken)
    setIsGoogleLoading(true)
    signInWithCredential(auth, credential)
      .then(() => callbacksRef.current.onSuccess())
      .catch(() => callbacksRef.current.onError(FAILED_MESSAGE))
      .finally(() => setIsGoogleLoading(false))
  }, [response])

  const promptGoogleSignIn = () => {
    if (!isGoogleAuthConfigured) {
      callbacksRef.current.onError(NOT_CONFIGURED_MESSAGE)
      return
    }
    promptAsync()
  }

  return { promptGoogleSignIn, isGoogleLoading }
}
