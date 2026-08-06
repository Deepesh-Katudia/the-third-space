import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated, Easing, Modal, Pressable, StyleSheet, TouchableOpacity, View, useWindowDimensions,
} from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Display, Meta } from './ui/Text'
import { cloud, cloudMotion, radius, space } from '../constants/design'
import { useReduceMotion } from '../hooks/useReduceMotion'
import type { CloudPrompt as Prompt } from '../constants/cloudPrompts'

/**
 * The cloud thought prompt. Source comp: docs/cloud-thought-prompt.html.
 *
 * Five beats, layered: a comet trail traces the path, the cloud lands with an overshoot,
 * its puffs bloom in one by one, a shimmer sweeps across once, and the text arrives last.
 * That layering is the whole design — flatten it and this is a slide-in with a caption.
 *
 * A `Modal`, like RewardUnlock, so it covers the tab bar. A prompt that left navigation
 * chrome visible would read as a toast rather than as the app thinking at you.
 */

const CLOUD_WIDTH = 230
const GLOW_W = 300
const GLOW_H = 240

/** Fractions of the window, so the trail holds its line on any screen. */
const COMETS = [
  { key: 'c1', topPct: 0.14, leftPct: 0.82, size: 6 },
  { key: 'c2', topPct: 0.2, leftPct: 0.74, size: 8 },
  { key: 'c3', topPct: 0.27, leftPct: 0.65, size: 7 },
  { key: 'c4', topPct: 0.33, leftPct: 0.57, size: 9 },
  { key: 'c5', topPct: 0.39, leftPct: 0.5, size: 6 },
  { key: 'c6', topPct: 0.44, leftPct: 0.45, size: 8 },
] as const

/** Clipped by the body's top edge — see the token comment. */
const PUFFS = [
  { key: 'p1', size: 70, top: -30, left: 14, color: cloud.puffLight },
  { key: 'p2', size: 90, top: -42, left: 60, color: cloud.puffMid },
  { key: 'p3', size: 64, top: -26, left: 140, color: cloud.puffLight },
] as const

const TRAIL = [7, 5, 3] as const

const TEXT_DELAYS = [
  cloudMotion.eyebrowDelay,
  cloudMotion.titleDelay,
  cloudMotion.bodyDelay,
  cloudMotion.ctaDelay,
  cloudMotion.trailDelay,
] as const

export interface CloudPromptProps {
  /** The prompt to show. Null renders nothing. */
  prompt: Prompt | null
  onDismiss: () => void
  onAct: (prompt: Prompt) => void
}

