import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, FlatList, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import {
  subscribeEvent,
  subscribeIsRegistered,
  subscribeRegistrations,
  registerForEvent,
  cancelRegistration,
  deleteEventWithRegistrations,
} from '../../../services/events'
import { formatEventDate, spotsLeftText } from '../../../utils/eventHelpers'
import { CATEGORY_COLORS } from '../../../constants/categories'
import { AuthButton } from '../../../components/AuthButton'
import { Banner } from '../../../components/Banner'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent, Registration } from '../../../types/models'

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  // undefined = loading, null = not found / cancelled
  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [isRegistered, setIsRegistered] = useState(false)
  const [attendees, setAttendees] = useState<Registration[]>([])
  const [banner, setBanner] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  const isOwner = !!user && !!event && event.venueId === user.uid

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setBanner("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id || !user || isOwner) return
    return subscribeIsRegistered(id, user.uid, setIsRegistered)
  }, [id, user, isOwner])

  useEffect(() => {
    if (!id || !isOwner) return
    return subscribeRegistrations(id, setAttendees, () => setBanner("Couldn't load attendees."))
  }, [id, isOwner])

  if (event === undefined) return <LoadingView />

  if (event === null) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState emoji="🫥" title="Event not found" body="This event may have been cancelled by the venue." />
        <TouchableOpacity onPress={() => router.back()} style={styles.backCenter}>
          <Text style={styles.backText}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  const handleRegister = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    setSuccess('')
    try {
      await registerForEvent(event.id, user.uid, user.displayName ?? 'Member')
      setSuccess("You're in! See you there.")
    } catch {
      setBanner('Registration failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelRegistration = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    setSuccess('')
    try {
      await cancelRegistration(event.id, user.uid)
    } catch {
      setBanner("Couldn't cancel your registration. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleCancelEvent = () => {
    Alert.alert(
      'Cancel this event?',
      'This removes the event and all registrations. This cannot be undone.',
      [
        { text: 'Keep event', style: 'cancel' },
        {
          text: 'Cancel event',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEventWithRegistrations(event.id)
              router.back()
            } catch {
              setBanner("Couldn't cancel the event. Try again.")
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.badgeRow}>
          <View style={[styles.categoryChip, { backgroundColor: CATEGORY_COLORS[event.category] }]}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
          {event.ageRequirement === '21+' ? <Text style={styles.ageBadge}>21+</Text> : null}
        </View>

        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.venue}>{event.venueName} · {event.neighborhood}</Text>
        <Text style={styles.date}>{formatEventDate(startsAt)}</Text>
        <Text style={styles.spots}>{spotsLeftText(event.capacity, event.registeredCount)} · Free</Text>
        <Text style={styles.description}>{event.description}</Text>

        {banner ? <Banner message={banner} /> : null}
        {success ? <Banner message={success} tone="success" /> : null}

        {isOwner ? (
          <View>
            <Text style={styles.sectionTitle}>Registered ({attendees.length})</Text>
            {attendees.length === 0 ? (
              <Text style={styles.muted}>No one has registered yet.</Text>
            ) : (
              <FlatList
                data={attendees}
                keyExtractor={(a) => a.uid}
                scrollEnabled={false}
                renderItem={({ item }) => <Text style={styles.attendee}>{item.displayName}</Text>}
              />
            )}
            <View style={styles.ownerActions}>
              <TouchableOpacity onPress={handleCancelEvent} style={styles.cancelEventButton}>
                <Text style={styles.cancelEventText}>Cancel event</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isRegistered ? (
          <AuthButton label="Cancel registration" onPress={handleCancelRegistration} variant="primary" loading={busy} />
        ) : soldOut ? (
          <View style={styles.soldOutBox}>
            <Text style={styles.soldOutText}>Sold out</Text>
          </View>
        ) : (
          <AuthButton label="Register — Free" onPress={handleRegister} variant="primary" loading={busy} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 12, paddingBottom: 40 },
  back: { marginBottom: 20 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  categoryChip: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: 'white' },
  ageBadge: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#6B5B95' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: '#2C1810', marginBottom: 6, letterSpacing: -0.5 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#8C7B70', marginBottom: 4 },
  date: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 4 },
  spots: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#5B8C5A', marginBottom: 16 },
  description: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#2C1810', lineHeight: 22, marginBottom: 24 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12 },
  muted: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#8C7B70' },
  attendee: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#2C1810', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(242,197,160,0.4)' },
  ownerActions: { marginTop: 24 },
  cancelEventButton: { borderWidth: 1, borderColor: '#dc2626', borderRadius: 100, paddingVertical: 14, alignItems: 'center' },
  cancelEventText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#dc2626' },
  soldOutBox: { backgroundColor: 'rgba(140,123,112,0.15)', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  soldOutText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#8C7B70' },
})
