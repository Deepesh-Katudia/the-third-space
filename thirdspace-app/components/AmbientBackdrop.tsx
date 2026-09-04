import React, { useEffect, useMemo } from 'react'
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

/**
 * Half-amplitude of the drift, in px. The comp travels further; on a phone this reads.
 *
 * The drift is HORIZONTAL only. A vertical component used to ride alongside it, and on a
 * screen whose content scrolls vertically the eye reads a rising field as the background
 * itself shifting up with the scroll — the field is the one surface in the app that must
 * look nailed down. Sideways drift and the scale breathe below carry the same life
 * without ever competing with a scroll gesture.
 */
const DRIFT_X = 8

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

/**
 * The drivers, and the loops that run them, are MODULE-LEVEL — shared by every mounted
 * backdrop rather than created per instance.
 *
 * This is what makes the field look nailed down. Per-instance drivers start at phase 0,
 * so pushing `event/[id]` over Discover, or swapping `LoadingView` for the screen it was
 * standing in for, mounted a fresh field beside one that had been drifting for a minute:
 * the glows snapped to new positions and sizes at the exact moment the screen changed,
 * which reads as the background shifting under you. Sharing one phase means every mount
 * paints the field exactly where the last one left it.
 *
 * It also fixes the cost note this file used to carry. react-navigation keeps stacked
 * screens mounted, so a 3-deep stack was running three independent sets of ten loops.
 * Now there is one set no matter how deep the stack goes.
 */
const blobDrivers = BLOBS.map(() => new Animated.Value(0))
const sparkDrivers = SPARKS.map(() => new Animated.Value(0))

let mountCount = 0
let motionAllowed = false
let running: Animated.CompositeAnimation[] = []

const cycle = (value: Animated.Value, duration: number) =>
  Animated.loop(
    Animated.sequence([
      Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]),
  )

/**
 * Reconciles the running loops with what the app currently wants, rather than starting
 * and stopping from inside each effect. Instances mount and unmount in an order React
 * does not promise, and `reduceMotion` flips on every instance at once — deriving the
 * desired state from two counters and re-checking it is the only version of this that
 * cannot end up with loops running after the last backdrop is gone.
 */
function syncLoops() {
  const shouldRun = mountCount > 0 && motionAllowed
  if (shouldRun && running.length === 0) {
    // Offsetting each loop keeps the field from pulsing in lockstep, which reads as a
    // glitch rather than as drift.
    running = [
      ...blobDrivers.map((value, i) => cycle(value, motion.driftCycle + i * motion.driftStagger)),
      ...sparkDrivers.map((value, i) => cycle(value, motion.sparkCycle + i * motion.sparkStagger)),
    ]
    running.forEach((loop) => loop.start())
  } else if (!shouldRun && running.length > 0) {
    // Stopping leaves each driver at its current value, which is the point: the field
    // freezes where it is instead of snapping back to phase 0.
    running.forEach((loop) => loop.stop())
    running = []
  }
}

export function AmbientBackdrop() {
  const { width, height } = useWindowDimensions()
  const reduceMotion = useReduceMotion()

  useEffect(() => {
    mountCount += 1
    motionAllowed = !reduceMotion
    syncLoops()
    return () => {
      mountCount -= 1
      syncLoops()
    }
  }, [reduceMotion])

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
            { scale: driver.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] }) },
          ],
        }
      }),
    [width, height],
  )

  const sparks = useMemo(
    () =>
      SPARKS.map((spark, i) => ({
        ...spark,
        x: spark.xPct * width,
        y: spark.yPct * height,
        opacity: sparkDrivers[i].interpolate({ inputRange: [0, 1], outputRange: [0.12, 1] }),
      })),
    [width, height],
  )

  return (
    <View style={styles.field} pointerEvents="none" testID="ambient-backdrop">
      <LinearGradient
        colors={[palette.orangeDeep, palette.orangeLight]}
        style={StyleSheet.absoluteFill}
      />

      {blobs.map((blob) => (
        <Animated.View
          key={blob.key}
          testID="ambient-glow"
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
  /**
   * `overflow: hidden` is LOAD-BEARING, not tidiness.
   *
   * The rings are centred on anchors near the edges and pulled outward by negative
   * margins, so the field deliberately bleeds past the viewport on all four sides — the
   * rightmost blob alone reaches about 5% beyond the right edge, and the scale breathe
   * moves that boundary every frame. Unclipped, that bleed is real scrollable overflow,
   * and on web it becomes a scrollbar.
   *
   * That is where it turns into a loop rather than a cosmetic bug. A scrollbar takes
   * ~15px out of the viewport; every blob's position and radius is a fraction of the
   * viewport from `useWindowDimensions()`; so the field re-lays-out, the overflow
   * changes, and the scrollbar appears or disappears again. The layout oscillates
   * forever and the whole page visibly jitters — which is exactly what "the background
   * shifts when I scroll" looks like from the outside.
   *
   * Clipping here fixes it for every screen at once, because every screen mounts this.
   */
  field: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  /** Zero-size origin; rings centre themselves on it via negative margins. */
  anchor: { position: 'absolute', width: 0, height: 0 },
  ring: { position: 'absolute', left: 0, top: 0 },
  spark: { position: 'absolute', backgroundColor: palette.ambientSpark },
})
