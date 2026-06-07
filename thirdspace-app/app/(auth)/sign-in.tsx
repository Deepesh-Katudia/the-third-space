import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { signInWithEmailAndPassword, OAuthProvider, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { StatusBar } from 'expo-status-bar'

WebBrowser.maybeCompleteAuthSession()

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const idToken = googleResponse.params?.id_token
      if (!idToken) return
      const credential = GoogleAuthProvider.credential(idToken)
      setLoading(true)
      signInWithCredential(auth, credential)
        .then(() => router.replace('/(auth)/role-select'))
        .catch(() => setBanner('Google sign-in failed. Try again.'))
        .finally(() => setLoading(false))
    }
  }, [googleResponse, router])

  const handleEmailSignIn = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address.'
    if (!password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/(app)/')
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

  const handleGoogleSignIn = () => promptGoogleAsync()

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
      router.replace('/(app)/')
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
            <Text style={styles.subtitle}>Sign in to your Third Space account.</Text>
          </View>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" placeholder="you@example.com" />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Your password" />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <AuthButton label="Sign in" onPress={handleEmailSignIn} variant="primary" loading={loading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={handleGoogleSignIn} variant="google" loading={loading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignIn} variant="apple" loading={loading} />
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
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  forgot: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4614A' },
  buttons: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(242,197,160,0.4)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footerLink: { color: '#C4614A', fontFamily: 'DMSans_500Medium' },
})
