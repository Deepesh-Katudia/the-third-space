import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { avatarColor, initials } from '../utils/avatar'

export interface Member {
  uid: string
  name: string
  age: number
  neighborhood: string
  tier: string
  points: number
  eventCount: number
  bio: string
  lookingToMeet: string
  interests: string[]
  vibePhotos: number
  photoURL?: string | null
}

interface MemberProfileCardProps {
  member: Member
  isFollowing: boolean
  onToggleFollow: () => void
  onMessage: () => void
  showActions: boolean
}

export function MemberProfileCard({ member, isFollowing, onToggleFollow, onMessage, showActions }: MemberProfileCardProps) {
  const tint = avatarColor(member.name)

  return (
    <View style={styles.card}>
      <LinearGradient colors={[tint, '#2C1810']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
      {member.photoURL ? (
        <Image source={{ uri: member.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text style={styles.avatarText}>{initials(member.name)}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.name}>{member.name}, {member.age}</Text>
        <Text style={styles.neighborhood}>{member.neighborhood}</Text>

        <View style={styles.chips}>
          <View style={styles.chip}><Text style={styles.chipText}>{member.tier}</Text></View>
          <View style={styles.chip}><Text style={styles.chipText}>{member.points.toLocaleString()} pts</Text></View>
          <View style={styles.chip}><Text style={styles.chipText}>{member.eventCount} events</Text></View>
        </View>

        {showActions ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={onToggleFollow}
            >
              <Text style={[styles.followText, isFollowing && styles.followingText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn} onPress={onMessage}>
              <Text style={styles.messageText}>Message request</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 22, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', overflow: 'hidden' },
  cover: { height: 140 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', marginTop: -48, marginLeft: 20, overflow: 'hidden' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 34, color: 'white' },
  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  name: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', letterSpacing: -0.5 },
  neighborhood: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginTop: 2, marginBottom: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { backgroundColor: 'rgba(242,197,160,0.22)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  chipText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#6B3F2A' },
  actions: { flexDirection: 'row', gap: 12 },
  followBtn: { flex: 1, backgroundColor: '#C4614A', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#C4614A' },
  followText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
  followingText: { color: '#C4614A' },
  messageBtn: { flex: 1, borderWidth: 1.5, borderColor: 'rgba(242,197,160,0.9)', borderRadius: 100, paddingVertical: 13, alignItems: 'center' },
  messageText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810' },
})
