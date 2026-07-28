import React from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { EmptyState } from '../../components/EmptyState'
import { LoadingView } from '../../components/LoadingView'
import { avatarColor, initials } from '../../utils/avatar'
import { useAuth } from '../../hooks/useAuth'
import { useMessageRequests } from '../../hooks/useMessageRequests'
import { acceptRequest, declineRequest } from '../../services/chat'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { palette, radius, space, type as typeScale } from '../../constants/design'

export default function MessageRequests() {
  const router = useRouter()
  const { user } = useAuth()
  const { requests, loading } = useMessageRequests(user?.uid)

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Display style={styles.back}>←</Display>
        </TouchableOpacity>
        <Display role="screenTitle">Requests</Display>
      </View>

      {loading ? (
        <LoadingView tone="cream" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.infoBanner}>
            <Body role="bodySm">
              Requests stay here until you accept. Decline quietly — they&apos;re never notified.
            </Body>
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
                      <Display>{name}</Display>
                      <View style={styles.interestBadge}>
                        <Meta role="eyebrow" tone="sage">New request</Meta>
                      </View>
                    </View>
                  </View>
                  <Body role="bodyLg" tone="ink" style={styles.preview}>{r.lastMessageText}</Body>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => declineRequest(r.id)}>
                      <Body role="button">Decline</Body>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptRequest(r.id)}>
                      <Body role="button" style={styles.onInk}>Accept</Body>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          )}
        </ScrollView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { fontSize: 24 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  infoBanner: { backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule, borderRadius: radius.ticket, padding: space.lg, marginBottom: space.xl },
  card: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    padding: space.lg,
    marginBottom: space.md + 2,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  avatarText: { ...typeScale.bodySm, fontSize: 16, lineHeight: 20, color: palette.cream },
  cardHead: { flex: 1, gap: space.xs, minWidth: 0 },
  interestBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: palette.sage, borderRadius: radius.pill, paddingHorizontal: space.sm + 2, paddingVertical: 3 },
  preview: { marginBottom: space.lg },
  actions: { flexDirection: 'row', gap: space.md },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: palette.rule, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center' },
  acceptBtn: { flex: 1, backgroundColor: palette.ink, borderRadius: radius.pill, paddingVertical: space.md, alignItems: 'center' },
  onInk: { color: palette.cream },
})
