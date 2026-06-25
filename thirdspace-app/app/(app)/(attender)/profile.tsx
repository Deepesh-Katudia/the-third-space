import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'
import { avatarColor, initials } from '../../../utils/avatar'

// Phase 1: stats and preferences are placeholders; name/email/sign-out are real.
// Phase 2 swap: read the user's profile doc for stats, neighborhood, interests.
const MOCK_STATS = { attended: 12, hosted: 0, connections: 28 }
const MOCK_NEIGHBORHOOD = 'Williamsburg, Brooklyn'

export default function Profile() {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(true)
  const name = user?.displayName ?? 'Member'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>You</Text>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="settings-outline" size={24} color="#8C7B70" />
          </TouchableOpacity>
        </View>

        <View style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
            <Text style={styles.avatarText}>{initials(name)}</Text>
          </View>
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{name}</Text>
              <Ionicons name="checkmark-circle" size={18} color="#7A8C6E" />
            </View>
            <Text style={styles.neighborhood}>{MOCK_NEIGHBORHOOD}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn}>
          <Text style={styles.editText}>Edit profile & photos</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <Stat value={MOCK_STATS.attended} label="Attended" />
          <View style={styles.statDivider} />
          <Stat value={MOCK_STATS.hosted} label="Hosted" />
          <View style={styles.statDivider} />
          <Stat value={MOCK_STATS.connections} label="Connections" />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Row label="Points & badges" onPress={() => router.push('/(app)/badges')} />
          <Row label="Interests & preferences" />
          <Row label="Neighborhoods" />
          <Row label="Become a host" badge="New" last />
        </View>

        <Text style={styles.sectionLabel}>Privacy</Text>
        <View style={styles.card}>
          <Row label="Who can message me" value="Event-mates" />
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E5DCD2', true: '#C4614A' }}
              thumbColor="white"
            />
          </View>
        </View>

        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {badge ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>{badge}</Text>
          </View>
        ) : null}
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5 },

  identity: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  avatar: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 24, color: 'white' },
  identityText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  name: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810' },
  neighborhood: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },

  editBtn: { borderWidth: 1.5, borderColor: '#C4614A', borderRadius: 100, paddingVertical: 12, alignItems: 'center', marginBottom: 24 },
  editText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#C4614A' },

  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 18, paddingVertical: 18, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810' },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: 'rgba(242,197,160,0.6)' },

  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  card: { backgroundColor: 'white', borderRadius: 18, marginBottom: 28, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(242,197,160,0.4)' },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  chevron: { fontSize: 20, color: '#C9B8A8' },
  newBadge: { backgroundColor: '#C4614A', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontFamily: 'DMSans_500Medium', fontSize: 10, color: 'white' },

  signOut: { alignItems: 'center', paddingVertical: 8 },
  signOutText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#C4614A' },
})
