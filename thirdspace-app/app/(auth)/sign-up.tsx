import React, { useMemo, useState } from 'react'
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, OAuthProvider } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { Ionicons } from '@expo/vector-icons'
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/legal'
import { stampTermsAcceptance } from '../../services/account'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { auth, functions } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { PasswordStrengthMeter } from '../../components/PasswordStrengthMeter'
import { validateSignUpForm, SignUpFormErrors, toE164 } from '../../utils/validation'
import { evaluatePassword } from '../../utils/password'
import { generateNonce } from '../../utils/crypto'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { StatusBar } from 'expo-status-bar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, space } from '../../constants/design'

WebBrowser.maybeCompleteAuthSession()

export default function SignUp() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const { promptGoogleSignIn, isGoogleLoading } = useGoogleAuth({
    onSuccess: async () => {
      // The hook reports success without handing back the credential, so the uid comes
      // from auth.currentUser — which is set by the time onSuccess fires.
      const uid = auth.currentUser?.uid
      if (uid) await stampTermsAcceptance(uid)
      router.replace('/(auth)/role-select')
    },
    onError: setBanner,
  })

  const passwordEval = useMemo(() => evaluatePassword(password, { email, name }), [password, email, name])
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  // The box gates the button as well as the validator: an inert button says "not yet"
  // before a tap, where an error message only says it afterwards.
  const canSubmit = passwordEval.meetsMinimum && passwordsMatch && termsAccepted

  const handleEmailSignUp = async () => {
    const formErrors = validateSignUpForm({ name, email, phone, password, confirmPassword, termsAccepted })
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return }
    setErrors({})
    setLoading(true)
    try {
      // A retry after a failed phone claim (see below) leaves the Auth account
      // already created and signed in — skip re-creating it in that case.
      let user = auth.currentUser
      if (!user || user.email !== email.trim()) {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        user = credential.user
        await updateProfile(user, { displayName: name.trim() })
      }
      await httpsCallable(functions, 'completeSignUp')({ phone: toE164(phone) })
      await stampTermsAcceptance(user.uid)
      router.replace('/(auth)/role-select')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'functions/already-exists') {
        setErrors({ phone: 'This phone number is already registered.' })
        return
      }
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
        'auth/network-request-failed': 'No connection. Check your internet and try again.',
        'auth/operation-not-allowed': 'Email sign-up is not enabled. Contact support.',
        'auth/weak-password': 'That password is too weak. Use 8+ characters with a mix of letters, numbers, or symbols.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setBanner(messages[code] ?? 'Something went wrong. Try again.')
    } finally { setLoading(false) }
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
      const signedIn = await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
      // Apple and Google sign-ups accept the same terms as the email path: the checkbox
      // gates all three buttons, so the acceptance is real for each of them.
      await stampTermsAcceptance(signedIn.user.uid)
      router.replace('/(auth)/role-select')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_CANCELED') return
      setBanner('Apple sign-in failed. Try again.')
    } finally { setLoading(false) }
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
            <Display role="screenTitle" style={styles.title}>Create your account</Display>
            <Body role="bodyLg">Join Your Third Space — NYC&apos;s community app.</Body>
          </View>

          {banner ? <Banner message={banner} /> : null}

          <FormInput label="Full name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" placeholder="Samantha Aleman" />
          <FormInput label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" placeholder="you@example.com" />
          <FormInput
            label="Phone number"
            value={phone}
            onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 10))}
            error={errors.phone}
            prefix="+1"
            keyboardType="phone-pad"
            maxLength={10}
            placeholder="2125551234"
          />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="8+ characters, mixed types" />
          {password.length > 0 ? <PasswordStrengthMeter evaluation={passwordEval} /> : null}
          <FormInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry placeholder="Re-enter password" />

          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setTermsAccepted((v) => !v)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: termsAccepted }}
            accessibilityLabel="Accept the Terms of use and Privacy policy"
          >
            <Ionicons
              name={termsAccepted ? 'checkbox' : 'square-outline'}
              size={22}
              color={termsAccepted ? palette.clay : palette.inkSoft}
            />
            <Body role="bodySm" style={styles.termsText}>
              I agree to the{' '}
              {/* Tappable inside the label, so reading the terms does not mean losing the
                  form: openBrowserAsync returns to this screen with state intact. */}
              <Body role="bodySm" tone="clay" onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}>
                Terms of use
              </Body>
              {' '}and{' '}
              <Body role="bodySm" tone="clay" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}>
                Privacy policy
              </Body>
              .
            </Body>
          </TouchableOpacity>
          {errors.termsAccepted ? (
            <Body role="bodySm" tone="clay" style={styles.termsError}>{errors.termsAccepted}</Body>
          ) : null}

          <View style={styles.buttons}>
            <AuthButton label="Create account" onPress={handleEmailSignUp} variant="primary" loading={loading || isGoogleLoading} disabled={!canSubmit} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Body role="bodySm">or continue with</Body>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={promptGoogleSignIn} variant="google" loading={loading || isGoogleLoading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignUp} variant="apple" loading={loading || isGoogleLoading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.footer}>
            <Body role="bodySm">Already have an account? <Meta role="eyebrow" tone="clay">Sign in</Meta></Body>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xxl, paddingBottom: space.xxl + space.sm },
  back: { marginBottom: space.xl },
  header: { marginBottom: space.xxl - space.xs },
  title: { marginBottom: space.sm },
  buttons: { marginTop: space.sm, gap: space.md },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.sm },
  termsText: { flex: 1 },
  termsError: { marginTop: space.xs },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.xs },
  dividerLine: { flex: 1, height: 1, backgroundColor: palette.rule },
  footer: { alignItems: 'center', marginTop: space.xl },
})