export function CloudPrompt({ prompt, onDismiss, onAct }: CloudPromptProps) {
  const reduceMotion = useReduceMotion()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()

  const enter = useRef(new Animated.Value(0)).current
  const bob = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0)).current
  const glowPulse = useRef(new Animated.Value(0)).current
  const shimmer = useRef(new Animated.Value(0)).current
  const comets = useRef(COMETS.map(() => new Animated.Value(0))).current
  const puffs = useRef(PUFFS.map(() => new Animated.Value(0))).current
  const texts = useRef(TEXT_DELAYS.map(() => new Animated.Value(0))).current
  const twinkles = useRef([new Animated.Value(0), new Animated.Value(0)]).current

  const visible = prompt !== null

  useEffect(() => {
    const allDrivers = [enter, bob, glow, glowPulse, shimmer, ...comets, ...puffs, ...texts, ...twinkles]

    if (!visible) {
      allDrivers.forEach((v) => v.setValue(0))
      return
    }

    // Reset every driver to 0 before branching on `reduceMotion`. `useReduceMotion`
    // starts `true` on the first render of every instance while its native probe is in
    // flight, so this effect runs the reduced branch below FIRST on the majority of
    // mounts (motion allowed, probe just hasn't answered yet). Without this reset, that
    // reduced branch would snap puffs/texts/glow to 1, and the real entrance that fires a
    // tick later — once the probe resolves `false` and this effect re-runs — would then
    // animate values that are already at their end state. Puff bloom, text cascade and
    // glow fade-in would be silently dead on the majority path.
    allDrivers.forEach((v) => v.setValue(0))

    // Reduced motion: one fade for the whole cloud, nothing staggered, no loop at all.
    // Something must still mark the arrival or it blinks into existence — the same rule
    // RewardUnlock follows.
    if (reduceMotion) {
      ;[...puffs, ...texts].forEach((v) => v.setValue(1))
      glow.setValue(1)
      const fade = Animated.timing(enter, {
        toValue: 1,
        duration: cloudMotion.reducedIn,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
      fade.start()
      // Unmounting (or the prompt clearing) mid-fade must not leave this ticking on a
      // detached node — the same leak class RewardUnlock and AmbientBackdrop both guard.
      return () => fade.stop()
    }

    const timing = (value: Animated.Value, duration: number, delay: number, easing: (t: number) => number) =>
      Animated.timing(value, { toValue: 1, duration, delay, easing, useNativeDriver: true })

    const entrance = Animated.parallel([
      // Monotonic on purpose — the overshoot lives in the interpolations below.
      timing(enter, cloudMotion.enterIn, 0, Easing.out(Easing.cubic)),
      timing(glow, cloudMotion.glowIn, cloudMotion.glowInDelay, Easing.out(Easing.ease)),
      ...comets.map((v, i) =>
        timing(v, cloudMotion.cometFlash, i * cloudMotion.cometStagger, Easing.out(Easing.ease)),
      ),
      ...puffs.map((v, i) =>
        timing(
          v,
          cloudMotion.puffBloom,
          cloudMotion.puffFirstDelay + i * cloudMotion.puffStagger,
          Easing.bezier(0.3, 1.4, 0.4, 1),
        ),
      ),
      timing(shimmer, cloudMotion.shimmerSweep, cloudMotion.shimmerDelay, Easing.inOut(Easing.ease)),
      ...texts.map((v, i) => timing(v, cloudMotion.textIn, TEXT_DELAYS[i], Easing.out(Easing.ease))),
    ])

    const breathe = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      )

    // The delay sits OUTSIDE the loop, so it is paid once rather than every cycle.
    const bobLoop = Animated.sequence([Animated.delay(cloudMotion.bobDelay), breathe(bob, cloudMotion.bobCycle)])
    // Starts at `glowPulseDelay` (1700ms), a beat after the glow's own fade-in has
    // finished (300 + 1350 = 1650ms) — see the token comment in constants/design.ts.
    const glowLoop = Animated.sequence([
      Animated.delay(cloudMotion.glowPulseDelay),
      breathe(glowPulse, cloudMotion.glowCycle),
    ])
    const twinkleLoops = twinkles.map((v, i) =>
      Animated.sequence([
        Animated.delay(cloudMotion.twinkleDelay + i * cloudMotion.twinkleStagger),
        breathe(v, cloudMotion.twinkleCycle),
      ]),
    )

    const all = [entrance, bobLoop, glowLoop, ...twinkleLoops]
    all.forEach((a) => a.start())
    return () => all.forEach((a) => a.stop())
  }, [visible, reduceMotion, enter, bob, glow, glowPulse, shimmer, comets, puffs, texts, twinkles])

  // The comp's cornerIn keyframes at 0 / 82% / 100%, reproduced literally.
  const wrapStyle = useMemo(() => {
    const opacity = enter.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] })
    if (reduceMotion) return { opacity, transform: [] }
    const translateY = Animated.add(
      enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [-64, 0, 0] }),
      bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
    )
    return {
      opacity,
      transform: [
        { translateX: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [78, 0, 0] }) },
        { translateY },
        { scale: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: [0.55, 1.045, 1] }) },
        { rotate: enter.interpolate({ inputRange: [0, 0.82, 1], outputRange: ['9deg', '0deg', '0deg'] }) },
      ],
    }
  }, [enter, bob, reduceMotion])

  // Everything below is memoised the way RewardUnlock memoises its motes — without it,
  // every parent re-render (Task 6's watcher subscribes to four live hooks) would build
  // fresh AnimatedInterpolation nodes for every comet, twinkle, puff and the shimmer,
  // detaching and reattaching the native props node mid-entrance.
  const cometStyles = useMemo(
    () =>
      COMETS.map((c, i) => {
        const driver = comets[i]
        return {
          key: c.key,
          size: c.size,
          // The comp positions the DOT itself at `top`/`left`. The halo is a size*2.6 box
          // centred on the dot, so its own top/left sit `size * 1.3` (half the extra
          // width the halo adds on each side) above and left of the dot's position.
          top: c.topPct * windowHeight - c.size * 1.3,
          left: c.leftPct * windowWidth - c.size * 1.3,
          opacity: driver.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
          scale: driver.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1.1, 0.5] }),
        }
      }),
    [windowWidth, windowHeight, comets],
  )

  const twinkleStyles = useMemo(
    () =>
      twinkles.map((driver) => ({
        opacity: driver.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
        scale: driver.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
      })),
    [twinkles],
  )

  const puffStyles = useMemo(
    () =>
      PUFFS.map((p, i) => {
        const driver = puffs[i]
        return {
          key: p.key,
          size: p.size,
          top: p.top,
          left: p.left,
          color: p.color,
          opacity: driver,
          scale: driver.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        }
      }),
    [puffs],
  )

  const shimmerStyle = useMemo(
    () => ({
      opacity: shimmer.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
      translateX: shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [-0.6 * CLOUD_WIDTH, 1.3 * CLOUD_WIDTH],
      }),
    }),
    [shimmer],
  )

  // The comp's `glowSoft` loop replaces (not multiplies against) the fade-in once it
  // takes over, swinging opacity 0.7-1.0 directly. `glow` now fades in to a full 1 rather
  // than 0.85, and `glowPulse` supplies the 0.7 floor — so once the loop starts (a beat
  // after the fade-in finishes, per `glowPulseDelay`) the product is exactly the comp's
  // 0.7-1.0 swing, with no discontinuity at the handoff since both sides meet at 0.7.
  const glowOpacity = useMemo(
    () => Animated.multiply(glow, glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] })),
    [glow, glowPulse],
  )

  // The comp's `textIn` keyframe animates BOTH opacity and a 6px translateY rise —
  // opacity alone was only half of it.
  const textStyles = useMemo(
    () =>
      texts.map((driver) => ({
        opacity: driver,
        transform: [{ translateY: driver.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
      })),
    [texts],
  )

  if (!prompt) return null

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.root} testID="cloud-prompt">
        <Pressable
          style={styles.scrim}
          onPress={onDismiss}
          testID="cloud-prompt-scrim"
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        {!reduceMotion &&
          cometStyles.map((c) => (
            <Animated.View
              key={c.key}
              pointerEvents="none"
              style={[
                styles.cometHalo,
                {
                  top: c.top,
                  left: c.left,
                  width: c.size * 2.6,
                  height: c.size * 2.6,
                  borderRadius: c.size * 1.3,
                  opacity: c.opacity,
                  transform: [{ scale: c.scale }],
                },
              ]}
            >
              <View style={[styles.cometDot, { width: c.size, height: c.size, borderRadius: c.size / 2 }]} />
            </Animated.View>
          ))}

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={[styles.wrap, wrapStyle]}>
            {/* Radial falloff needs real SVG — the same reason RewardUnlock uses it. */}
            <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]}>
              <Svg width={GLOW_W} height={GLOW_H}>
                <Defs>
                  <RadialGradient id="cloud-glow" cx="50%" cy="50%" rx="50%" ry="50%">
                    <Stop offset="0%" stopColor={cloud.glowCore} />
                    <Stop offset="70%" stopColor={cloud.glowEdge} />
                  </RadialGradient>
                </Defs>
                <Rect width={GLOW_W} height={GLOW_H} fill="url(#cloud-glow)" />
              </Svg>
            </Animated.View>

            {/* Outside the body's clip, so they actually render. In the comp they sit
                inside it and are therefore invisible. Decorative only — hidden from
                screen readers so they are never announced. */}
            {!reduceMotion &&
              twinkleStyles.map((t, i) => (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  importantForAccessibility="no-hide-descendants"
                  accessibilityElementsHidden
                  style={[
                    i === 0 ? styles.twinkleLeft : styles.twinkleRight,
                    { opacity: t.opacity, transform: [{ scale: t.scale }] },
                  ]}
                >
                  <Meta style={styles.twinkleGlyph}>✦</Meta>
                </Animated.View>
              ))}

            {/* The iOS shadow lives on this wrapper, not on the clipped body below —
                see the styles.bodyShadow comment. */}
            <View style={styles.bodyShadow}>
              <LinearGradient colors={[cloud.bodyTop, cloud.bodyBottom]} style={styles.body}>
                {puffStyles.map((p) => (
                  <Animated.View
                    key={p.key}
                    pointerEvents="none"
                    style={[
                      styles.puff,
                      {
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        top: p.top,
                        left: p.left,
                        backgroundColor: p.color,
                        opacity: p.opacity,
                        transform: [{ scale: p.scale }],
                      },
                    ]}
                  />
                ))}

                <Animated.View style={textStyles[0]}>
                  <Meta role="eyebrow" style={styles.eyebrow}>{prompt.eyebrow}</Meta>
                </Animated.View>
                <Animated.View style={textStyles[1]}>
                  <Display role="cardTitle" style={styles.title}>{prompt.title}</Display>
                </Animated.View>
                <Animated.View style={textStyles[2]}>
                  <Meta style={styles.bodyText}>{prompt.body}</Meta>
                </Animated.View>
                <Animated.View style={textStyles[3]}>
                  <TouchableOpacity
                    style={styles.cta}
                    onPress={() => onAct(prompt)}
                    testID="cloud-prompt-cta"
                    accessibilityRole="button"
                    activeOpacity={0.8}
                  >
                    <Meta role="eyebrow" style={styles.ctaLabel}>{prompt.cta}</Meta>
                  </TouchableOpacity>
                </Animated.View>

                {/* Painted last, over the text — the comp's shimmer sits above the copy
                    (z-index 3 vs 2) and its timing (1150-2250ms) is meant to glaze over
                    words that have already arrived (950-1400ms). RN paints in declaration
                    order, so this has to come after the text blocks, not before them. */}
                {!reduceMotion && (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.shimmer,
                      {
                        opacity: shimmerStyle.opacity,
                        transform: [{ skewX: '-18deg' }, { translateX: shimmerStyle.translateX }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[cloud.shimmerEdge, cloud.shimmerCore, cloud.shimmerEdge]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
                )}
              </LinearGradient>
            </View>

            <Animated.View style={[styles.trail, textStyles[4]]} pointerEvents="none">
              {TRAIL.map((size) => (
                <View key={size} style={[styles.trailDot, { width: size, height: size, borderRadius: size / 2 }]} />
              ))}
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  )
}

