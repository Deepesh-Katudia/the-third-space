import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { subscribeEvent, subscribeRegistrations } from '../../../services/events'
import { getVenue, VenueWithStats } from '../../../services/venues'
import { LoadingView } from '../../../components/LoadingView'
import { EmptyState } from '../../../components/EmptyState'
import { CommunityEvent, Registration } from '../../../types/models'
import { avatarColor, initials } from '../../../utils/avatar'

export default function GuestList() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [attendees, setAttendees] = useState<Registration[]>([])
  const [venue, setVenue] = useState<VenueWithStats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setError("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeRegistrations(id, setAttendees, () => setError("Couldn't load the guest list."))
  }, [id])

  useEffect(() => {
    if (!event) return
    let cancelled = false
    getVenue(event.venueId)
      .then((v) => { if (!cancelled) setVenue(v) })
      .catch(() => { if (!cancelled) setVenue(null) })
    return () => { cancelled = true }
  }, [event])

  if (event === undefined) return <LoadingView />

  if (event === null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        </View>
        <EmptyState emoji="🫥" title="Event not found" body="This event may have been cancelled by the venue." />
      </SafeAreaView>
    )
  }

  const youAreGoing = !!user && attendees.some((a) => a.uid === user.uid)
  const total = attendees.length
  const hostName = venue?.name ?? event.venueName
  const hostStat = venue ? `Hosting · ${venue.eventsCount} event${venue.eventsCount === 1 ? '' : 's'}` : 'Host'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>Who's going</Text>
          <Text style={styles.subtitle}>{event.title} · {total} going</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {youAreGoing ? (
          <View style={styles.youBanner}>
            <Text style={styles.youText}>✓ You're going to this event</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Host</Text>
        <View style={styles.hostCard}>
          <View style={[styles.avatar, styles.hostAvatar, { backgroundColor: avatarColor(hostName) }]}>
            <Text style={styles.avatarText}>{initials(hostName)}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.name}>{hostName}</Text>
            <Text style={styles.meta}>{hostStat}</Text>
          </View>
          <TouchableOpacity style={styles.messageBtn}>
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Attendees · {attendees.length}</Text>
        {attendees.length === 0 ? (
          <Text style={styles.emptyAttendees}>No one has registered yet. Be the first.</Text>
        ) : (
          attendees.map((a) => {
            const metaParts = [a.neighborhood, (a.interestsPreview ?? []).join(', ')].filter(Boolean)
            return (
              <TouchableOpacity
                key={a.uid}
                style={styles.attendeeRow}
                onPress={() => router.push({ pathname: '/(app)/member/[uid]', params: { uid: a.uid } })}
              >
                {a.photoURL ? (
                  <Image source={{ uri: a.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: avatarColor(a.displayName) }]}>
                    <Text style={styles.avatarText}>{initials(a.displayName)}</Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.name}>
                    {a.displayName}{a.age ? `, ${a.age}` : ''}
                  </Text>
                  {metaParts.length > 0 ? <Text style={styles.meta}>{metaParts.join(' · ')}</Text> : null}
                </View>
                <Text style={styles.messageIcon}>✉</Text>
              </TouchableOpacity>
            )
          })
        )}
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
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
  back: { fontSize: 24, color: '#15161A' },
  headerText: {},
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#15161A', letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30', marginBottom: 16 },
  youBanner: { backgroundColor: 'rgba(47,163,101,0.15)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20 },
  youText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#25804E' },
  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#6B6F78', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  hostCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  emptyAttendees: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78', paddingVertical: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hostAvatar: { borderRadius: 14 },
  avatarText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'white' },
  rowText: { flex: 1 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', marginBottom: 2 },
  meta: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  messageBtn: { borderWidth: 1, borderColor: '#FF9F3D', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  messageBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#FF9F3D' },
  messageIcon: { fontSize: 18, color: '#6B6F78' },
  footer: { paddingHorizontal: 24, paddingTop: 12, backgroundColor: '#F3F3F5', borderTopWidth: 1, borderTopColor: 'rgba(226,224,218,0.5)' },
  chatBtn: { backgroundColor: '#15161A', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  chatBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#F3F3F5' },
})
