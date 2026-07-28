import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { signInWithEmailAndPassword, OAuthProvider, signInWithCredential } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { auth, functions } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { validateEmail, validatePhoneNumber, toE164 } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { StatusBar } from 'expo-status-bar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, space } from '../../constants/design'

WebBrowser.maybeCompleteAuthSession()

export default function SignIn() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const { promptGoogleSignIn, isGoogleLoading } = useGoogleAuth({
    onSuccess: () => router.replace('/(auth)/role-select'),
    onError: setBanner,
  })

  const handleEmailSignIn = async () => {
    const trimmed = identifier.trim()
    const digits = trimmed.replace(/\D/g, '')
    const isEmail = validateEmail(trimmed)
    const isPhone = !isEmail && validatePhoneNumber(digits)

    const newErrors: { identifier?: string; password?: string } = {}
    if (!isEmail && !isPhone) newErrors.identifier = 'Enter a valid email or 10-digit phone number.'
    if (!password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setLoading(true)
    try {
      let resolvedEmail = trimmed
      if (isPhone) {
        try {
          const result = await httpsCallable<{ phone: string }, { email: string }>(
            functions,
            'resolveEmailForPhone'
          )({ phone: toE164(digits) })
          resolvedEmail = result.data.email
        } catch {
          // Don't reveal whether the phone number exists — same generic message as wrong credentials.
          throw { code: 'auth/invalid-credential' }
        }
      }
      await signInWithEmailAndPassword(auth, resolvedEmail, password)
      router.replace('/(app)')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setBanner('Incorrect email or password.')
      } else if (code === 'auth/too-many-requests') {
        setBanner('Too many attempts. Try again later or reset your password.')
      } else {
        setBanner('Something went wrong. Check your connection and try again.')
      }
    } finally { setLoading(false) }
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    try {
      const { raw, hashed } = await generateNonce()
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
        nonce: hashed,
      })
      const provider = new OAuthProvider('apple.com')
      await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
      router.replace('/(app)')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_CANCELED') return
      setBanner('Apple sign-in failed. Try again.')
    }
    finally { setLoading(false) }
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.back}>
            <BackButton label="Back" fallbackHref="/(auth)/onboarding" />
          </View>

          <View style={styles.header}>
            <Display role="screenTitle" style={styles.title}>Welcome back</Display>
            <Body role="bodyLg">Sign in to Your Third Space.</Body>
          </View>

          {banner ? <Banner message={banner} /> : null}

          <FormInput
            label="Email or phone number"
            value={identifier}
            onChangeText={setIdentifier}
            error={errors.identifier}
            placeholder="you@example.com or 2125551234"
          />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Your password" />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
            <Meta role="eyebrow" tone="clay">Forgot password?</Meta>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <AuthButton label="Sign in" onPress={handleEmailSignIn} variant="primary" loading={loading || isGoogleLoading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Body role="bodySm">or continue with</Body>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={promptGoogleSignIn} variant="google" loading={loading || isGoogleLoading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignIn} variant="apple" loading={loading || isGoogleLoading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.footer}>
            <Body role="bodySm">New here? <Meta role="eyebrow" tone="clay">Create account</Meta></Body>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xxl + space.sm, paddingBottom: space.xxl + space.sm },
  back: { marginBottom: space.xxl },
  header: { marginBottom: space.xxl },
  title: { marginBottom: space.sm },
  forgot: { alignItems: 'flex-end', marginBottom: space.lg, marginTop: -space.sm },
  buttons: { gap: space.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.rule },
  footer: { alignItems: 'center', marginTop: space.xl },
})
