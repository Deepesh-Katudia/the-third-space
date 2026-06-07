import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, OAuthProvider } from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateSignUpForm, SignUpFormErrors } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { StatusBar } from 'expo-status-bar'

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignUp = async () => {
    const formErrors = validateSignUpForm({ name, email, password, confirmPassword })
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return }
    setErrors({})
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name.trim() })
      router.replace('/(app)/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
        'auth/network-request-failed': 'No connection. Check your internet and try again.',
        'auth/operation-not-allowed': 'Email sign-up is not enabled. Contact support.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setBanner(messages[code] ?? 'Something went wrong. Try again.')
    } finally { setLoading(false) }
  }

  const handleGoogleSignUp = async () => {
    setBanner('Google sign-in requires a development build. Use email sign-up for now.')
  }

  const handleAppleSignUp = async () => {
    setLoading(true)
    try {
      const { raw, hashed } = await generateNonce()
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
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
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join The Third Space — NYC's community app.</Text>
          </View>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput label="Full name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" placeholder="Samantha Aleman" />
          <FormInput label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" placeholder="you@example.com" />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="8+ characters" />
          <FormInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry placeholder="Re-enter password" />

          <View style={styles.buttons}>
            <AuthButton label="Create account" onPress={handleEmailSignUp} variant="primary" loading={loading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={handleGoogleSignUp} variant="google" loading={loading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignUp} variant="apple" loading={loading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? <Text style={styles.footerLink}>Sign in</Text></Text>
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
  header: { marginBottom: 32 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  buttons: { marginTop: 8, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(242,197,160,0.4)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footerLink: { color: '#C4614A', fontFamily: 'DMSans_500Medium' },
})
