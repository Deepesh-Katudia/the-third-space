import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Body } from './ui/Text'

const FADE_MS = 200
const VISIBLE_MS = 2800

interface ToastProps {
  message: string
  onDismiss: () => void
}

/** Small self-dismissing pill. Render conditionally on a non-empty message. */
export function Toast({ message, onDismiss }: ToastProps) {
  const anim = useRef(new Animated.Value(0)).current
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss

  useEffect(() => {
    // The fade-in callback lands after unmount, so a bare clearTimeout would miss the
    // timer it schedules; `cancelled` is what actually stops the post-unmount dismiss.
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    Animated.timing(anim, { toValue: 1, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      if (cancelled) return
      timer = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: FADE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true })
          .start(() => { if (!cancelled) dismiss.current() })
      }, VISIBLE_MS)
    })
    return () => { cancelled = true; clearTimeout(timer) }
  }, [anim, message])

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] })

  return (
    <Animated.View style={[styles.toast, { opacity: anim, transform: [{ translateY }] }]} pointerEvents="none">
      <Body role="bodySm" tone="ink" style={styles.text} accessibilityLiveRegion="polite">{message}</Body>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: space.xl - space.xs, right: space.xl - space.xs, bottom: space.lg,
    backgroundColor: palette.orangeLight, borderRadius: radius.pill,
    borderWidth: 1, borderColor: palette.rule,
    paddingHorizontal: space.lg + 2, paddingVertical: space.md,
    shadowColor: palette.ink, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  text: { textAlign: 'center' },
})
