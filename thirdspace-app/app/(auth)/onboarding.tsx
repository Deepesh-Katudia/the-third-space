import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { setOnboardingPrefs } from '../../services/preferences'
import { colors, font, gradients, radius } from '../../constants/theme'

interface PermissionRowProps {
  icon: 'location' | 'notifications'
  tint: string
  title: string
  body: string
  enabled: boolean
  onToggle: () => void
}

function PermissionRow({ icon, tint, title, body, enabled, onToggle }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={25} color={colors.white} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
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
            <Ionicons name="checkmark" size={15} color={colors.white} />
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

  const next = async () => {
    // Record the opt-ins before moving on. The OS notification prompt itself is raised
    // later by usePushRegistration, once the user is actually signed in.
    await setOnboardingPrefs({ location, notifications })
    router.push('/(auth)/sign-up')
  }

  return (
    <LinearGradient colors={gradients.sunset} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.flex}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.logoWrap}>
          {/* Three-dot mark, laid out with Views — react-native-svg would mean a native rebuild. */}
          <View style={styles.logo} accessibilityRole="image" accessibilityLabel="ThirdSpace">
            <View style={[styles.dot, { left: 8, top: 10 }]} />
            <View style={[styles.dot, { left: 30, top: 10 }]} />
            <View style={[styles.dot, { left: 19, top: 29 }]} />
          </View>
          <Text style={styles.wordmark}>ThirdSpace</Text>
        </View>

        <View style={styles.sheet}>
          <Text style={styles.heading}>Get Started</Text>

          <PermissionRow
            icon="location"
            tint={colors.primary}
            title="Location"
            body="To see people & groups near you"
            enabled={location}
            onToggle={() => setLocation((v) => !v)}
          />
          <PermissionRow
            icon="notifications"
            tint={colors.primaryLight}
            title="Notifications"
            body="So you never miss a thing"
            enabled={notifications}
            onToggle={() => setNotifications((v) => !v)}
          />

          <TouchableOpacity style={styles.next} onPress={next} activeOpacity={0.9}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signIn} onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.signInText}>Already have an account?</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  logoWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13 },
  logo: { width: 58, height: 58 },
  dot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: colors.inkSoft },
  wordmark: { fontFamily: font.extrabold, fontSize: 37, letterSpacing: -1.2, color: colors.inkSoft },

  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.sheet,
    marginHorizontal: 14,
    marginBottom: 16,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 20,
    shadowColor: '#78460A', shadowOpacity: 0.2, shadowRadius: 44, shadowOffset: { width: 0, height: 22 }, elevation: 12,
  },
  heading: { fontFamily: font.extrabold, fontSize: 29, color: colors.inkSoft, textAlign: 'center', marginBottom: 20 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  rowIcon: { width: 52, height: 52, borderRadius: radius.icon, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: font.bold, fontSize: 16.5, color: colors.inkSoft },
  rowBody: { fontFamily: font.medium, fontSize: 12.5, color: '#8A8A8A', marginTop: 1 },
  checkOn: { width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  checkOff: { width: 28, height: 28, borderRadius: radius.pill, borderWidth: 2, borderColor: '#D6D6D6' },

  next: { backgroundColor: colors.inkSoft, borderRadius: radius.pill, paddingVertical: 16, alignItems: 'center', marginTop: 22 },
  nextText: { fontFamily: font.bold, fontSize: 16.5, color: colors.white },
  signIn: { alignItems: 'center', marginTop: 14 },
  signInText: { fontFamily: font.semibold, fontSize: 13.5, color: '#A0A0A0' },
})
