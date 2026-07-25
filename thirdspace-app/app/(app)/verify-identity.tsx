import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { LoadingView } from '../../components/LoadingView'
import { AuthButton } from '../../components/AuthButton'
import { captureImage } from '../../services/photos'
import { submitVerification } from '../../services/profiles'
import { canSubmitVerification } from '../../utils/verification'

const VERIFY_DELAY_MS = 2000

type Phase = 'capture' | 'verifying' | 'done'

export default function VerifyIdentity() {
  const router = useRouter()
  const { from } = useLocalSearchParams<{ from?: string }>()
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.uid)

  const [idUri, setIdUri] = useState<string | null>(null)
  const [selfieUri, setSelfieUri] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('capture')
  const [error, setError] = useState('')

  const exit = () => {
    if (from === 'profile') router.back()
    else (router.replace as (href: string) => void)('/(app)')
  }

  const capture = async (kind: 'id' | 'selfie') => {
    try {
      const uri = await captureImage(kind)
      if (!uri) return
      if (kind === 'id') setIdUri(uri)
      else setSelfieUri(uri)
    } catch {
      // cancelled / denied — ignore
    }
  }

  const handleVerify = async () => {
    if (!user || !canSubmitVerification({ idUri, selfieUri })) return
    setPhase('verifying')
    setError('')
    await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS)) // simulated review
    try {
      await submitVerification(user.uid)
      setPhase('done')
    } catch {
      setPhase('capture')
      setError("Couldn't complete verification. Try again.")
    }
  }

  if (loading) return <LoadingView />

  const alreadyVerified = profile?.verified === true
  if (phase === 'done' || alreadyVerified) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={72} color="#2FA365" />
          <Text style={styles.doneTitle}>You're verified</Text>
          <Text style={styles.doneBody}>Your identity is confirmed. The verified badge now shows on your profile.</Text>
          <View style={styles.doneBtn}>
            <AuthButton label="Continue" onPress={exit} variant="primary" />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (phase === 'verifying') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F3D" />
          <Text style={styles.verifyingText}>Verifying your identity…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Verify your identity</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Your Third Space is for real, verified people. Add a photo of your ID and a selfie — we only use them to confirm it's you, and they're never stored.
        </Text>

        <CaptureSlot label="Photo of your ID" uri={idUri} onPress={() => capture('id')} />
        <CaptureSlot label="Selfie" uri={selfieUri} onPress={() => capture('selfie')} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <AuthButton
          label="Verify now"
          onPress={handleVerify}
          variant="primary"
          disabled={!canSubmitVerification({ idUri, selfieUri })}
        />
        <TouchableOpacity onPress={exit} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function CaptureSlot({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.slot} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      {uri ? (
        <Image source={{ uri }} style={styles.slotImg} />
      ) : (
        <View style={styles.slotEmpty}>
          <Ionicons name="camera-outline" size={24} color="#6B6F78" />
        </View>
      )}
      <View style={styles.slotText}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotHint}>{uri ? 'Captured · tap to retake' : 'Tap to capture'}</Text>
      </View>
      {uri ? <Ionicons name="checkmark-circle" size={22} color="#2FA365" /> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 28, color: '#15161A', letterSpacing: -0.5 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  subtitle: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#6B6F78', lineHeight: 22, marginBottom: 24 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  slotImg: { width: 56, height: 56, borderRadius: 10 },
  slotEmpty: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F3F5' },
  slotText: { flex: 1 },
  slotLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A' },
  slotHint: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', marginTop: 3 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#6B6F78' },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  verifyingText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#15161A', marginTop: 20 },
  doneTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#15161A', marginTop: 16, letterSpacing: -0.5 },
  doneBody: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#6B6F78', textAlign: 'center', lineHeight: 22, marginTop: 10 },
  doneBtn: { alignSelf: 'stretch', marginTop: 28 },
})
