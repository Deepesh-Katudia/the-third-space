import React, { useState } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
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
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

export default function Badges() {
  const { user } = useAuth()
  const { profile, loading: profileLoading, hasError: profileHasError } = useProfile(user?.uid)
  const { attendedEvents, loading: attendanceLoading, hasError: attendanceHasError } = useAttendanceStats(user?.uid)
  const { connectionUids, loading: connectionsLoading } = useConnections(user?.uid)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [banner, setBanner] = useState('')

  if (profileLoading || attendanceLoading || connectionsLoading) return <LoadingView />

  if (profileHasError || !profile) {
    return (
      <Screen tone="deep">
        <StatusBar style="dark" />
        <View style={styles.header}>
          <BackButton />
          <Display role="screenTitle">Points & badges</Display>
        </View>
        <EmptyState emoji="🫥" title="Couldn't load your points" body="Check your connection and try again." />
      </Screen>
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
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Points & badges</Display>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Ink hero — the points total is the loudest thing on the screen, and ink is
            the only surface that outranks the deep orange field. */}
        <View style={styles.hero}>
          <Meta role="eyebrow" style={styles.onInkSoft}>Your points</Meta>
          <Display role="screenTitle" style={styles.heroPoints}>{profile.points.toLocaleString()}</Display>
          <View style={styles.tierBadge}>
            <Meta role="eyebrow" tone="ink">{progress.tier}</Meta>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress.progress * 100)}%` }]} />
          </View>
          <Meta style={styles.progressText}>
            {progress.nextTier ? `${progress.pointsToNext} pts to ${progress.nextTier}` : "You've reached the top tier"}
          </Meta>
        </View>

        {banner ? <Banner message={banner} /> : attendanceHasError ? <Banner message="Couldn't load your attendance history — badges may be out of date." /> : null}

        <Meta role="eyebrow" style={styles.sectionLabel}>Badges</Meta>
        <BadgeGrid badges={badges} />

        <Meta role="eyebrow" style={styles.sectionLabel}>Redeem</Meta>
        {REWARDS.map((r) => {
          const disabled = profile.points < r.cost || redeemingId === r.id
          return (
            <View key={r.id} style={styles.rewardRow}>
              <View style={styles.rewardText}>
                <Display>{r.label}</Display>
                <Body role="bodySm" tone="clay">{r.cost} pts</Body>
              </View>
              <TouchableOpacity
                style={[styles.useBtn, disabled && styles.useBtnDisabled]}
                onPress={() => handleRedeem(r.id, r.cost)}
                disabled={disabled}
              >
                <Meta role="eyebrow" style={styles.onInk}>{redeemingId === r.id ? '…' : 'Use'}</Meta>
              </TouchableOpacity>
            </View>
          )
        })}
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },

  hero: { backgroundColor: palette.ink, borderRadius: radius.chip + 2, padding: space.xl, marginBottom: space.xxl - 4, alignItems: 'center' },
  onInk: { color: palette.cream },
  onInkSoft: { color: palette.orangeLight },
  heroPoints: { fontSize: 52, lineHeight: 58, color: palette.cream, letterSpacing: 0.8 },
  tierBadge: { backgroundColor: palette.orangeLight, borderRadius: radius.pill, paddingHorizontal: space.md + 2, paddingVertical: space.xs + 1, marginTop: space.sm, marginBottom: space.lg + 2 },
  progressTrack: { width: '100%', height: 8, borderRadius: 4, backgroundColor: palette.inkSoft, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: palette.orangeLight },
  progressText: { color: palette.orangeLight, marginTop: space.sm },

  sectionLabel: { marginBottom: space.md + 2 },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  rewardText: { flex: 1, minWidth: 0 },
  useBtn: { backgroundColor: palette.ink, borderRadius: radius.pill, paddingHorizontal: space.xl - 4, paddingVertical: space.sm + 2 },
  useBtnDisabled: { opacity: 0.4 },
})
