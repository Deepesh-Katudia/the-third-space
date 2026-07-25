import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { avatarColor, initials } from '../../utils/avatar'
import { useAuth } from '../../hooks/useAuth'
import { useMessageRequests } from '../../hooks/useMessageRequests'
import { acceptRequest, declineRequest } from '../../services/chat'

export default function MessageRequests() {
  const router = useRouter()
  const { user } = useAuth()
  const { requests, loading } = useMessageRequests(user?.uid)

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Requests</Text>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoText}>
              Requests stay here until you accept. Decline quietly — they're never notified.
            </Text>
          </View>

          {requests.length === 0 ? (
            <EmptyState emoji="✉" title="All caught up" body="You have no pending message requests." />
          ) : (
            requests.map((r) => {
              const name = r.names[r.requestedBy] ?? r.lastMessageAuthor ?? 'Member'
              return (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor(name) }]}>
                      <Text style={styles.avatarText}>{initials(name)}</Text>
                    </View>
                    <View style={styles.cardHead}>
                      <Text style={styles.name}>{name}</Text>
                      <View style={styles.interestBadge}>
                        <Text style={styles.interestText}>New request</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.preview}>{r.lastMessageText}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(r.id)}>
                      <Text style={styles.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(r.id)}>
                      <Text style={styles.acceptText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#15161A' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 26, color: '#15161A', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  infoBanner: { backgroundColor: 'rgba(226,224,218,0.18)', borderRadius: 14, padding: 16, marginBottom: 20 },
  infoText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#3A3A3A', lineHeight: 19 },
  card: { backgroundColor: 'white', borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'white' },
  cardHead: { flex: 1, gap: 4 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#15161A' },
  interestBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(47,163,101,0.16)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  interestText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#25804E' },
  preview: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#15161A', lineHeight: 20, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(226,224,218,0.8)', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  declineText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#6B6F78' },
  acceptBtn: { flex: 1, backgroundColor: '#FF9F3D', borderRadius: 100, paddingVertical: 12, alignItems: 'center' },
  acceptText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#15161A' },
})
