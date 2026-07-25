import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { signInWithEmailAndPassword, OAuthProvider, signInWithCredential } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { auth, functions } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail, validatePhoneNumber, toE164 } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { StatusBar } from 'expo-status-bar'

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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to Your Third Space.</Text>
          </View>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput
            label="Email or phone number"
            value={identifier}
            onChangeText={setIdentifier}
            error={errors.identifier}
            placeholder="you@example.com or 2125551234"
          />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Your password" />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <AuthButton label="Sign in" onPress={handleEmailSignIn} variant="primary" loading={loading || isGoogleLoading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={promptGoogleSignIn} variant="google" loading={loading || isGoogleLoading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignIn} variant="apple" loading={loading || isGoogleLoading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.footer}>
            <Text style={styles.footerText}>New here? <Text style={styles.footerLink}>Create account</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: '#15161A', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#6B6F78' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30' },
  forgot: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF9F3D' },
  buttons: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(226,224,218,0.4)' },
  dividerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  footerLink: { color: '#FF9F3D', fontFamily: 'Poppins_600SemiBold' },
})
