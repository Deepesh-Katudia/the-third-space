import React, { useEffect, useMemo, useRef } from 'react'
import { View, Animated, StyleSheet, Easing, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { palette, motion } from '../constants/design'

/**
 * Six rings per blob. There is no react-native-svg in this project (adding it forces a
 * native rebuild) and no expo-blur, and expo-linear-gradient is linear-only — so a soft
 * radial falloff is faked by stacking concentric circles of the same low alpha. The
 * centre accumulates toward ~0.5, the outer edge stays at the token's alpha.
 */
const RINGS = 6

const DRIFT_PX = 10

/** Positions are fractions of the window so the field composes at any screen size. */
const BLOBS = [
  { key: 'warm-upper', xPct: 0.30, yPct: 0.20, radius: 150, color: palette.welcomeGlowWarm },
  { key: 'warm-right', xPct: 0.78, yPct: 0.36, radius: 110, color: palette.welcomeGlowWarm },
  { key: 'clay-lower', xPct: 0.33, yPct: 0.72, radius: 140, color: palette.welcomeGlowClay },
] as const

const SPARKS = [
  { key: 'a', xPct: 0.33, yPct: 0.22, size: 4 },
  { key: 'b', xPct: 0.66, yPct: 0.37, size: 4 },
  { key: 'c', xPct: 0.26, yPct: 0.64, size: 4 },
  { key: 'd', xPct: 0.55, yPct: 0.73, size: 3 },
  { key: 'e', xPct: 0.72, yPct: 0.58, size: 3 },
] as const

export interface WelcomeBackdropProps {
  /** When true no animation is created at all — not a slower one. */
  reduceMotion: boolean
}

export function WelcomeBackdrop({ reduceMotion }: WelcomeBackdropProps) {
  const { width, height } = useWindowDimensions()

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

    // Offsetting each loop keeps the field from pulsing in lockstep, which reads as
    // a glitch rather than as drift.
    const loops = [
      ...blobDrivers.map((value, i) => cycle(value, motion.driftCycle + i * 900)),
      ...sparkDrivers.map((value, i) => cycle(value, motion.sparkCycle + i * 400)),
    ]

    loops.forEach((loop) => loop.start())
    return () => loops.forEach((loop) => loop.stop())
  }, [reduceMotion, blobDrivers, sparkDrivers])

  const blobs = useMemo(
    () =>
      BLOBS.map((blob, i) => ({
        ...blob,
        x: blob.xPct * width,
        y: blob.yPct * height,
        translateY: blobDrivers[i].interpolate({
          inputRange: [0, 1],
          outputRange: [-DRIFT_PX, DRIFT_PX],
        }),
      })),
    [width, height, blobDrivers],
  )

  const sparks = useMemo(
    () =>
      SPARKS.map((spark, i) => ({
        ...spark,
        x: spark.xPct * width,
        y: spark.yPct * height,
        opacity: sparkDrivers[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 0.85],
        }),
      })),
    [width, height, sparkDrivers],
  )

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" testID="welcome-backdrop">
      <LinearGradient
        colors={[palette.welcomeSkyTop, palette.welcomeSkyBottom]}
        style={StyleSheet.absoluteFill}
      />

      {blobs.map((blob) => (
        <Animated.View
          key={blob.key}
          style={[styles.anchor, { left: blob.x, top: blob.y, transform: [{ translateY: blob.translateY }] }]}
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

WelcomeBackdrop.displayName = 'WelcomeBackdrop'

const styles = StyleSheet.create({
  /** Zero-size origin; rings centre themselves on it via negative margins. */
  anchor: { position: 'absolute', width: 0, height: 0 },
  ring: { position: 'absolute', left: 0, top: 0 },
  spark: { position: 'absolute', backgroundColor: palette.welcomeSpark },
})
