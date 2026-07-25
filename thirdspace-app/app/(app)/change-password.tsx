import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { PasswordStrengthMeter } from '../../components/PasswordStrengthMeter'
import { validateChangePasswordForm, ChangePasswordFormErrors } from '../../utils/validation'
import { evaluatePassword } from '../../utils/password'
import { changePassword } from '../../services/auth'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/wrong-password': 'Your current password is incorrect.',
  'auth/invalid-credential': 'Your current password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/requires-recent-login': 'For security, sign out and sign in again before changing your password.',
  'auth/weak-password': 'That password is too weak. Choose a stronger one.',
}

export default function ChangePassword() {
  const router = useRouter()
  const { user } = useAuth()
  const email = user?.email ?? undefined

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const passwordEval = useMemo(() => evaluatePassword(newPassword, { email }), [newPassword, email])
  const canSubmit =
    currentPassword.length > 0 &&
    passwordEval.meetsMinimum &&
    newPassword !== currentPassword &&
    confirmNewPassword === newPassword

  const handleSubmit = async () => {
    const formErrors = validateChangePasswordForm({ currentPassword, newPassword, confirmNewPassword, email })
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }
    setErrors({})
    setBanner('')
    setLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      setDone(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      setBanner(ERROR_MESSAGES[code] ?? "Couldn't update your password. Try again.")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color="#2FA365" />
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successBody}>Use your new password next time you sign in.</Text>
          <View style={styles.successButton}>
            <AuthButton label="Back to settings" onPress={() => router.back()} variant="primary" />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Change password</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>Enter your current password, then choose a new one.</Text>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            error={errors.currentPassword}
            secureTextEntry
            placeholder="Your current password"
          />
          <FormInput
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            error={errors.newPassword}
            secureTextEntry
            placeholder="8+ characters, mixed types"
          />
          {newPassword.length > 0 ? <PasswordStrengthMeter evaluation={passwordEval} /> : null}
          <FormInput
            label="Confirm new password"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            error={errors.confirmNewPassword}
            secureTextEntry
            placeholder="Re-enter new password"
          />

          <View style={styles.submitWrap}>
            <AuthButton label="Update password" onPress={handleSubmit} variant="primary" loading={loading} disabled={!canSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 8, paddingBottom: 40 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#6B6F78', lineHeight: 21, marginBottom: 20 },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30' },
  submitWrap: { marginTop: 12 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  successTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#15161A', marginTop: 8 },
  successBody: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#6B6F78', textAlign: 'center', lineHeight: 21 },
  successButton: { alignSelf: 'stretch', marginTop: 16 },
})
