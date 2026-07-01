import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
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
import { formatDayDate, formatTime, spotsLeftText } from '../../../utils/eventHelpers'
import { POINTS_PER_EVENT } from '../../../utils/points'
import { CATEGORY_COLORS } from '../../../constants/categories'
import { Banner } from '../../../components/Banner'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { RegistrationConfirmation } from '../../../components/RegistrationConfirmation'
import { CommunityEvent, Registration } from '../../../types/models'

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [isRegistered, setIsRegistered] = useState(false)
  const [attendees, setAttendees] = useState<Registration[]>([])
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

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
    // Registrations are readable by the event owner and by co-attendees (security
    // rules). Non-registered users keep the count-only blur gate below.
    if (!id || (!isOwner && !isRegistered)) return
    return subscribeRegistrations(id, setAttendees, () => setBanner("Couldn't load attendees."))
  }, [id, isOwner, isRegistered])

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
  const tint = CATEGORY_COLORS[event.category]
  // Registered users (and the owner) see real attendee avatars from the
  // subscription. Non-registered users only get count-driven blurred placeholders.
  const attendeeSeeds = attendees.map((a) => a.uid)
  const lockedSeeds = Array.from({ length: Math.min(event.registeredCount, 3) }, (_, i) => `${event.id}:${i}`)

  const handleRegister = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    try {
      await registerForEvent(event.id, user.uid, user.displayName ?? 'Member')
      setShowConfirmation(true)
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
    try {
      await cancelRegistration(event.id, user.uid)
    } catch {
      setBanner("Couldn't cancel your registration. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleCancelEvent = () => {
    Alert.alert('Cancel this event?', 'This removes the event and all registrations. This cannot be undone.', [
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
    ])
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient colors={[tint, '#2C1810']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <SafeAreaView edges={['top']} style={styles.heroBar}>
            <TouchableOpacity style={styles.heroBtn} onPress={() => router.back()} hitSlop={8}>
              <Text style={styles.heroBtnText}>←</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.heroBtn} onPress={() => setSaved((s) => !s)} hitSlop={8}>
              <Text style={styles.heroBtnText}>{saved ? '♥' : '♡'}</Text>
            </TouchableOpacity>
          </SafeAreaView>
          <View style={styles.heroFooter}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.venue}>{event.venueName} · {event.neighborhood}</Text>

          {/* Info cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>WHEN</Text>
              <Text style={styles.infoValue}>{formatDayDate(startsAt)}</Text>
              <Text style={styles.infoTime}>{formatTime(startsAt)}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>SPOTS</Text>
              <Text style={styles.infoValue}>{spotsLeftText(event.capacity, event.registeredCount)}</Text>
              <Text style={styles.infoFree}>Free</Text>
            </View>
          </View>

          {banner ? <Banner message={banner} /> : null}

          {/* Who's going */}
          <Text style={styles.sectionTitle}>Who's going</Text>
          {isOwner ? (
            <View style={styles.whosGoing}>
              <AttendeeAvatarStack uids={attendees.map((a) => a.uid)} count={attendees.length} size={36} />
              <Text style={styles.whosGoingText}>{attendees.length} registered</Text>
              {attendees.length > 0 ? (
                <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : isRegistered ? (
            <View style={styles.whosGoing}>
              <AttendeeAvatarStack uids={attendeeSeeds} count={event.registeredCount} size={36} />
              <Text style={styles.whosGoingText}>{event.registeredCount} going</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.whosGoingLocked}>
              <View style={styles.lockedAvatars}>
                <AttendeeAvatarStack uids={lockedSeeds} count={3} size={36} max={3} />
                <View style={styles.blurredGroup}>
                  <View style={styles.blurredAvatar} />
                  <View style={[styles.blurredAvatar, { marginLeft: -11 }]} />
                </View>
              </View>
              <Text style={styles.lockedText}>Register to unlock who's going</Text>
            </View>
          )}

          {/* About */}
          {event.description ? (
            <>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{event.description}</Text>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerInner}>
          <View>
            <Text style={styles.footerPrice}>Free</Text>
            <Text style={styles.footerSpots}>{spotsLeftText(event.capacity, event.registeredCount)}</Text>
          </View>
          {isOwner ? (
            <TouchableOpacity style={[styles.cta, styles.ctaDanger]} onPress={handleCancelEvent}>
              <Text style={styles.ctaDangerText}>Cancel event</Text>
            </TouchableOpacity>
          ) : isRegistered ? (
            <TouchableOpacity style={[styles.cta, styles.ctaOutline]} onPress={handleCancelRegistration} disabled={busy}>
              <Text style={styles.ctaOutlineText}>{busy ? '…' : "You're going ✓"}</Text>
            </TouchableOpacity>
          ) : soldOut ? (
            <View style={[styles.cta, styles.ctaDisabled]}>
              <Text style={styles.ctaDisabledText}>Sold out</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.cta} onPress={handleRegister} disabled={busy}>
              <LinearGradient colors={['#C4614A', '#E8855F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>{busy ? '…' : 'Register'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <RegistrationConfirmation
        visible={showConfirmation}
        eventTitle={event.title}
        dateLine={`${formatDayDate(startsAt)} · ${formatTime(startsAt)}`}
        venueLine={`${event.venueName} · ${event.neighborhood}`}
        pointsEarned={POINTS_PER_EVENT}
        onSeeGuests={() => {
          setShowConfirmation(false)
          router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })
        }}
        onJoinChat={() => {
          setShowConfirmation(false)
          router.push({ pathname: '/(app)/chat/[id]', params: { id: event.id } })
        }}
        onClose={() => setShowConfirmation(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { paddingBottom: 120 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },

  hero: { height: 280, justifyContent: 'space-between' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(44,24,16,0.4)', alignItems: 'center', justifyContent: 'center' },
  heroBtnText: { fontSize: 20, color: 'white' },
  heroFooter: { padding: 20 },
  categoryChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  categoryText: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#2C1810' },

  body: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: '#2C1810', marginBottom: 6, letterSpacing: -0.5 },
  venue: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#8C7B70', marginBottom: 20 },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  infoLabel: { fontFamily: 'DMSans_500Medium', fontSize: 11, color: '#8C7B70', letterSpacing: 0.6, marginBottom: 6 },
  infoValue: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810', marginBottom: 2 },
  infoTime: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  infoFree: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#7A8C6E' },

  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12, marginTop: 4 },
  whosGoing: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  whosGoingText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810' },
  seeAll: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#C4614A', marginLeft: 'auto' },
  whosGoingLocked: { marginBottom: 24 },
  lockedAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  blurredGroup: { flexDirection: 'row', marginLeft: -11 },
  blurredAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(140,123,112,0.35)', borderWidth: 2, borderColor: '#FBF7F2' },
  lockedText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', fontStyle: 'italic' },

  description: { fontFamily: 'DMSans_300Light', fontSize: 15, color: '#2C1810', lineHeight: 23, marginBottom: 8 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,249,244,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(242,197,160,0.5)' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 },
  footerPrice: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 22, color: '#2C1810' },
  footerSpots: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  cta: { borderRadius: 100, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, paddingHorizontal: 44, alignItems: 'center' },
  ctaText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: 'white' },
  ctaOutline: { borderWidth: 1.5, borderColor: '#7A8C6E', paddingVertical: 14, paddingHorizontal: 28 },
  ctaOutlineText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#7A8C6E' },
  ctaDanger: { borderWidth: 1.5, borderColor: '#dc2626', paddingVertical: 14, paddingHorizontal: 28 },
  ctaDangerText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#dc2626' },
  ctaDisabled: { backgroundColor: 'rgba(140,123,112,0.15)', paddingVertical: 16, paddingHorizontal: 44 },
  ctaDisabledText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#8C7B70' },
})
