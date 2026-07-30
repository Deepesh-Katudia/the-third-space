import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Animated, Easing } from 'react-native'
import { motion } from '../constants/design'

export interface WelcomeReveal {
  mark: Animated.Value
  wordmark: Animated.Value
  tagline: Animated.Value
  sheet: Animated.Value
  /** null while the accessibility probe is still in flight. */
  reduceMotion: boolean | null
  skip: () => void
}

/**
 * Drives the one-shot welcome reveal. Values run 0 -> 1; the screen maps them to
 * opacity and translate.
 *
 * The reveal does not start until the reduced-motion probe resolves. That probe is a
 * fast native call and nothing is visible before markDelay anyway, so the wait costs
 * nothing — whereas starting first and discovering reduced motion afterwards would mean
 * animating at a user who asked not to be.
 */
export function useWelcomeReveal(): WelcomeReveal {
  const mark = useRef(new Animated.Value(0)).current
  const wordmark = useRef(new Animated.Value(0)).current
  const tagline = useRef(new Animated.Value(0)).current
  const sheet = useRef(new Animated.Value(0)).current

  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null)
  const running = useRef<Animated.CompositeAnimation | null>(null)

  const settle = useCallback(() => {
    mark.setValue(1)
    wordmark.setValue(1)
    tagline.setValue(1)
    sheet.setValue(1)
  }, [mark, wordmark, tagline, sheet])

  const skip = useCallback(() => {
    running.current?.stop()
    running.current = null
    settle()
  }, [settle])

  useEffect(() => {
    let mounted = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduceMotion(enabled) })
      // A rejected probe must not freeze the screen — default to animating.
      .catch(() => { if (mounted) setReduceMotion(false) })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (reduceMotion === null) return

    if (reduceMotion) {
      settle()
      return
    }

    const track = (value: Animated.Value, delay: number, duration: number) =>
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ])

    const animation = Animated.parallel([
      track(mark, motion.markDelay, motion.markIn),
      track(wordmark, motion.wordmarkDelay, motion.wordmarkIn),
      track(tagline, motion.taglineDelay, motion.taglineIn),
      track(sheet, motion.sheetDelay, motion.sheetIn),
    ])

    running.current = animation
    animation.start(() => { running.current = null })

    return () => {
      animation.stop()
      running.current = null
    }
  }, [reduceMotion, mark, wordmark, tagline, sheet, settle])

  return { mark, wordmark, tagline, sheet, reduceMotion, skip }
}
