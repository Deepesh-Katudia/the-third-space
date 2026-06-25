import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { avatarColor, initials } from '../../../utils/avatar'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: read events/{id}/registrations once group-list reads are allowed.
interface MockHost {
  name: string
  stat: string
}
interface MockAttendee {
  uid: string
  name: string
  age: number
  neighborhood: string
  interests: string[]
}

const MOCK_EVENT_NAME = 'Sunset Rooftop Sketching'
const MOCK_HOST: MockHost = { name: 'The Atrium', stat: 'Hosting · 24 events · 4.9 ★' }
const MOCK_ATTENDEES: MockAttendee[] = [
  { uid: 'a1', name: 'Maya Chen', age: 27, neighborhood: 'Williamsburg', interests: ['Art', 'Coffee'] },
  { uid: 'a2', name: 'Devon Park', age: 31, neighborhood: 'Bushwick', interests: ['Design', 'Film'] },
  { uid: 'a3', name: 'Sofia Reyes', age: 24, neighborhood: 'Greenpoint', interests: ['Painting'] },
  { uid: 'a4', name: 'Liam Walsh', age: 29, neighborhood: 'Park Slope', interests: ['Photography', 'Hiking'] },
  { uid: 'a5', name: 'Aria Singh', age: 26, neighborhood: 'Bed-Stuy', interests: ['Music', 'Art'] },
]
// ──────────────────────────────────────────────────────────────────────────

export default function GuestList() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const total = MOCK_ATTENDEES.length + 1

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Who's going</Text>
          <Text style={styles.subtitle}>{MOCK_EVENT_NAME} · {total} going</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.youBanner}>
          <Text style={styles.youText}>✓ You're going to this event</Text>
        </View>

        <Text style={styles.sectionLabel}>Host</Text>
        <View style={styles.hostCard}>
          <View style={[styles.avatar, styles.hostAvatar, { backgroundColor: avatarColor(MOCK_HOST.name) }]}>
            <Text style={styles.avatarText}>{initials(MOCK_HOST.name)}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name}>{MOCK_HOST.name}</Text>
            <Text style={styles.meta}>{MOCK_HOST.stat}</Text>
          </View>
          <TouchableOpacity style={styles.messageBtn}>
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Attendees · {MOCK_ATTENDEES.length}</Text>
        {MOCK_ATTENDEES.map((a) => (
          <TouchableOpacity
            key={a.uid}
            style={styles.attendeeRow}
            onPress={() => router.push({ pathname: '/(app)/member/[uid]', params: { uid: a.uid } })}
          >
            <View style={[styles.avatar, { backgroundColor: avatarColor(a.name) }]}>
              <Text style={styles.avatarText}>{initials(a.name)}</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name}>{a.name}, {a.age}</Text>
              <Text style={styles.meta}>{a.neighborhood} · {a.interests.join(', ')}</Text>
            </View>
            <Text style={styles.messageIcon}>✉</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id } })}>
          <Text style={styles.chatBtnText}>Open group chat</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  headerText: {},
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810', letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  youBanner: { backgroundColor: 'rgba(122,140,110,0.15)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20 },
  youText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#5c6e51' },
  sectionLabel: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#8C7B70', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hostAvatar: { borderRadius: 14 },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  rowText: { flex: 1 },
  name: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 2 },
  meta: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  messageBtn: { borderWidth: 1, borderColor: '#C4614A', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  messageBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#C4614A' },
  messageIcon: { fontSize: 18, color: '#8C7B70' },
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#FBF7F2', borderTopWidth: 1, borderTopColor: 'rgba(242,197,160,0.5)' },
  chatBtn: { backgroundColor: '#2C1810', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  chatBtnText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#FBF7F2' },
})
