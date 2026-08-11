import React, { useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, Image, StyleSheet, Linking } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'
import { useProfile } from '../../../hooks/useProfile'
import { useAttendanceStats } from '../../../hooks/useAttendanceStats'
import { useConnections } from '../../../hooks/useConnections'
import { useSocials } from '../../../hooks/useSocials'
import { LoadingView } from '../../../components/LoadingView'
import { SocialChips } from '../../../components/SocialChips'
import { avatarColor, initials } from '../../../utils/avatar'
import { messagePrivacyLabel } from '../../../utils/profile'
import { hasAnyHandle } from '../../../utils/socials'
import { MediaThumb } from '../../../components/MediaThumb'
import { MediaViewer } from '../../../components/MediaViewer'
import { coerceLegacyVibe } from '../../../utils/media'
import { MediaAsset } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { palette, radius, space, type as typeScale, NAV_CLEARANCE } from '../../../constants/design'

export default function Profile() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.uid)
  const [notifications, setNotifications] = useState(true)
  const { attendedEvents } = useAttendanceStats(user?.uid)
  const { connectionUids, loading: connectionsLoading, hasError: connectionsHasError } = useConnections(user?.uid)
  // The owner always passes the rules gate, so `visible` needs no check here.
  const { handles: myHandles } = useSocials(user?.uid)

  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const vibes = useMemo(() => coerceLegacyVibe(profile?.vibePhotos), [profile?.vibePhotos])

  const name = profile?.displayName ?? user?.displayName ?? 'Member'
  const neighborhood = profile?.neighborhood ?? ''

  if (loading) return <LoadingView />

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Display role="screenTitle" numberOfLines={1}>{name}</Display>
        </View>

        <View style={styles.identity}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
          )}
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Display role="screenTitle">{name}</Display>
              {profile?.verified ? <Ionicons name="checkmark-circle" size={18} color={palette.sage} /> : null}
            </View>
            {neighborhood ? <Body role="bodySm">{neighborhood}</Body> : null}
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(app)/edit-profile')}>
          <Meta role="eyebrow" tone="clay">Edit profile & photos</Meta>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <Stat value={attendedEvents.length} label="Attended" />
          <View style={styles.statDivider} />
          <Stat value={0} label="Hosted" />
          <View style={styles.statDivider} />
          <Stat
            value={connectionsLoading || connectionsHasError ? '—' : connectionUids.length}
            label="Connections"
            onPress={() => router.push('/(app)/connections')}
          />
        </View>

        {vibes.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Vibe</Meta>
            <View style={styles.vibeStrip}>
              {vibes.map((media, i) => (
                <MediaThumb key={i} media={media} style={styles.vibePhoto} onPress={() => setViewing(media)} />
              ))}
            </View>
          </>
        ) : null}

        {hasAnyHandle(myHandles) ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Socials</Meta>
            <SocialChips
              handles={myHandles}
              onOpen={(url) => { Linking.openURL(url).catch(() => {}) }}
            />
          </>
        ) : null}

        <Meta role="eyebrow" style={styles.sectionLabel}>Account</Meta>
        <View style={styles.card}>
          {!profile?.verified ? (
            <Row
              label="Get verified"
              badge="ID"
              onPress={() => (router.push as (href: string) => void)('/(app)/verify-identity?from=profile')}
            />
          ) : null}
          <Row label="Points & rewards" onPress={() => router.push('/(app)/badges')} />
          <Row label="Interests & preferences" onPress={() => router.push('/(app)/edit-profile')} />
          <Row label="Neighborhoods" onPress={() => router.push('/(app)/edit-profile')} />
          <Row label="Become a host" badge="New" onPress={() => router.push('/(app)/become-host')} last />
        </View>

        <Meta role="eyebrow" style={styles.sectionLabel}>Privacy</Meta>
        <View style={styles.card}>
          <Row
            label="Who can message me"
            value={messagePrivacyLabel(profile?.messagePrivacy)}
            onPress={() => router.push('/(app)/message-privacy')}
          />
          <View style={[styles.row, styles.rowLast]}>
            <Body role="bodyLg" tone="ink">Notifications</Body>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: palette.rule, true: palette.clay }}
              thumbColor={palette.cream}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/(app)/settings')}>
          <Body role="bodyLg" tone="ink">Settings</Body>
          <Meta style={styles.chevron}>›</Meta>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOut}>
          <Meta role="eyebrow" tone="clay">Sign out</Meta>
        </TouchableOpacity>
      </ScrollView>

      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
    </Screen>
  )
}

function Stat({ value, label, onPress }: { value: number | string; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress} disabled={!onPress}>
      <Display role="stubDay" tone="clay">{value}</Display>
      <Meta style={styles.statLabel}>{label}</Meta>
    </TouchableOpacity>
  )
}

function Row({
  label,
  value,
  badge,
  onPress,
  last,
}: {
  label: string
  value?: string
  badge?: string
  onPress?: () => void
  last?: boolean
}) {
  return (
    <TouchableOpacity style={[styles.row, last && styles.rowLast]} onPress={onPress} disabled={!onPress}>
      <Body role="bodyLg" tone="ink">{label}</Body>
      <View style={styles.rowRight}>
        {badge ? (
          <View style={styles.newBadge}>
            <Meta role="eyebrow" tone="clay">{badge}</Meta>
          </View>
        ) : null}
        {value ? <Body role="bodySm">{value}</Body> : null}
        <Meta style={styles.chevron}>›</Meta>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: NAV_CLEARANCE },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.xl - 4 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginBottom: space.lg + 2 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  avatarText: { ...typeScale.button, fontSize: 24, lineHeight: 30, color: palette.cream },
  identityText: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginBottom: 3 },

  editBtn: { borderWidth: 1.5, borderColor: palette.clay, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center', marginBottom: space.xl },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    paddingVertical: space.lg + 2,
    marginBottom: space.xxl - 4,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: palette.rule },

  sectionLabel: { marginBottom: space.sm + 2 },
  vibeStrip: { flexDirection: 'row', gap: space.sm, marginBottom: space.xxl - 4 },
  vibePhoto: { flex: 1, aspectRatio: 4 / 5 },
  card: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    marginBottom: space.xxl - 4,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 3,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chevron: { fontSize: 20 },
  newBadge: { borderWidth: 1, borderColor: palette.clay, borderRadius: radius.pill, paddingHorizontal: space.sm, paddingVertical: 2 },

  signOut: { alignItems: 'center', paddingVertical: space.sm },

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderWidth: 1,
    borderColor: palette.rule,
    marginBottom: space.md,
  },
})
