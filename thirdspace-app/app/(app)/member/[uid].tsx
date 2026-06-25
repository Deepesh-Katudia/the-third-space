import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { MemberProfileCard, Member } from '../../../components/MemberProfileCard'
import { avatarColor } from '../../../utils/avatar'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: read users/{uid} public profile.
const MOCK_MEMBER: Member = {
  uid: 'a1',
  name: 'Maya Chen',
  age: 27,
  neighborhood: 'Williamsburg, Brooklyn',
  tier: 'Insider',
  points: 2480,
  eventCount: 19,
  bio: 'Illustrator by day, always chasing good light and better coffee. New to Brooklyn and trying to actually meet people IRL.',
  lookingToMeet: 'Other creatives to sketch with + anyone who knows the best quiet cafés.',
  interests: ['Art', 'Coffee', 'Film', 'Hiking', 'Vinyl'],
  vibePhotos: 3,
}
// ──────────────────────────────────────────────────────────────────────────

export default function MemberProfile() {
  const { uid } = useLocalSearchParams<{ uid: string }>()
  const router = useRouter()
  const member = MOCK_MEMBER

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <MemberProfileCard member={member} onMessage={() => router.push('/(app)/message-requests')} />

        <Text style={styles.bio}>{member.bio}</Text>

        <View style={styles.lookingBox}>
          <Text style={styles.lookingLabel}>Looking to meet</Text>
          <Text style={styles.lookingText}>{member.lookingToMeet}</Text>
        </View>

        <Text style={styles.sectionLabel}>Interests</Text>
        <View style={styles.interestWrap}>
          {member.interests.map((it) => (
            <View key={it} style={styles.interestChip}>
              <Text style={styles.interestText}>{it}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Vibe</Text>
        <View style={styles.vibeStrip}>
          {Array.from({ length: member.vibePhotos }).map((_, i) => (
            <LinearGradient
              key={i}
              colors={[avatarColor(`${uid}:${i}`), '#2C1810']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vibePhoto}
            />
          ))}
        </View>

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
  lookingBox: { backgroundColor: 'rgba(122,140,110,0.14)', borderRadius: 16, padding: 16, marginBottom: 28 },
  lookingLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#5c6e51', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  lookingText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', lineHeight: 20 },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  interestWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
  interestChip: { backgroundColor: 'white', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(242,197,160,0.6)' },
  interestText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#6B3F2A' },
  vibeStrip: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  vibePhoto: { flex: 1, height: 110, borderRadius: 16 },
  blockBtn: { alignItems: 'center', paddingVertical: 10 },
  blockText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