CloudPrompt.displayName = 'CloudPrompt'

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: cloud.scrim },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl - 4 },

  cometHalo: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: cloud.cometHalo },
  cometDot: { backgroundColor: cloud.comet },

  wrap: { width: CLOUD_WIDTH },
  glow: { position: 'absolute', top: '50%', left: '50%', marginTop: -GLOW_H / 2, marginLeft: -GLOW_W / 2, width: GLOW_W, height: GLOW_H },

  twinkleLeft: { position: 'absolute', top: -38, left: 24 },
  twinkleRight: { position: 'absolute', top: -46, right: 20 },
  twinkleGlyph: { color: cloud.twinkle, fontSize: 9, lineHeight: 12 },

  /**
   * The drop shadow, split off the clipped body below. `overflow: 'hidden'` on iOS sets
   * `masksToBounds`, which clips a layer's own shadow away along with its children — so a
   * shadow declared on the same style as the puffs' clip would never actually render. This
   * wrapper sits behind the body it wraps, fully covered by it — but still needs an OPAQUE
   * fill: without one, iOS can't derive a cheap shadowPath from the border shape and falls
   * back to alpha compositing (plus a dev-mode warning). `bodyBottom` is one of the two
   * gradient stops the body itself paints over this wrapper, so the fill is invisible.
   */
  bodyShadow: {
    borderRadius: 38,
    backgroundColor: cloud.bodyBottom,
    shadowColor: cloud.bodyShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  body: {
    borderRadius: 38,
    paddingTop: space.xxl + 2,
    paddingHorizontal: space.xl - 2,
    paddingBottom: space.xl - 2,
    // Load-bearing: the puffs are meant to be clipped by this edge, as in the comp.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cloud.bodyRim,
    // Android's elevation shadow is not clipped by overflow:hidden the way iOS's
    // shadow* props are, so it can stay here rather than move to the wrapper.
    elevation: 12,
  },
  puff: { position: 'absolute' },
  shimmer: { position: 'absolute', top: '-20%', left: 0, width: '60%', height: '140%' },

  eyebrow: { color: cloud.eyebrow, fontSize: 9, lineHeight: 13, letterSpacing: 1.44, marginBottom: space.xs + 2 },
  title: { color: cloud.title, fontSize: 21, lineHeight: 25, marginBottom: space.sm + 2 },
  bodyText: { color: cloud.body, fontSize: 9.5, lineHeight: 15, marginBottom: space.lg },
  cta: {
    alignSelf: 'flex-start',
    backgroundColor: cloud.ctaFill,
    borderRadius: radius.ticket,
    paddingVertical: space.sm + 1,
    paddingHorizontal: space.lg,
  },
  ctaLabel: { color: cloud.ctaLabel, fontSize: 9, letterSpacing: 0.54 },

  trail: { flexDirection: 'row', justifyContent: 'center', gap: space.sm - 2, marginTop: space.sm + 2 },
  trailDot: { backgroundColor: cloud.trail, opacity: 0.5 },
})
