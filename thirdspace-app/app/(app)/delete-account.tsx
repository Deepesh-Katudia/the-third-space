import React, { useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { deleteMyAccount, isPasswordAccount } from '../../services/account'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

/** Typed exactly, or the button stays inert. Deliberately not case-insensitive. */
const CONFIRMATION = 'DELETE'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/wrong-password': 'That password is incorrect.',
  'auth/invalid-credential': 'That password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/requires-recent-login': 'For security, sign out and sign in again, then delete your account.',
}

/**
 * Account deletion, App Store Guideline 5.1.1(v).
 *
 * The consequences are on the screen rather than in a support article, including the one
 * that is not obvious: past events the member attended stay on the record, because other
 * people's history and points depend on them.
 */
export default function DeleteAccount() {
  const router = useRouter()
  const needsPassword = isPasswordAccount()

  const [confirmation, setConfirmation] = useState('')
  const [password, setPassword] = useState('')
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const canSubmit = confirmation === CONFIRMATION && (!needsPassword || password.length > 0) && !loading

  const handleDelete = async () => {
    if (!canSubmit) return
    setBanner('')
    setLoading(true)
    try {
      await deleteMyAccount(needsPassword ? password : undefined)
      // Only on success. The service signs out after the cascade lands, so this is the
      // first moment there is no account to come back to.
      router.replace('/(auth)/onboarding')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      // Stay put and stay signed in: the account still exists, and navigating away would
      // strand somebody who believes it is gone while their data is still there.
      setBanner(ERROR_MESSAGES[code] ?? "We couldn't delete your account. Try again, or contact support.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <BackButton />
          <Display role="screenTitle">Delete account</Display>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {banner ? <Banner message={banner} /> : null}

          <Body role="bodyLg" style={styles.lead}>
            This is permanent. There is no undo, and support cannot restore it.
          </Body>

          <View style={styles.panel}>
            <Meta role="eyebrow" style={styles.panelLabel}>What gets deleted</Meta>
            <Body role="bodySm" style={styles.item}>Your profile, photos and clips</Body>
            <Body role="bodySm" style={styles.item}>Every message you have sent, in group chats and DMs</Body>
            <Body role="bodySm" style={styles.item}>Your registrations, points and rewards</Body>
            <Body role="bodySm" style={styles.item}>Everyone you follow, and everyone following you</Body>
          </View>

          <View style={styles.panel}>
            <Meta role="eyebrow" style={styles.panelLabel}>What stays</Meta>
            <Body role="bodySm" style={styles.item}>
              Past events you attended stay on the record, because other members&apos;
              history and points depend on them. Your name comes off them.
            </Body>
            <Body role="bodySm" style={styles.item}>
              If you host, upcoming events are cancelled so nobody turns up to a night with
              no host.
            </Body>
          </View>

          <FormInput
            label={`Type ${CONFIRMATION} to confirm`}
            accessibilityLabel="Type DELETE to confirm"
            placeholder={CONFIRMATION}
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {needsPassword ? (
            <FormInput
              label="Current password"
              accessibilityLabel="Current password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          ) : null}

          <View style={styles.action}>
            <AuthButton
              label="Delete my account"
              onPress={handleDelete}
              disabled={!canSubmit}
              loading={loading}
            />
          </View>

          <Body role="bodySm" style={styles.footnote}>
            Changed your mind? Use the back arrow — nothing has happened yet.
          </Body>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  lead: { marginBottom: space.lg },
  panel: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: palette.rule,
    padding: space.lg,
    marginBottom: space.lg,
  },
  panelLabel: { marginBottom: space.sm },
  item: { marginBottom: space.xs + 2 },
  action: { marginTop: space.md },
  footnote: { marginTop: space.md },
})
