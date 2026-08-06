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
    if (!visible) {
      ;[enter, bob, glow, glowPulse, shimmer, ...comets, ...puffs, ...texts, ...twinkles].forEach((v) =>
        v.setValue(0),
      )
      return
    }

    // Reduced motion: one fade for the whole cloud, nothing staggered, no loop at all.
    // Something must still mark the arrival or it blinks into existence — the same rule
    // RewardUnlock follows.
    if (reduceMotion) {
      ;[...puffs, ...texts].forEach((v) => v.setValue(1))
      glow.setValue(1)
      Animated.timing(enter, {
        toValue: 1,
        duration: cloudMotion.reducedIn,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start()
      return
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
    const glowLoop = Animated.sequence([Animated.delay(cloudMotion.glowIn), breathe(glowPulse, cloudMotion.glowCycle)])
    const twinkleLoops = twinkles.map((v, i) =>
      Animated.sequence([
        Animated.delay(cloudMotion.twinkleDelay + i * (cloudMotion.twinkleCycle / 2)),
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
          COMETS.map((c, i) => (
            <Animated.View
              key={c.key}
              pointerEvents="none"
              style={[
                styles.cometHalo,
                {
                  top: c.topPct * windowHeight,
                  left: c.leftPct * windowWidth,
                  width: c.size * 2.6,
                  height: c.size * 2.6,
                  borderRadius: c.size * 1.3,
                  opacity: comets[i].interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 0] }),
                  transform: [{ scale: comets[i].interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.3, 1.1, 0.5] }) }],
                },
              ]}
            >
              <View style={[styles.cometDot, { width: c.size, height: c.size, borderRadius: c.size / 2 }]} />
            </Animated.View>
          ))}

        <View style={styles.center} pointerEvents="box-none">
          <Animated.View style={[styles.wrap, wrapStyle]}>
            {/* Radial falloff needs real SVG — the same reason RewardUnlock uses it. */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glow,
                {
                  opacity: Animated.multiply(
                    glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                    glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }),
                  ),
                },
              ]}
            >
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
                inside it and are therefore invisible. */}
            {!reduceMotion &&
              twinkles.map((t, i) => (
                <Animated.View
                  key={i}
                  pointerEvents="none"
                  style={[
                    i === 0 ? styles.twinkleLeft : styles.twinkleRight,
                    {
                      opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0, 0.85] }),
                      transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                    },
                  ]}
                >
                  <Meta style={styles.twinkleGlyph}>✦</Meta>
                </Animated.View>
              ))}

            <LinearGradient colors={[cloud.bodyTop, cloud.bodyBottom]} style={styles.body}>
              {PUFFS.map((p, i) => (
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
                      opacity: puffs[i],
                      transform: [{ scale: puffs[i].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                    },
                  ]}
                />
              ))}

              {!reduceMotion && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.shimmer,
                    {
                      opacity: shimmer.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9, 0] }),
                      transform: [
                        { skewX: '-18deg' },
                        {
                          translateX: shimmer.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-0.6 * CLOUD_WIDTH, 1.3 * CLOUD_WIDTH],
                          }),
                        },
                      ],
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

              <Animated.View style={{ opacity: texts[0] }}>
                <Meta role="eyebrow" style={styles.eyebrow}>{prompt.eyebrow}</Meta>
              </Animated.View>
              <Animated.View style={{ opacity: texts[1] }}>
                <Display role="cardTitle" style={styles.title}>{prompt.title}</Display>
              </Animated.View>
              <Animated.View style={{ opacity: texts[2] }}>
                <Meta style={styles.bodyText}>{prompt.body}</Meta>
              </Animated.View>
              <Animated.View style={{ opacity: texts[3] }}>
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
            </LinearGradient>

            <Animated.View style={[styles.trail, { opacity: texts[4] }]} pointerEvents="none">
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

  body: {
    borderRadius: 38,
    paddingTop: space.xxl + 2,
    paddingHorizontal: space.xl - 2,
    paddingBottom: space.xl - 2,
    // Load-bearing: the puffs are meant to be clipped by this edge, as in the comp.
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cloud.bodyRim,
    shadowColor: cloud.bodyShadow,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 22,
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
