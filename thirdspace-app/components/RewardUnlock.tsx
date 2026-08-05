import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, Modal, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Mascot } from './Mascot'
import { Display, Meta } from './ui/Text'
import { reward, rewardMotion, radius, space } from '../constants/design'
import { useReduceMotion } from '../hooks/useReduceMotion'
import type { Achievement } from '../constants/achievements'

/**
 * The reward-unlock ceremony. Source comp: docs/reward_screen.html.
 *
 * The frame is constant — purple void, gold rays, rising motes, twin halos — and only the
 * mascot, title, prompt and points change. That is the whole idea: every unlock is
 * recognisably the same moment, so it reads as "one of these", not as a random popup.
 *
 * Rendered in a `Modal` rather than inline so it covers the tab bar too. An unlock that
 * left navigation chrome visible would not be a moment, it would be a toast.
 */

const CARD_WIDTH = 250
const BURST = 320
const RAY_COUNT = 12
const RAY_LENGTH = 180
const GLOW = 196

/** Corner pinpricks. Fractions of the card so they hold at any width. */
const STARS = [
  { key: 'a', xPct: 0.09, yPct: 0.05 },
  { key: 'b', xPct: 0.82, yPct: 0.09 },
  { key: 'c', xPct: 0.05, yPct: 0.19 },
  { key: 'd', xPct: 0.91, yPct: 0.14 },
]

const MOTES = [
  { key: 'm1', xPct: 0.14, size: 3, dur: 3200, delay: 0 },
  { key: 'm2', xPct: 0.26, size: 2, dur: 4100, delay: 500 },
  { key: 'm3', xPct: 0.4, size: 4, dur: 3600, delay: 1000 },
  { key: 'm4', xPct: 0.58, size: 2, dur: 4400, delay: 1500 },
  { key: 'm5', xPct: 0.72, size: 3, dur: 3500, delay: 300 },
  { key: 'm6', xPct: 0.86, size: 2, dur: 4000, delay: 2000 },
]

/** The void plus its three colour washes, as one SVG. Radial gradients need real SVG. */
function VoidField({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="void" cx="50%" cy="6%" rx="130%" ry="100%">
          {reward.voidStops.map((color, i) => (
            <Stop key={color} offset={`${reward.voidOffsets[i] * 100}%`} stopColor={color} />
          ))}
        </RadialGradient>
        <RadialGradient id="wash-pink" cx="26%" cy="14%" rx="55%" ry="38%">
          <Stop offset="0%" stopColor={reward.washPink} />
          <Stop offset="62%" stopColor={reward.washPink} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wash-blue" cx="78%" cy="10%" rx="48%" ry="36%">
          <Stop offset="0%" stopColor={reward.washBlue} />
          <Stop offset="65%" stopColor={reward.washBlue} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="wash-purple" cx="68%" cy="55%" rx="60%" ry="42%">
          <Stop offset="0%" stopColor={reward.washPurple} />
          <Stop offset="68%" stopColor={reward.washPurple} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill="url(#void)" />
      <Rect width={width} height={height} fill="url(#wash-pink)" />
      <Rect width={width} height={height} fill="url(#wash-blue)" />
      <Rect width={width} height={height} fill="url(#wash-purple)" />
    </Svg>
  )
}

/** One ray, drawn as a tapering gradient bar and rotated about its top end. */
function Ray({ angle }: { angle: number }) {
  return (
    <View style={[styles.rayAnchor, { transform: [{ rotate: `${angle}deg` }] }]}>
      <Svg width={3} height={RAY_LENGTH}>
        <Defs>
          <SvgLinearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={reward.rayTop} />
            <Stop offset="100%" stopColor={reward.rayTip} />
          </SvgLinearGradient>
        </Defs>
        <Rect width={3} height={RAY_LENGTH} fill="url(#ray)" />
      </Svg>
    </View>
  )
}

