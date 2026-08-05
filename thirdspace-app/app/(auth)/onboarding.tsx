import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Animated, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingPrefs } from '../../services/preferences'
import { Display, Body, Meta } from '../../components/ui/Text'
import { AmbientBackdrop } from '../../components/AmbientBackdrop'
import { useWelcomeReveal } from '../../hooks/useWelcomeReveal'
import { palette, radius, space } from '../../constants/design'

interface PermissionRowProps {
  icon: 'location' | 'notifications'
  title: string
  body: string
  enabled: boolean
  onToggle: () => void
}

function PermissionRow({ icon, title, body, enabled, onToggle }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={25} color={palette.cream} />
      </View>
      <View style={styles.rowText}>
        <Display style={styles.rowTitle}>{title}</Display>
        <Body role="bodySm">{body}</Body>
      </View>
      <TouchableOpacity
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel={title}
      >
        {enabled ? (
          <View style={styles.checkOn}>
            <Ionicons name="checkmark" size={15} color={palette.cream} />
          </View>
        ) : (
          <View style={styles.checkOff} />
        )}
      </TouchableOpacity>
    </View>
  )
}

export default function Onboarding() {
  const router = useRouter()
  const [location, setLocation] = useState(true)
  const [notifications, setNotifications] = useState(true)

  const reveal = useWelcomeReveal()

  /** Maps a 0->1 driver to a upward slide, so each element rises as it fades in. */
  const rise = (value: Animated.Value, distance: number) => ({
    opacity: value,
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  })

  const next = async () => {
    // Record the opt-ins before moving on. The OS notification prompt itself is raised
    // later by usePushRegistration, once the user is actually signed in.
    await setOnboardingPrefs({ location, notifications })
    router.push('/(auth)/sign-up')
  }

  // accessible={false} so screen readers do not announce the whole screen as a
  // button. The skip is a convenience for sighted users waiting out the intro;
  // VoiceOver users get the reduced-motion path or can act on the real controls.
  return (
    <Pressable style={styles.field} onPress={reveal.skip} accessible={false}>
      <StatusBar style="dark" />
      {/* The same field every other screen carries — this is the comp's splash placement.
          It runs its own reduced-motion probe, so nothing is threaded through from the
          reveal timeline. */}
      <AmbientBackdrop />

      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.logoWrap}>
          <Animated.View style={[styles.markRow, { opacity: reveal.mark, transform: [{ scale: reveal.mark.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
            {/* Three-dot mark, laid out with Views — react-native-svg would mean a native rebuild. */}
            <View style={styles.logo} accessibilityRole="image" accessibilityLabel="ThirdSpace">
              <View style={[styles.dot, { left: 8, top: 10 }]} />
              <View style={[styles.dot, { left: 30, top: 10 }]} />
              <View style={[styles.dot, { left: 19, top: 29 }]} />
            </View>
          </Animated.View>

          <Animated.View style={rise(reveal.wordmark, 14)}>
            <Display role="screenTitle" style={styles.wordmark}>ThirdSpace</Display>
          </Animated.View>

          <Animated.View style={rise(reveal.tagline, 10)}>
            {/* ink rather than inkSoft: the tagline sits over the top of the field, the
                darkest part of the gradient, and this is the app's one hero line. */}
            <Meta role="eyebrow" tone="ink" style={styles.tagline}>Your Third Space awaits you...</Meta>
          </Animated.View>
        </View>

        {/* Cream sheet lifted off the field — the two-tone pairing that
            replaces the old sunset gradient. */}
        {/* React Native does not exclude opacity:0 views from hit testing (unlike CSS
            visibility:hidden) — the sheet's buttons are tappable during the intro unless
            explicitly disabled here, which would invert the "tap anywhere skips" screen. */}
        <Animated.View style={rise(reveal.sheet, 48)} pointerEvents={reveal.revealed ? 'auto' : 'none'}>
          <View style={styles.sheet}>
            <Display role="screenTitle" style={styles.heading}>Get Started</Display>

            <PermissionRow
              icon="location"
              title="Location"
              body="To see people & groups near you"
              enabled={location}
              onToggle={() => setLocation((v) => !v)}
            />
            <PermissionRow
              icon="notifications"
              title="Notifications"
              body="So you never miss a thing"
              enabled={notifications}
              onToggle={() => setNotifications((v) => !v)}
            />

            <TouchableOpacity style={styles.next} onPress={next} activeOpacity={0.9}>
              <Body role="button" style={styles.onInk}>Next</Body>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signIn} onPress={() => router.push('/(auth)/sign-in')}>
              <Meta role="eyebrow" tone="clay">Already have an account?</Meta>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  field: { flex: 1 },
  flex: { flex: 1 },
  logoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  markRow: { alignItems: 'center' },
  logo: { width: 58, height: 58 },
  dot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: palette.ink },
  wordmark: { fontSize: 37, lineHeight: 45, letterSpacing: 0.5 },
  /** eyebrow is 10px — too small for a hero line. Face, caps and tracking stay from the token. */
  tagline: { fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.lg },

  sheet: {
    backgroundColor: palette.cream,
    borderRadius: radius.sheet,
    borderWidth: 1,
    borderColor: palette.rule,
    marginHorizontal: space.md + 2,
    marginBottom: space.lg,
    paddingHorizontal: space.xl - 2,
    paddingTop: space.xl + 2,
    paddingBottom: space.xl - 4,
  },
  heading: { textAlign: 'center', marginBottom: space.xl - 4 },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, marginBottom: space.lg },
  rowIcon: { width: 52, height: 52, borderRadius: radius.ticket + 2, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { marginBottom: 1 },
  checkOn: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  checkOff: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2, borderColor: palette.rule },

  next: { backgroundColor: palette.ink, borderRadius: radius.pill, paddingVertical: space.lg, alignItems: 'center', marginTop: space.xl - 2 },
  onInk: { color: palette.cream },
  signIn: { alignItems: 'center', marginTop: space.md + 2 },
})
