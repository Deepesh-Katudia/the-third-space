import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BadgeGrid, Badge } from '../../components/BadgeGrid'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: read the user's points/badges from their profile doc.
const MOCK_POINTS = 1240
const MOCK_TIER = 'Regular'
const MOCK_NEXT_TIER = 'Insider'
const MOCK_PROGRESS = 0.62

const MOCK_BADGES: Badge[] = [
  { id: 'b1', icon: '🌱', label: 'First event', earned: true },
  { id: 'b2', icon: '🔥', label: '5 in a row', earned: true },
  { id: 'b3', icon: '🎨', label: 'Creative soul', earned: true },
  { id: 'b4', icon: '🌙', label: 'Night owl', earned: true },
  { id: 'b5', icon: '🤝', label: 'Connector', earned: true },
  { id: 'b6', icon: '⭐', label: 'Top rated', earned: true },
  { id: 'b7', icon: '🏆', label: 'Host hero', earned: false },
  { id: 'b8', icon: '💎', label: 'Insider', earned: false },
]

const MOCK_REWARDS = [
  { id: 'rw1', label: 'Free drink at Cellar 9', cost: '500 pts' },
  { id: 'rw2', label: '$10 off any ticketed event', cost: '800 pts' },
]
// ──────────────────────────────────────────────────────────────────────────

export default function Badges() {
  const router = useRouter()

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Points & badges</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <LinearGradient colors={['#C4614A', '#E8855F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>YOUR POINTS</Text>
          <Text style={styles.heroPoints}>{MOCK_POINTS.toLocaleString()}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{MOCK_TIER}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(MOCK_PROGRESS * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.round((1 - MOCK_PROGRESS) * 1000)} pts to {MOCK_NEXT_TIER}
          </Text>
        </LinearGradient>

        <Text style={styles.sectionLabel}>Badges</Text>
        <BadgeGrid badges={MOCK_BADGES} />

        <Text style={styles.sectionLabel}>Redeem</Text>
        {MOCK_REWARDS.map((r) => (
          <View key={r.id} style={styles.rewardRow}>
            <View style={styles.rewardText}>
              <Text style={styles.rewardLabel}>{r.label}</Text>
              <Text style={styles.rewardCost}>{r.cost}</Text>
            </View>
            <TouchableOpacity style={styles.useBtn}>
              <Text style={styles.useText}>Use</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },

  hero: { borderRadius: 22, padding: 24, marginBottom: 28, alignItems: 'center' },
  heroLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8, marginBottom: 6 },
  heroPoints: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 52, color: 'white', letterSpacing: -1 },
  tierBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8, marginBottom: 18 },
  tierText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: 'white' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: 'white' },
  progressText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  rewardText: { flex: 1 },
  rewardLabel: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 2 },
  rewardCost: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#C4614A' },
  useBtn: { backgroundColor: '#2C1810', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 },
  useText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FBF7F2' },
})
