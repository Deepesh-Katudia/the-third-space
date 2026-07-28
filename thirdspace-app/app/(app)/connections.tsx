import React from 'react'
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { useAuth } from '../../hooks/useAuth'
import { useConnections } from '../../hooks/useConnections'
import { useProfile } from '../../hooks/useProfile'
import { avatarColor, initials } from '../../utils/avatar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { palette, radius, space, type as typeScale } from '../../constants/design'

// Resolves its own profile so one failed read renders a neutral placeholder
// row instead of sinking the whole list.
function ConnectionRow({ uid }: { uid: string }) {
  const router = useRouter()
  const { profile } = useProfile(uid)
  const name = profile?.displayName ?? 'Member'

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/(app)/member/[uid]', params: { uid } })}
    >
      {profile?.photoURL ? (
        <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
      )}
      <View style={styles.rowText}>
        <Display numberOfLines={1}>{name}</Display>
        {profile?.neighborhood ? <Body role="bodySm">{profile.neighborhood}</Body> : null}
      </View>
      <Meta style={styles.chevron}>›</Meta>
    </TouchableOpacity>
  )
}

export default function Connections() {
  const router = useRouter()
  const { user } = useAuth()
  const { connectionUids, loading, hasError } = useConnections(user?.uid)

  if (loading) return <LoadingView />

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Display style={styles.back}>←</Display>
        </TouchableOpacity>
        <Display role="screenTitle">Connections</Display>
      </View>

      {hasError ? (
        <EmptyState emoji="🛰️" title="Couldn't load connections" body="Check your connection and try again." />
      ) : connectionUids.length === 0 ? (
        <EmptyState
          emoji="🤝"
          title="No connections yet"
          body="Follow people you meet at events — when they follow you back, they'll show up here."
        />
      ) : (
        <FlatList
          data={connectionUids}
          keyExtractor={(uid) => uid}
          renderItem={({ item }) => <ConnectionRow uid={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { fontSize: 24 },
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    padding: space.md + 2,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  avatarText: { ...typeScale.bodySm, fontSize: 18, lineHeight: 22, color: palette.cream },
  rowText: { flex: 1, minWidth: 0 },
  chevron: { fontSize: 20 },
})
