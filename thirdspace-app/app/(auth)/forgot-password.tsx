import React, { useState } from 'react'
import { View, Text, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { validateEmail } from '../../utils/validation'
import { StatusBar } from 'expo-status-bar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { space } from '../../constants/design'

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
    <Screen tone="cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <View style={styles.back}>
          <BackButton label="Back" fallbackHref="/(auth)/sign-in" />
        </View>

        {sent ? (
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>📬</Text>
            <Display role="screenTitle" style={styles.successTitle}>Check your inbox</Display>
            <Body role="bodyLg" style={styles.successBody}>
              We sent a reset link to <Body role="bodyLg" tone="ink">{email}</Body>.{'\n'}It may take a minute to arrive.
            </Body>
            <AuthButton label="Back to sign in" onPress={() => router.replace('/(auth)/sign-in')} variant="ghost" />
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Display role="screenTitle" style={styles.title}>Reset password</Display>
              <Body role="bodyLg">Enter your email and we&apos;ll send you a reset link.</Body>
            </View>
            {errorBanner ? <Banner message={errorBanner} /> : null}
            <FormInput label="Email" value={email} onChangeText={setEmail} error={emailError} keyboardType="email-address" placeholder="you@example.com" />
            <View style={styles.cta}>
              <AuthButton label="Send reset link" onPress={handleReset} variant="primary" loading={loading} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  inner: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl + space.sm },
  back: { marginBottom: space.xxl },
  header: { marginBottom: space.xxl },
  title: { marginBottom: space.sm },
  cta: { marginTop: space.sm },
  successContainer: { flex: 1, justifyContent: 'center' },
  successEmoji: { fontSize: 48, textAlign: 'center', marginBottom: space.xl },
  successTitle: { textAlign: 'center', marginBottom: space.md },
  successBody: { textAlign: 'center', marginBottom: space.xxl },
})
