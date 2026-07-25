import React from 'react'
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { useAuth } from '../../hooks/useAuth'
import { useConnections } from '../../hooks/useConnections'
import { useProfile } from '../../hooks/useProfile'
import { avatarColor, initials } from '../../utils/avatar'

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
        <Text style={styles.name}>{name}</Text>
        {profile?.neighborhood ? <Text style={styles.neighborhood}>{profile.neighborhood}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  )
}

export default function Connections() {
  const router = useRouter()
  const { user } = useAuth()
  const { connectionUids, loading, hasError } = useConnections(user?.uid)

  if (loading) return <LoadingView />

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Connections</Text>
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  list: { paddingHorizontal: 24, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: 'white' },
  rowText: { flex: 1 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#15161A' },
  neighborhood: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78', marginTop: 1 },
  chevron: { fontSize: 20, color: '#C9CCD2' },
})
