import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet, Text } from 'react-native'

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
      <Text style={styles.text} accessibilityLiveRegion="polite">{message}</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 20, right: 20, bottom: 16,
    backgroundColor: '#15161A', borderRadius: 100,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: '#15161A', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  text: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#F3F3F5', textAlign: 'center' },
})
