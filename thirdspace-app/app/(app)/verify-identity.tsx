import React, { useState } from 'react'
import { View, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native'
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
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

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

  if (loading) return <LoadingView tone="cream" />

  const alreadyVerified = profile?.verified === true
  if (phase === 'done' || alreadyVerified) {
    return (
      <Screen tone="cream">
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={72} color={palette.sage} />
          <Display role="screenTitle" style={styles.doneTitle}>You&apos;re verified</Display>
          <Body role="bodyLg" style={styles.doneBody}>Your identity is confirmed. The verified badge now shows on your profile.</Body>
          <View style={styles.doneBtn}>
            <AuthButton label="Continue" onPress={exit} variant="primary" />
          </View>
        </View>
      </Screen>
    )
  }

  if (phase === 'verifying') {
    return (
      <Screen tone="cream">
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.clay} />
          <Display style={styles.verifyingText}>Verifying your identity…</Display>
        </View>
      </Screen>
    )
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        {/* exit() already knows both entry paths — replace()'d from create-profile
            (no history) vs push()'d from the profile tab. */}
        <BackButton onPress={exit} />
        <Display role="screenTitle">Verify your identity</Display>
      </View>
      <View style={styles.body}>
        <Body role="bodyLg" style={styles.subtitle}>
          Your Third Space is for real, verified people. Add a photo of your ID and a selfie — we only use them to confirm it&apos;s you, and they&apos;re never stored.
        </Body>

        <CaptureSlot label="Photo of your ID" uri={idUri} onPress={() => capture('id')} />
        <CaptureSlot label="Selfie" uri={selfieUri} onPress={() => capture('selfie')} />

        {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}
      </View>

      <View style={styles.footer}>
        <AuthButton
          label="Verify now"
          onPress={handleVerify}
          variant="primary"
          disabled={!canSubmitVerification({ idUri, selfieUri })}
        />
        <TouchableOpacity onPress={exit} style={styles.skip} hitSlop={8}>
          <Meta role="eyebrow" tone="clay">Skip for now</Meta>
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

function CaptureSlot({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.slot} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      {uri ? (
        <Image source={{ uri }} style={styles.slotImg} />
      ) : (
        <View style={styles.slotEmpty}>
          <Ionicons name="camera-outline" size={24} color={palette.inkSoft} />
        </View>
      )}
      <View style={styles.slotText}>
        <Display>{label}</Display>
        <Body role="bodySm" style={styles.slotHint}>{uri ? 'Captured · tap to retake' : 'Tap to capture'}</Body>
      </View>
      {uri ? <Ionicons name="checkmark-circle" size={22} color={palette.sage} /> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.sm },
  subtitle: { marginBottom: space.xl },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.md + 2,
    marginBottom: space.md + 2,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  slotImg: { width: 56, height: 56, borderRadius: 10 },
  slotEmpty: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.cream },
  slotText: { flex: 1, minWidth: 0 },
  slotHint: { marginTop: 3 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.lg },
  skip: { alignItems: 'center', paddingVertical: space.md + 2 },
  error: { marginTop: space.xs },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  verifyingText: { marginTop: space.xl - 4 },
  doneTitle: { marginTop: space.lg },
  doneBody: { textAlign: 'center', marginTop: space.sm + 2 },
  doneBtn: { alignSelf: 'stretch', marginTop: space.xxl - 4 },
})
