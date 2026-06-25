import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, OAuthProvider } from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { InterestChip } from '../../components/InterestChip'
import { validateSignUpForm, SignUpFormErrors } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { useGoogleAuth } from '../../hooks/useGoogleAuth'
import { StatusBar } from 'expo-status-bar'

WebBrowser.maybeCompleteAuthSession()

const BIO_LIMIT = 300
const MIN_INTERESTS = 3
const INTEREST_OPTIONS = [
  'Art', 'Coffee', 'Film', 'Music', 'Hiking', 'Reading',
  'Fitness', 'Food', 'Photography', 'Nightlife', 'Wellness', 'Gaming',
  'Fashion', 'Travel', 'Vinyl', 'Cooking',
]

type Step = 'account' | 'profile'

export default function SignUp() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')

  // Account step
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  // Profile step (Phase 1: local only, no Firestore write yet)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])

  const { promptGoogleSignIn, isGoogleLoading } = useGoogleAuth({
    onSuccess: () => router.replace('/(auth)/role-select'),
    onError: setBanner,
  })

  const handleEmailSignUp = async () => {
    const formErrors = validateSignUpForm({ name, email, password, confirmPassword })
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return }
    setErrors({})
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name.trim() })
      setStep('profile')
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
      router.replace('/(auth)/role-select')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_CANCELED') return
      setBanner('Apple sign-in failed. Try again.')
    } finally { setLoading(false) }
  }

  const toggleInterest = (label: string) =>
    setInterests((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]))

  const canContinue = interests.length >= MIN_INTERESTS

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 'account' ? (
            <>
              <ProgressBar progress={0.33} step="Step 1 of 3" />
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
                <AuthButton label="Create account" onPress={handleEmailSignUp} variant="primary" loading={loading || isGoogleLoading} />
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>
                <AuthButton label="Continue with Google" onPress={promptGoogleSignIn} variant="google" loading={loading || isGoogleLoading} />
                <AuthButton label="Continue with Apple" onPress={handleAppleSignUp} variant="apple" loading={loading || isGoogleLoading} />
              </View>

              <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.footer}>
                <Text style={styles.footerText}>Already have an account? <Text style={styles.footerLink}>Sign in</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ProgressBar progress={0.66} step="Step 2 of 3" />
              <View style={styles.header}>
                <Text style={styles.title}>Make yourself real.</Text>
                <Text style={styles.subtitle}>A photo and a few interests help people recognize you at events.</Text>
              </View>

              <View style={styles.photoWrap}>
                <TouchableOpacity style={styles.photoSlot}>
                  <Text style={styles.photoPlus}>＋</Text>
                </TouchableOpacity>
                <Text style={styles.photoHint}>Add a photo</Text>
              </View>

              <Text style={styles.fieldLabel}>Short bio</Text>
              <TextInput
                style={styles.bioInput}
                placeholder="Illustrator, new to Brooklyn, always up for good coffee…"
                placeholderTextColor="#8C7B70"
                value={bio}
                onChangeText={(t) => setBio(t.slice(0, BIO_LIMIT))}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.counter}>{bio.length}/{BIO_LIMIT}</Text>

              <Text style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Text>
              <View style={styles.chipWrap}>
                {INTEREST_OPTIONS.map((label) => (
                  <InterestChip
                    key={label}
                    label={label}
                    selected={interests.includes(label)}
                    onPress={() => toggleInterest(label)}
                  />
                ))}
              </View>

              <View style={styles.continueWrap}>
                <AuthButton
                  label={canContinue ? 'Continue' : `Pick ${MIN_INTERESTS - interests.length} more`}
                  onPress={() => router.replace('/(auth)/role-select')}
                  variant="primary"
                  disabled={!canContinue}
                />
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

function ProgressBar({ progress, step }: { progress: number; step: string }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>
      <Text style={styles.progressStep}>{step}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 32, paddingBottom: 40 },

  progressContainer: { marginBottom: 28 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(242,197,160,0.4)', overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: '#C4614A' },
  progressStep: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', letterSpacing: 0.4 },

  header: { marginBottom: 28 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', lineHeight: 22 },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  buttons: { marginTop: 8, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(242,197,160,0.4)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footerLink: { color: '#C4614A', fontFamily: 'DMSans_500Medium' },

  photoWrap: { alignItems: 'center', marginBottom: 28 },
  photoSlot: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(242,197,160,0.25)', borderWidth: 1.5, borderColor: 'rgba(242,197,160,0.7)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  photoPlus: { fontSize: 32, color: '#C4614A' },
  photoHint: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },

  fieldLabel: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 10 },
  bioInput: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 14, padding: 16, minHeight: 96, fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', lineHeight: 21 },
  counter: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', alignSelf: 'flex-end', marginTop: 6, marginBottom: 24 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  continueWrap: { marginTop: 4 },
})
