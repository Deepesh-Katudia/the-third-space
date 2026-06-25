import React, { useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { avatarColor, initials } from '../../utils/avatar'

// ── Phase 1 mock data ─────────────────────────────────────────────────────
// Phase 2 swap: read pending message requests; Accept/Decline write to Firestore.
interface MessageRequest {
  id: string
  name: string
  sharedInterest: string
  preview: string
}

const MOCK_REQUESTS: MessageRequest[] = [
  { id: 'r1', name: 'Jordan Avery', sharedInterest: 'Both into Film', preview: "Hey! We were both at the rooftop sketching night — would love to swap studio recs." },
  { id: 'r2', name: 'Priya Nair', sharedInterest: '3 shared interests', preview: 'Loved your take in the wine social chat. Are you going to the next one?' },
]
// ──────────────────────────────────────────────────────────────────────────

export default function MessageRequests() {
  const router = useRouter()
  const [requests, setRequests] = useState<MessageRequest[]>(MOCK_REQUESTS)

  const resolve = (id: string) => setRequests((prev) => prev.filter((r) => r.id !== id))

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Requests</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            Requests stay here until you accept. Decline quietly — they're never notified.
          </Text>
        </View>

        {requests.length === 0 ? (
          <EmptyState emoji="✉" title="All caught up" body="You have no pending message requests." />
        ) : (
          requests.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: avatarColor(r.name) }]}>
                  <Text style={styles.avatarText}>{initials(r.name)}</Text>
                </View>
                <View style={styles.cardHead}>
                  <Text style={styles.name}>{r.name}</Text>
                  <View style={styles.interestBadge}>
                    <Text style={styles.interestText}>{r.sharedInterest}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.preview}>{r.preview}</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.declineBtn} onPress={() => resolve(r.id)}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => resolve(r.id)}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#2C1810' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  infoBanner: { backgroundColor: 'rgba(242,197,160,0.18)', borderRadius: 14, padding: 16, marginBottom: 20 },
  infoText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#6B3F2A', lineHeight: 19 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  cardHead: { flex: 1, gap: 4 },
  name: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2C1810' },
  interestBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(122,140,110,0.16)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  interestText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#5c6e51' },
  preview: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810', lineHeight: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(242,197,160,0.8)', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  declineText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#8C7B70' },
  acceptBtn: { flex: 1, backgroundColor: '#C4614A', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  acceptText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: 'white' },
})
