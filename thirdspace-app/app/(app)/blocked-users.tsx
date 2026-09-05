import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { subscribeBlockedUsers, unblockUser } from '../../services/blocks'
import { BlockedUser } from '../../types/models'
import { avatarColor, initials } from '../../utils/avatar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space, type as typeScale } from '../../constants/design'

/**
 * Resolves its own profile, so one failed read renders a neutral placeholder row rather
 * than sinking the list — the `ConnectionRow` pattern. That matters more here than there:
 * a blocked member may have deleted their account, and this row is the ONLY way to undo
 * the block, so it has to render whatever comes back.
 *
 * The row deliberately does not navigate to the profile. Tapping through to somebody you
 * blocked is not a thing this screen should offer; the only action is undo.
 */
function BlockedRow({ uid, onUnblock }: { uid: string; onUnblock: (uid: string) => void }) {
  const { profile } = useProfile(uid)
  const name = profile?.displayName ?? 'Member'

  return (
    <View style={styles.row}>
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
      <TouchableOpacity style={styles.unblockBtn} onPress={() => onUnblock(uid)} activeOpacity={0.7}>
        <Meta role="eyebrow" tone="clay">Unblock</Meta>
      </TouchableOpacity>
    </View>
  )
}

export default function BlockedUsers() {
  const { user } = useAuth()
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeBlockedUsers(user.uid, setBlocked, () => {
      setBlocked([])
      setError("Couldn't load your blocked list. Check your connection and try again.")
    })
  }, [user])

  const handleUnblock = async (uid: string) => {
    if (!user) return
    setError('')
    try {
      await unblockUser(user.uid, uid)
      // No optimistic removal: the subscription is live, so the row disappears when
      // Firestore confirms. Removing it locally first would show success for a write
      // that might not have landed.
    } catch {
      setError("Couldn't unblock them. Try again.")
    }
  }

  if (blocked === null) return <LoadingView />

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Blocked</Display>
      </View>

      {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

      {blocked.length === 0 ? (
        <EmptyState
          emoji="🙈"
          title="No one is blocked"
          body="Anyone you block will show up here, so you can undo it whenever you want."
        />
      ) : (
        <>
          <Body role="bodySm" style={styles.intro}>
            Blocked members can&apos;t message you or follow you, and you won&apos;t see them
            anywhere in the app.
          </Body>
          <FlatList
            data={blocked}
            keyExtractor={(b) => b.uid}
            renderItem={({ item }) => <BlockedRow uid={item.uid} onUnblock={handleUnblock} />}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md + 2,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.lg,
  },
  intro: { marginHorizontal: space.xl, marginBottom: space.md },
  list: { paddingHorizontal: space.xl, paddingBottom: space.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  avatar: { width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typeScale.eyebrow.fontFamily, fontSize: 15, color: palette.cream },
  rowText: { flex: 1, paddingHorizontal: space.md },
  unblockBtn: {
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.clay,
  },
  error: { marginHorizontal: space.xl, marginBottom: space.sm },
})
