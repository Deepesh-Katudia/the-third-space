import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BadgeGrid } from '../../components/BadgeGrid'
import { LoadingView } from '../../components/LoadingView'
import { Banner } from '../../components/Banner'
import { EmptyState } from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { useAttendanceStats } from '../../hooks/useAttendanceStats'
import { useConnections } from '../../hooks/useConnections'
import { tierProgress } from '../../utils/points'
import { computeBadges } from '../../utils/badges'
import { redeemReward } from '../../services/profiles'
import { REWARDS } from '../../constants/rewards'

export default function Badges() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading: profileLoading, hasError: profileHasError } = useProfile(user?.uid)
  const { attendedEvents, loading: attendanceLoading, hasError: attendanceHasError } = useAttendanceStats(user?.uid)
  const { connectionUids, loading: connectionsLoading } = useConnections(user?.uid)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [banner, setBanner] = useState('')

  if (profileLoading || attendanceLoading || connectionsLoading) return <LoadingView />

  if (profileHasError || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Points & badges</Text>
        </View>
        <EmptyState emoji="🫥" title="Couldn't load your points" body="Check your connection and try again." />
      </SafeAreaView>
    )
  }

  const progress = tierProgress(profile.points)
  const badges = computeBadges(attendedEvents, profile.tier, connectionUids.length)

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (!user || profile.points < cost) return
    const reward = REWARDS.find((r) => r.id === rewardId)
    if (!reward) return
    setRedeemingId(rewardId)
    setBanner('')
    try {
      await redeemReward(user.uid, reward, profile.points)
    } catch {
      setBanner("Couldn't redeem that reward. Try again.")
    } finally {
      setRedeemingId(null)
    }
  }

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
        <LinearGradient colors={['#FF9F3D', '#FFB75B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <Text style={styles.heroLabel}>YOUR POINTS</Text>
          <Text style={styles.heroPoints}>{profile.points.toLocaleString()}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{progress.tier}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress.progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress.nextTier ? `${progress.pointsToNext} pts to ${progress.nextTier}` : "You've reached the top tier"}
          </Text>
        </LinearGradient>

        {banner ? <Banner message={banner} /> : attendanceHasError ? <Banner message="Couldn't load your attendance history — badges may be out of date." /> : null}

        <Text style={styles.sectionLabel}>Badges</Text>
        <BadgeGrid badges={badges} />

        <Text style={styles.sectionLabel}>Redeem</Text>
        {REWARDS.map((r) => {
          const disabled = profile.points < r.cost || redeemingId === r.id
          return (
            <View key={r.id} style={styles.rewardRow}>
              <View style={styles.rewardText}>
                <Text style={styles.rewardLabel}>{r.label}</Text>
                <Text style={styles.rewardCost}>{r.cost} pts</Text>
              </View>
              <TouchableOpacity
                style={[styles.useBtn, disabled && styles.useBtnDisabled]}
                onPress={() => handleRedeem(r.id, r.cost)}
                disabled={disabled}
              >
                <Text style={styles.useText}>{redeemingId === r.id ? '…' : 'Use'}</Text>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#15161A', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },

  hero: { borderRadius: 22, padding: 24, marginBottom: 28, alignItems: 'center' },
  heroLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8, marginBottom: 6 },
  heroPoints: { fontFamily: 'Poppins_800ExtraBold', fontSize: 52, color: 'white', letterSpacing: -1 },
  tierBadge: { backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8, marginBottom: 18 },
  tierText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: 'white' },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: 'white' },
  progressText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 8 },

  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#6B6F78', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  rewardText: { flex: 1 },
  rewardLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', marginBottom: 2 },
  rewardCost: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF9F3D' },
  useBtn: { backgroundColor: '#15161A', borderRadius: 100, paddingHorizontal: 20, paddingVertical: 10 },
  useBtnDisabled: { opacity: 0.4 },
  useText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#F3F3F5' },
})
