import React from 'react'
import { TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { palette, space } from '../../constants/design'
import { Display, Body } from './Text'

interface BackButtonProps {
  /**
   * Where to land when there is nothing to pop. Push notifications router.push()
   * straight into chat/event/member, so on a cold start from a notification these
   * screens have no history and a bare back() would do nothing.
   */
  fallbackHref?: string
  /** Optional text beside the arrow — the auth screens read "← Back". */
  label?: string
  /** Override the pop entirely for screens that own their exit logic. */
  onPress?: () => void
  /** 'circle' is the filled variant that sits over the dark event-detail hero. */
  variant?: 'plain' | 'circle'
}

export function BackButton({ fallbackHref = '/(app)', label, onPress, variant = 'plain' }: BackButtonProps) {
  const router = useRouter()

  const handlePress = () => {
    if (onPress) {
      onPress()
      return
    }
    if (router.canGoBack()) router.back()
    else (router.replace as (href: string) => void)(fallbackHref)
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={[styles.base, variant === 'circle' ? styles.circle : styles.plain]}
    >
      <Display style={variant === 'circle' ? styles.arrowOnInk : styles.arrow}>←</Display>
      {label ? <Body role="bodySm">{label}</Body> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  plain: { alignSelf: 'flex-start' },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 24 },
  arrowOnInk: { fontSize: 24, color: palette.cream },
})