export interface RewardUnlockProps {
  /** The reward being celebrated. Null closes the modal. */
  achievement: Achievement | null
  onDismiss: () => void
  /** Label for the button. "Continue" by default; a queue can say how many are left. */
  ctaLabel?: string
}

export function RewardUnlock({ achievement, onDismiss, ctaLabel = 'Continue' }: RewardUnlockProps) {
  const reduceMotion = useReduceMotion()
  const { height: windowHeight } = useWindowDimensions()

  const enter = useRef(new Animated.Value(0)).current
  const glow = useRef(new Animated.Value(0)).current
  const burst = useRef(new Animated.Value(0)).current
  const ringA = useRef(new Animated.Value(0)).current
  const ringB = useRef(new Animated.Value(0)).current
  const moteDrivers = useRef(MOTES.map(() => new Animated.Value(0))).current

  const visible = achievement !== null

  // Entrance runs even under reduced motion — but as a straight fade, with no scale.
  // Something has to mark the arrival, or the modal simply blinks into existence.
  useEffect(() => {
    if (!visible) {
      enter.setValue(0)
      return
    }
    Animated.timing(enter, {
      toValue: 1,
      duration: reduceMotion ? 160 : rewardMotion.enterIn,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [visible, reduceMotion, enter])

  useEffect(() => {
    if (!visible || reduceMotion) return

    const breathe = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      )

    const spin = (value: Animated.Value, duration: number) =>
      Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }))

    const rise = (value: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      )

    const animations = [
      breathe(glow, rewardMotion.glowCycle),
      breathe(burst, rewardMotion.burstCycle),
      spin(ringA, rewardMotion.ringSpin),
      spin(ringB, rewardMotion.ringSpinSlow),
      ...moteDrivers.map((value, i) => rise(value, MOTES[i].dur, MOTES[i].delay)),
    ]

    animations.forEach((a) => a.start())
    return () => animations.forEach((a) => a.stop())
  }, [visible, reduceMotion, glow, burst, ringA, ringB, moteDrivers])

  const motes = useMemo(
    () =>
      MOTES.map((mote, i) => ({
        ...mote,
        translateY: moteDrivers[i].interpolate({ inputRange: [0, 1], outputRange: [0, -280] }),
        scale: moteDrivers[i].interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] }),
        opacity: moteDrivers[i].interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 1, 0.9, 0] }),
      })),
    [moteDrivers],
  )

  if (!achievement) return null

  const cardStyle = {
    opacity: enter,
    transform: reduceMotion
      ? []
      : [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.veil} testID="reward-unlock">
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.voidClip}>
            <VoidField width={CARD_WIDTH} height={windowHeight} />

            {STARS.map((s) => (
              <View key={s.key} style={[styles.star, { left: s.xPct * CARD_WIDTH, top: s.yPct * 420 }]} />
            ))}

            {motes.map((mote) => (
              <Animated.View
                key={mote.key}
                style={[
                  styles.mote,
                  {
                    left: mote.xPct * CARD_WIDTH,
                    width: mote.size,
                    height: mote.size,
                    borderRadius: mote.size / 2,
                    opacity: mote.opacity,
                    transform: [{ translateY: mote.translateY }, { scale: mote.scale }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Ray burst, glow and halos all centre on the mascot's head. */}
          <Animated.View
            style={[
              styles.burst,
              { transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) }] },
            ]}
            pointerEvents="none"
          >
            {Array.from({ length: RAY_COUNT }, (_, i) => (
              <Ray key={i} angle={i * (360 / RAY_COUNT)} />
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }],
              },
            ]}
            pointerEvents="none"
          >
            <Svg width={GLOW} height={GLOW}>
              <Defs>
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={reward.glowCore} />
                  <Stop offset="35%" stopColor={reward.glowMid} />
                  <Stop offset="60%" stopColor={reward.glowOuter} />
                  <Stop offset="78%" stopColor={reward.glowEdge} />
                </RadialGradient>
              </Defs>
              <Rect width={GLOW} height={GLOW} fill="url(#halo)" />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.ring,
              styles.ringSolid,
              { transform: [{ rotate: ringA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] },
            ]}
            pointerEvents="none"
          />
          <Animated.View
            style={[
              styles.ring,
              styles.ringDashed,
              { transform: [{ rotate: ringB.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) }] },
            ]}
            pointerEvents="none"
          />

          <View style={styles.content}>
            <Mascot id={achievement.id} size={76} />

            <Meta role="eyebrow" style={styles.eyebrow}>{achievement.eyebrow}</Meta>

            <View style={styles.flourish}>
              <View style={styles.flourishLine} />
              <View style={styles.flourishDot} />
              <View style={styles.flourishLine} />
            </View>

            <Display role="screenTitle" style={styles.title}>{achievement.name}</Display>
            <Meta style={styles.prompt}>{achievement.prompt}</Meta>

            <LinearGradient colors={[reward.pointsTop, reward.pointsBottom]} style={styles.points}>
              <Display style={styles.pointsLabel}>+{achievement.points} pts</Display>
            </LinearGradient>

            <TouchableOpacity style={styles.cta} onPress={onDismiss} accessibilityRole="button" activeOpacity={0.8}>
              <Meta role="eyebrow" style={styles.ctaLabel}>{ctaLabel}</Meta>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

