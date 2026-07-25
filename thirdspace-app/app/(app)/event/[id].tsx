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
import { AnnouncementBanner } from '../../../components/AnnouncementBanner'
import { subscribeAnnouncements } from '../../../services/announcements'
import { CommunityEvent, Registration, Announcement } from '../../../types/models'

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
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)

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

  useEffect(() => {
    // Announcement reads are gated to owner/registered by security rules.
    if (!id || (!isOwner && !isRegistered)) return
    return subscribeAnnouncements(id, (list) => setLatestAnnouncement(list[0] ?? null), () => {})
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
        <LinearGradient colors={[tint, '#15161A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
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

          {latestAnnouncement && (isOwner || isRegistered) ? (
            <AnnouncementBanner
              announcement={latestAnnouncement}
              onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: event.id } })}
            />
          ) : null}

          {/* Who's going */}
          <Text style={styles.sectionTitle}>Who's going</Text>
          {isOwner || isRegistered ? (
            <View style={styles.whosGoing}>
              <AttendeeAvatarStack
                uids={attendees.map((a) => a.uid)}
                photoURLs={attendees.map((a) => a.photoURL ?? null)}
                count={attendees.length}
                size={36}
              />
              <Text style={styles.whosGoingText}>
                {attendees.length} {isOwner ? 'registered' : 'going'}
              </Text>
              {attendees.length > 0 ? (
                <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              ) : null}
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
              <LinearGradient colors={['#FF9F3D', '#FFB75B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaGradient}>
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
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  scroll: { paddingBottom: 120 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },

  hero: { height: 280, justifyContent: 'space-between' },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(21,22,26,0.4)', alignItems: 'center', justifyContent: 'center' },
  heroBtnText: { fontSize: 20, color: 'white' },
  heroFooter: { padding: 20 },
  categoryChip: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  categoryText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#15161A' },

  body: { paddingHorizontal: 24, paddingTop: 20 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 30, color: '#15161A', marginBottom: 6, letterSpacing: -0.5 },
  venue: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#6B6F78', marginBottom: 20 },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  infoCard: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(226,224,218,0.5)' },
  infoLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#6B6F78', letterSpacing: 0.6, marginBottom: 6 },
  infoValue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#15161A', marginBottom: 2 },
  infoTime: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  infoFree: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#2FA365' },

  sectionTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 20, color: '#15161A', marginBottom: 12, marginTop: 4 },
  whosGoing: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  whosGoingText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#15161A' },
  seeAll: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#FF9F3D', marginLeft: 'auto' },
  whosGoingLocked: { marginBottom: 24 },
  lockedAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  blurredGroup: { flexDirection: 'row', marginLeft: -11 },
  blurredAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(107,111,120,0.35)', borderWidth: 2, borderColor: '#F3F3F5' },
  lockedText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78', fontStyle: 'italic' },

  description: { fontFamily: 'Poppins_400Regular', fontSize: 15, color: '#15161A', lineHeight: 23, marginBottom: 8 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,249,244,0.98)', borderTopWidth: 1, borderTopColor: 'rgba(226,224,218,0.5)' },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 14, paddingBottom: 6 },
  footerPrice: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: '#15161A' },
  footerSpots: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  cta: { borderRadius: 100, overflow: 'hidden' },
  ctaGradient: { paddingVertical: 16, paddingHorizontal: 44, alignItems: 'center' },
  ctaText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: 'white' },
  ctaOutline: { borderWidth: 1.5, borderColor: '#2FA365', paddingVertical: 14, paddingHorizontal: 28 },
  ctaOutlineText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#2FA365' },
  ctaDanger: { borderWidth: 1.5, borderColor: '#FF3B30', paddingVertical: 14, paddingHorizontal: 28 },
  ctaDangerText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#FF3B30' },
  ctaDisabled: { backgroundColor: 'rgba(107,111,120,0.15)', paddingVertical: 16, paddingHorizontal: 44 },
  ctaDisabledText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#6B6F78' },
})
