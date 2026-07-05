import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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

export default function MemberProfile() {
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const router = useRouter()
  const { profile, loading, hasError } = useProfile(uid)
  const { user } = useAuth()
  const { isFollowing, toggle } = useFollowStatus(uid)
  const [banner, setBanner] = useState('')

  const handleToggleFollow = async () => {
    setBanner('')
    try {
      await toggle()
    } catch {
      setBanner("Couldn't update follow. Check your connection and try again.")
    }
  }

  if (loading) return <LoadingView />

  if (hasError || !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        </View>
        <EmptyState emoji="🫥" title="Profile unavailable" body="This member's profile couldn't be loaded." />
      </SafeAreaView>
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
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

        {member.bio ? <Text style={styles.bio}>{member.bio}</Text> : null}

        {member.interests.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Interests</Text>
            <View style={styles.interestWrap}>
              {member.interests.map((it) => (
                <View key={it} style={styles.interestChip}>
                  <Text style={styles.interestText}>{it}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {profile.vibePhotos.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Vibe</Text>
            <View style={styles.vibeStrip}>
              {profile.vibePhotos.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.vibePhoto} />
              ))}
            </View>
          </>
        ) : null}

        <TouchableOpacity style={styles.blockBtn}>
          <Text style={styles.blockText}>Block or report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  back: { fontSize: 24, color: '#2C1810' },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },
  bio: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#2C1810', lineHeight: 23, marginBottom: 20 },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  interestChip: { backgroundColor: 'white', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  interestText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  vibeStrip: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  vibePhoto: { flex: 1, height: 110, borderRadius: 16, backgroundColor: 'rgba(242,197,160,0.3)' },
  blockBtn: { alignItems: 'center', paddingVertical: 10 },
  blockText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
