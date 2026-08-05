import React, { useEffect, useMemo, useRef } from 'react'
import { View, Animated, StyleSheet, Easing, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { palette, motion } from '../constants/design'
import { useReduceMotion } from '../hooks/useReduceMotion'

/**
 * The app-wide ambient background: a deep-to-light orange field with slow warm glows
 * drifting through it and a handful of twinkling sparks. Source comp:
 * docs/ambient-background-splash-and-home.html.
 *
 * Rendered by `components/ui/Screen`, which every route uses, and directly by the
 * onboarding screen and `LoadingView`. There is deliberately ONE implementation of the
 * field — the earlier `WelcomeBackdrop` was a near-identical second copy scoped to the
 * welcome screen, and two backdrops that are supposed to look the same eventually do not.
 */

/**
 * Rings per blob. React Native has no radial gradient (react-native-svg would force a
 * native rebuild, expo-linear-gradient is linear-only, expo-blur is not installed), so
 * the comp's `radial-gradient(...)` falloff is faked by stacking concentric circles of
 * one low-alpha colour. The centre accumulates; the outer edge stays at the token alpha.
 */
const RINGS = 5

/** Half-amplitude of the drift, in px. The comp travels further; on a phone this reads. */
const DRIFT_X = 8
const DRIFT_Y = 17

/**
 * Positions and radii are fractions of the window, sampled off the comp's 300x640 phone,
 * so the field composes at the same proportions on any screen.
 */
const BLOBS = [
  { key: 'gold',  xPct: 0.27, yPct: 0.15, rPct: 0.267, color: palette.ambientGlowGold },
  { key: 'peach', xPct: 0.84, yPct: 0.59, rPct: 0.200, color: palette.ambientGlowPeach },
  { key: 'cream', xPct: 0.77, yPct: 0.26, rPct: 0.167, color: palette.ambientGlowCream },
  { key: 'ember', xPct: 0.27, yPct: 0.77, rPct: 0.233, color: palette.ambientGlowEmber },
  { key: 'sand',  xPct: 0.62, yPct: 0.89, rPct: 0.142, color: palette.ambientGlowSand },
] as const

const SPARKS = [
  { key: 'a', xPct: 0.28, yPct: 0.18, size: 5 },
  { key: 'b', xPct: 0.74, yPct: 0.33, size: 4 },
  { key: 'c', xPct: 0.20, yPct: 0.64, size: 4 },
  { key: 'd', xPct: 0.62, yPct: 0.76, size: 5 },
  { key: 'e', xPct: 0.86, yPct: 0.14, size: 4 },
] as const

export function AmbientBackdrop() {
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReduceMotion()

  // One driver per blob and per spark, created once and reused across renders.
  const blobDrivers = useRef(BLOBS.map(() => new Animated.Value(0))).current
  const sparkDrivers = useRef(SPARKS.map(() => new Animated.Value(0))).current

  useEffect(() => {
    if (reduceMotion) return

    const cycle = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      )

    // Offsetting each loop keeps the field from pulsing in lockstep, which reads as a
    // glitch rather than as drift.
    const loops = [
      ...blobDrivers.map((value, i) => cycle(value, motion.driftCycle + i * motion.driftStagger)),
      ...sparkDrivers.map((value, i) => cycle(value, motion.sparkCycle + i * motion.sparkStagger)),
    ]

    loops.forEach((loop) => loop.start())
    return () => loops.forEach((loop) => loop.stop())
  }, [reduceMotion, blobDrivers, sparkDrivers])

  const blobs = useMemo(
    () =>
      BLOBS.map((blob, i) => {
        const driver = blobDrivers[i]
        // Alternating the x direction stops the whole field from sliding one way at once.
        const xDrift = i % 2 === 0 ? DRIFT_X : -DRIFT_X
        return {
          ...blob,
          x: blob.xPct * width,
          y: blob.yPct * height,
          radius: blob.rPct * width,
          transform: [
            { translateX: driver.interpolate({ inputRange: [0, 1], outputRange: [-xDrift, xDrift] }) },
            { translateY: driver.interpolate({ inputRange: [0, 1], outputRange: [DRIFT_Y, -DRIFT_Y] }) },
            { scale: driver.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] }) },
          ],
        }
      }),
    [width, height, blobDrivers],
  )

  const sparks = useMemo(
    () =>
      SPARKS.map((spark, i) => ({
        ...spark,
        x: spark.xPct * width,
        y: spark.yPct * height,
        opacity: sparkDrivers[i].interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }),
      })),
    [width, height, sparkDrivers],
  )

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="ambient-backdrop">
      <LinearGradient
        colors={[palette.orangeDeep, palette.orangeLight]}
        style={StyleSheet.absoluteFill}
      />

      {blobs.map((blob) => (
        <Animated.View
          key={blob.key}
          style={[styles.anchor, { left: blob.x, top: blob.y, transform: blob.transform }]}
        >
          {Array.from({ length: RINGS }, (_, ring) => {
            const r = blob.radius * ((RINGS - ring) / RINGS)
            return (
              <View
                key={ring}
                style={[
                  styles.ring,
                  { width: r * 2, height: r * 2, borderRadius: r, marginLeft: -r, marginTop: -r, backgroundColor: blob.color },
                ]}
              />
            )
          })}
        </Animated.View>
      ))}

      {sparks.map((spark) => (
        <Animated.View
          key={spark.key}
          style={[
            styles.spark,
            {
              left: spark.x,
              top: spark.y,
              width: spark.size,
              height: spark.size,
              borderRadius: spark.size / 2,
              opacity: spark.opacity,
            },
          ]}
        />
      ))}
    </View>
  )
}

AmbientBackdrop.displayName = 'AmbientBackdrop'

const styles = StyleSheet.create({
  /** Zero-size origin; rings centre themselves on it via negative margins. */
  anchor: { position: 'absolute', width: 0, height: 0 },
  ring: { position: 'absolute', left: 0, top: 0 },
  spark: { position: 'absolute', backgroundColor: palette.ambientSpark },
})
