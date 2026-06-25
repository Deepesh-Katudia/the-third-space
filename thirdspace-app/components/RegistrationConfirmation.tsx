import React, { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

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
      <LinearGradient colors={['#2C1810', '#3a1e12']} style={StyleSheet.absoluteFill} />
      <View style={styles.blobTerracotta} />
      <View style={styles.blobSage} />

      <Animated.View style={[styles.content, { transform: [{ scale }] }]}>
        <View style={styles.checkCircle}>
          <Text style={styles.check}>✓</Text>
        </View>
        <Text style={styles.heading}>You're in!</Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>{eventTitle}</Text>
          <Text style={styles.summaryLine}>{dateLine}</Text>
          <Text style={styles.summaryLine}>{venueLine}</Text>
          <View style={styles.pointsRow}>
            <Text style={styles.pointsText}>+{pointsEarned} points earned</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryAction} onPress={onSeeGuests}>
          <Text style={styles.primaryActionText}>See who's going</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryAction} onPress={onJoinChat}>
          <Text style={styles.secondaryActionText}>Join the group chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismiss} onPress={onClose} hitSlop={8}>
          <Text style={styles.dismissText}>Maybe later</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  blobTerracotta: { position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(196,97,74,0.25)' },
  blobSage: { position: 'absolute', bottom: -80, left: -60, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(122,140,110,0.2)' },
  content: { width: '100%', alignItems: 'center' },
  checkCircle: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#7A8C6E', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  check: { fontSize: 44, color: 'white', fontFamily: 'DMSans_500Medium', lineHeight: 50 },
  heading: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, color: '#FBF7F2', marginBottom: 24, letterSpacing: -0.5 },
  summary: { width: '100%', backgroundColor: 'rgba(255,249,244,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(242,197,160,0.25)', padding: 20, marginBottom: 24 },
  summaryTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#FBF7F2', marginBottom: 8 },
  summaryLine: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(251,247,242,0.7)', marginBottom: 2 },
  pointsRow: { marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(196,97,74,0.25)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  pointsText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#F2C5A0' },
  primaryAction: { width: '100%', backgroundColor: '#C4614A', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  primaryActionText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  secondaryAction: { width: '100%', backgroundColor: 'rgba(255,249,244,0.1)', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(242,197,160,0.3)' },
  secondaryActionText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FBF7F2' },
  dismiss: { marginTop: 16 },
  dismissText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(251,247,242,0.6)' },
})
