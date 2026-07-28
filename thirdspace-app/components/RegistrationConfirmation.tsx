import React, { useEffect, useRef } from 'react'
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Display, Body, Meta } from './ui/Text'

interface RegistrationConfirmationProps {
  visible: boolean
  eventTitle: string
  dateLine: string
  venueLine: string
  pointsEarned: number
  onSeeGuests: () => void
  onJoinChat: () => void
  onClose: () => void
}

export function RegistrationConfirmation({
  visible,
  eventTitle,
  dateLine,
  venueLine,
  pointsEarned,
  onSeeGuests,
  onJoinChat,
  onClose,
}: RegistrationConfirmationProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(0.85)).current

  useEffect(() => {
    if (!visible) return
    opacity.setValue(0)
    scale.setValue(0.85)
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
    ]).start()
  }, [visible])

  if (!visible) return null

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="auto">
      {/* Flat ink field with two soft blobs — the gradient the old design used has no
          equivalent in the ticket system, so depth comes from tone, not blending. */}
      <View style={styles.blobTerracotta} />
      <View style={styles.blobSage} />

      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.checkCircle}>
          <Display role="screenTitle" style={styles.check}>✓</Display>
        </View>
        <Display role="screenTitle" style={styles.heading}>You&apos;re in!</Display>

        <View style={styles.summary}>
          <Display style={styles.onInk}>{eventTitle}</Display>
          <Body role="bodySm" style={styles.summaryLine}>{dateLine}</Body>
          <Body role="bodySm" style={styles.summaryLine}>{venueLine}</Body>
          <View style={styles.pointsRow}>
            <Meta role="eyebrow" tone="ink">+{pointsEarned} points earned</Meta>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryAction} onPress={onSeeGuests}>
          <Body role="button" tone="ink">See who&apos;s going</Body>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={onJoinChat}>
          <Body role="button" style={styles.onInk}>Join the group chat</Body>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} hitSlop={8}>
          <Body role="bodySm" style={styles.summaryLine}>Maybe later</Body>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xxl,
    backgroundColor: palette.ink,
    overflow: 'hidden',
  },
  blobTerracotta: { position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: palette.clay },
  blobSage: { position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: palette.sage },
  content: { width: '100%', alignItems: 'center' },
  checkCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: palette.sage, alignItems: 'center', justifyContent: 'center', marginBottom: space.xl },
  check: { color: palette.cream },
  heading: { color: palette.cream, marginBottom: space.xl },
  summary: {
    width: '100%',
    backgroundColor: palette.inkSoft,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    padding: space.xl,
    marginBottom: space.xl,
  },
  onInk: { color: palette.cream },
  summaryLine: { color: palette.orangeLight, marginBottom: 2 },
  pointsRow: { marginTop: space.md, alignSelf: 'flex-start', backgroundColor: palette.orangeLight, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 1 },
  primaryAction: { width: '100%', backgroundColor: palette.orangeLight, borderRadius: radius.ticket, paddingVertical: space.lg, alignItems: 'center', marginBottom: space.md },
  secondaryAction: { width: '100%', backgroundColor: palette.inkSoft, borderRadius: radius.ticket, paddingVertical: space.lg, alignItems: 'center', borderWidth: 1, borderColor: palette.rule },
  dismiss: { marginTop: space.lg },
})
