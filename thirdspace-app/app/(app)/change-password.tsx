import React, { useMemo, useState } from 'react'
import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { PasswordStrengthMeter } from '../../components/PasswordStrengthMeter'
import { validateChangePasswordForm, ChangePasswordFormErrors } from '../../utils/validation'
import { evaluatePassword } from '../../utils/password'
import { changePassword } from '../../services/auth'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { palette, space } from '../../constants/design'

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
      <Screen tone="cream">
        <StatusBar style="dark" />
        <View style={styles.successWrap}>
          <Ionicons name="checkmark-circle" size={64} color={palette.sage} />
          <Display role="screenTitle" style={styles.successTitle}>Password updated</Display>
          <Body role="bodyLg" style={styles.successBody}>Use your new password next time you sign in.</Body>
          <View style={styles.successButton}>
            <AuthButton label="Back to settings" onPress={() => router.back()} variant="primary" />
          </View>
        </View>
      </Screen>
    )
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Display style={styles.back}>←</Display>
          </TouchableOpacity>
          <Display role="screenTitle">Change password</Display>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Body role="bodyLg" style={styles.subtitle}>Enter your current password, then choose a new one.</Body>

          {banner ? <Banner message={banner} /> : null}

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
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { fontSize: 24 },
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.sm, paddingBottom: space.xxl + space.sm },
  subtitle: { marginBottom: space.xl - 4 },
  submitWrap: { marginTop: space.md },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl + space.sm, gap: space.md },
  successTitle: { marginTop: space.sm },
  successBody: { textAlign: 'center' },
  successButton: { alignSelf: 'stretch', marginTop: space.lg },
})
