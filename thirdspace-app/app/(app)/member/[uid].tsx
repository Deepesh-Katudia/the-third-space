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
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  back: { fontSize: 24, color: '#15161A' },
  scroll: { paddingHorizontal: 24, paddingBottom: 32 },
  bio: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#15161A', lineHeight: 23, marginBottom: 20 },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#6B6F78', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  interestChip: { backgroundColor: 'white', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)' },
  interestText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3A3A3A' },
  vibeStrip: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  vibePhoto: { flex: 1, height: 110, borderRadius: 16, backgroundColor: 'rgba(226,224,218,0.3)' },
  blockBtn: { alignItems: 'center', paddingVertical: 10 },
  blockText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
})