RewardUnlock.displayName = 'RewardUnlock'

const styles = StyleSheet.create({
  veil: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: reward.veil },

  card: {
    width: CARD_WIDTH,
    borderRadius: 26,
    paddingHorizontal: space.xl - 4,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  /** The void and its motes are clipped to the card; the burst deliberately is not. */
  voidClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },

  star: { position: 'absolute', width: 2, height: 2, borderRadius: 1, backgroundColor: reward.star, opacity: 0.8 },
  mote: { position: 'absolute', bottom: -10, backgroundColor: reward.mote },

  burst: {
    position: 'absolute',
    top: -36,
    left: CARD_WIDTH / 2 - BURST / 2,
    width: BURST,
    height: BURST,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Rays pivot about the burst centre, so each is offset by half its own length. */
  rayAnchor: { position: 'absolute', width: 3, height: RAY_LENGTH, top: BURST / 2, transformOrigin: 'top center' },

  glow: { position: 'absolute', top: 34 - GLOW / 2, left: CARD_WIDTH / 2 - GLOW / 2, width: GLOW, height: GLOW },

  ring: { position: 'absolute', borderRadius: 999 },
  ringSolid: { top: 28 - 70, left: CARD_WIDTH / 2 - 70, width: 140, height: 140, borderWidth: 1, borderColor: reward.ringSolid },
  ringDashed: {
    top: 28 - 88,
    left: CARD_WIDTH / 2 - 88,
    width: 176,
    height: 176,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: reward.ringDashed,
  },

  content: { alignItems: 'center', width: '100%' },
  eyebrow: { color: reward.eyebrow, opacity: 0.9, textAlign: 'center', marginTop: space.sm },

  flourish: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginVertical: space.xs },
  flourishLine: { width: 24, height: 1, backgroundColor: reward.flourish, opacity: 0.55 },
  flourishDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: reward.flourish },

  title: { color: reward.title, fontSize: 27, lineHeight: 33, textAlign: 'center', marginTop: space.xs },
  prompt: { color: reward.prompt, opacity: 0.85, textAlign: 'center', lineHeight: 15, marginBottom: space.lg + 2 },

  points: {
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs + 2,
    marginBottom: space.lg + 2,
  },
  pointsLabel: { color: reward.pointsInk, fontSize: 14, lineHeight: 17, letterSpacing: 0.8 },

  cta: {
    width: '100%',
    paddingVertical: space.md,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: reward.ctaBorder,
    backgroundColor: reward.ctaFill,
    alignItems: 'center',
  },
  ctaLabel: { color: reward.ctaLabel },
})
