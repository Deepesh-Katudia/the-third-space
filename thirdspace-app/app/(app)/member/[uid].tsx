import React, { useState } from 'react'
import { View, TouchableOpacity, ScrollView, Image, StyleSheet, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { MemberProfileCard, Member } from '../../../components/MemberProfileCard'
import { LoadingView } from '../../../components/LoadingView'
import { EmptyState } from '../../../components/EmptyState'
import { useProfile } from '../../../hooks/useProfile'
import { useAuth } from '../../../hooks/useAuth'
import { dmConversationId } from '../../../utils/chat'
import { Banner } from '../../../components/Banner'
import { useFollowStatus } from '../../../hooks/useFollowStatus'
import { useSocials } from '../../../hooks/useSocials'
import { SocialChips } from '../../../components/SocialChips'
import { hasAnyHandle } from '../../../utils/socials'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { BackButton } from '../../../components/ui/BackButton'
import { palette, radius, space } from '../../../constants/design'

export default function MemberProfile() {
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const router = useRouter()
  const { profile, loading, hasError } = useProfile(uid)
  const { user } = useAuth()
  const { isFollowing, toggle } = useFollowStatus(uid)
  const { handles: socialHandles, visible: socialsVisible } = useSocials(uid)
  const [banner, setBanner] = useState('')

  const handleToggleFollow = async () => {
    setBanner('')
    try {
      await toggle()
    } catch {
      setBanner("Couldn't update follow. Check your connection and try again.")
    }
  }

  // A link that will not open is not worth an error banner on someone's profile.
  const openSocial = (url: string) => { Linking.openURL(url).catch(() => {}) }

  if (loading) return <LoadingView />

  if (hasError || !profile) {
    return (
      <Screen tone="deep">
        <StatusBar style="dark" />
        <View style={styles.header}>
          <BackButton />
        </View>
        <EmptyState emoji="🫥" title="Profile unavailable" body="This member's profile couldn't be loaded." />
      </Screen>
    )
  }

  const member: Member = {
    uid: uid ?? '',
    name: profile.displayName,
    age: profile.age,
    neighborhood: profile.neighborhood,
    tier: profile.tier,
    points: profile.points,
    eventCount: profile.eventsCount,
    bio: profile.bio,
    lookingToMeet: '',
    interests: profile.interests,
    vibePhotos: profile.vibePhotos.length,
    photoURL: profile.photoURL,
  }

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {banner ? <Banner message={banner} /> : null}
        <MemberProfileCard
          member={member}
          isFollowing={isFollowing}
          onToggleFollow={handleToggleFollow}
          showActions={Boolean(user?.uid && uid && user.uid !== uid)}
          onMessage={() => {
            if (!user?.uid || !uid || user.uid === uid) return
            router.push({ pathname: '/(app)/chat/[id]', params: { id: dmConversationId(user.uid, uid), kind: 'dm', name: profile.displayName } })
          }}
        />

        {member.bio ? <Body role="bodyLg" tone="ink" style={styles.bio}>{member.bio}</Body> : null}

        {member.interests.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Interests</Meta>
            <View style={styles.interestWrap}>
              {member.interests.map((it) => (
                <View key={it} style={styles.interestChip}>
                  <Meta role="eyebrow" tone="ink">{it}</Meta>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {socialsVisible && hasAnyHandle(socialHandles) ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Socials</Meta>
            <SocialChips handles={socialHandles} onOpen={openSocial} />
          </>
        ) : null}

        {profile.vibePhotos.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Vibe</Meta>
            <View style={styles.vibeStrip}>
              {profile.vibePhotos.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.vibePhoto} />
              ))}
            </View>
          </>
        ) : null}

        <TouchableOpacity style={styles.blockBtn}>
          <Body role="bodySm">Block or report</Body>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xs },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  bio: { marginBottom: space.xl },
  sectionLabel: { marginBottom: space.md },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xxl - 4 },
  interestChip: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  vibeStrip: { flexDirection: 'row', gap: space.sm + 2, marginBottom: space.xxl - 4 },
  vibePhoto: { flex: 1, height: 110, borderRadius: radius.ticket, backgroundColor: palette.orangeLight },
  blockBtn: { alignItems: 'center', paddingVertical: space.sm + 2 },
})
