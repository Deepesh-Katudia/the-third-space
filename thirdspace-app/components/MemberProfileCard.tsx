import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'
import { palette, radius, space, font } from '../constants/design'
import { Display, Body, Meta } from './ui/Text'

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
      {/* Flat ink cover — the ticket system has no gradients. */}
      <View style={styles.cover} />
      {member.photoURL ? (
        <Image source={{ uri: member.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text style={styles.avatarText}>{initials(member.name)}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Display role="screenTitle">{member.name}, {member.age}</Display>
        <Body role="bodySm" style={styles.neighborhood}>{member.neighborhood}</Body>

        <View style={styles.chips}>
          <View style={styles.chip}><Meta role="eyebrow" tone="ink">{member.tier}</Meta></View>
          <View style={styles.chip}><Meta role="eyebrow" tone="ink">{member.points.toLocaleString()} pts</Meta></View>
          <View style={styles.chip}><Meta role="eyebrow" tone="ink">{member.eventCount} events</Meta></View>
        </View>

        {showActions ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.followBtn, isFollowing && styles.followingBtn]}
              onPress={onToggleFollow}
            >
              <Body role="button" tone={isFollowing ? 'clay' : 'ink'} style={isFollowing ? undefined : styles.onInk}>
                {isFollowing ? 'Following' : 'Follow'}
              </Body>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageBtn} onPress={onMessage}>
              <Body role="button" tone="ink">Message request</Body>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip + 2,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  cover: { height: 140, backgroundColor: palette.ink },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: palette.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -48,
    marginLeft: space.xl - 4,
    overflow: 'hidden',
  },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  avatarText: { fontFamily: font.bodySemi, fontSize: 34, color: palette.cream },
  body: { paddingHorizontal: space.xl - 4, paddingTop: space.md, paddingBottom: space.xl - 4 },
  neighborhood: { marginTop: 2, marginBottom: space.md + 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg + 2 },
  chip: { borderWidth: 1, borderColor: palette.rule, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 1 },
  actions: { flexDirection: 'row', gap: space.md },
  followBtn: { flex: 1, backgroundColor: palette.ink, borderRadius: radius.pill, paddingVertical: space.md + 1, alignItems: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: palette.clay },
  onInk: { color: palette.cream },
  messageBtn: { flex: 1, borderWidth: 1.5, borderColor: palette.rule, borderRadius: radius.pill, paddingVertical: space.md + 1, alignItems: 'center' },
})
