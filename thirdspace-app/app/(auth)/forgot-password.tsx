import React, { useState } from 'react'
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail } from '../../utils/validation'
import { StatusBar } from 'expo-status-bar'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorBanner, setErrorBanner] = useState('')

  const handleReset = async () => {
    if (!validateEmail(email)) { setEmailError('Please enter a valid email address.'); return }
    setEmailError('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      setErrorBanner(code === 'auth/user-not-found' ? 'No account found with that email address.' : 'Something went wrong. Check your connection and try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>📬</Text>
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successBody}>
              We sent a reset link to <Text style={styles.successEmail}>{email}</Text>.{'\n'}It may take a minute to arrive.
            </Text>
            <AuthButton label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} variant="ghost" />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Reset password</Text>
              <Text style={styles.subtitle}>Enter your email and we'll send you a reset link.</Text>
            </View>
            {errorBanner ? <View style={styles.banner}><Text style={styles.bannerText}>{errorBanner}</Text></View> : null}
            <FormInput label="Email" value={email} onChangeText={setEmail} error={emailError} keyboardType="email-address" placeholder="you@example.com" />
            <View style={{ marginTop: 8 }}>
              <AuthButton label="Send reset link" onPress={handleReset} variant="primary" loading={loading} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  back: { marginBottom: 32 },
  backText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: '#15161A', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#6B6F78' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30' },
  successContainer: { flex: 1, justifyContent: 'center' },
  successEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 24 },
  successTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#15161A', textAlign: 'center', marginBottom: 12, letterSpacing: -0.5 },
  successBody: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#6B6F78', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  successEmail: { color: '#3A3A3A', fontFamily: 'Poppins_600SemiBold' },
})
