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
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { palette, radius, space, type as typeScale } from '../../../constants/design'

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
      <Screen tone="deep">
        <StatusBar style="dark" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Display style={styles.back}>←</Display>
          </TouchableOpacity>
        </View>
        <EmptyState emoji="🫥" title="Event not found" body="This event may have been cancelled by the venue." />
      </Screen>
    )
  }

  const youAreGoing = !!user && attendees.some((a) => a.uid === user.uid)
  const total = attendees.length
  const hostName = venue?.name ?? event.venueName
  const hostStat = venue ? `Hosting · ${venue.eventsCount} event${venue.eventsCount === 1 ? '' : 's'}` : 'Host'

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Display style={styles.back}>←</Display>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Display role="screenTitle">Who&apos;s going</Display>
          <Body role="bodySm">{event.title} · {total} going</Body>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

        {youAreGoing ? (
          <View style={styles.youBanner}>
            <Meta role="eyebrow" tone="sage">✓ You&apos;re going to this event</Meta>
          </View>
        ) : null}

        <Meta role="eyebrow" style={styles.sectionLabel}>Host</Meta>
        <View style={styles.hostCard}>
          <View style={[styles.avatar, styles.hostAvatar, { backgroundColor: avatarColor(hostName) }]}>
            <Text style={styles.avatarText}>{initials(hostName)}</Text>
          </View>
          <View style={styles.rowText}>
            <Display numberOfLines={1}>{hostName}</Display>
            <Body role="bodySm">{hostStat}</Body>
          </View>
          <TouchableOpacity style={styles.messageBtn}>
            <Meta role="eyebrow" tone="clay">Message</Meta>
          </TouchableOpacity>
        </View>

        <Meta role="eyebrow" style={styles.sectionLabel}>Attendees · {attendees.length}</Meta>
        {attendees.length === 0 ? (
          <Body role="bodySm" style={styles.emptyAttendees}>No one has registered yet. Be the first.</Body>
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
                  <Display numberOfLines={1}>
                    {a.displayName}{a.age ? `, ${a.age}` : ''}
                  </Display>
                  {metaParts.length > 0 ? <Body role="bodySm" numberOfLines={1}>{metaParts.join(' · ')}</Body> : null}
                </View>
                <Meta style={styles.messageIcon}>✉</Meta>
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id } })}>
          <Body role="button" style={styles.onInk}>Open group chat</Body>
        </TouchableOpacity>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  back: { fontSize: 24 },
  headerText: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xl },
  error: { marginBottom: space.lg },
  youBanner: {
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.xl,
  },
  sectionLabel: { marginBottom: space.sm + 2 },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.md + 2,
    marginBottom: space.xl,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm + 2, borderBottomWidth: 1, borderBottomColor: palette.rule },
  emptyAttendees: { paddingVertical: space.sm },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hostAvatar: { borderRadius: radius.ticket },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  avatarText: { ...typeScale.bodySm, color: palette.cream },
  rowText: { flex: 1, minWidth: 0 },
  messageBtn: { borderWidth: 1, borderColor: palette.clay, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: space.sm },
  messageIcon: { fontSize: 18 },
  footer: { paddingHorizontal: space.xl, paddingTop: space.md, backgroundColor: palette.orangeLight, borderTopWidth: 1, borderTopColor: palette.rule },
  chatBtn: { backgroundColor: palette.ink, borderRadius: radius.ticket, paddingVertical: space.lg, alignItems: 'center' },
  onInk: { color: palette.cream },
})
