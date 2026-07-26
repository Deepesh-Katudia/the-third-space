import React, { useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { AuthButton } from '../../../components/AuthButton'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { palette, radius, space, NAV_CLEARANCE } from '../../../constants/design'

export default function Overview() {
  const router = useRouter()
  const { user } = useAuth()
  const { venue } = useVenue(user?.uid)
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeVenueEvents(user.uid, setEvents, () => setError("Couldn't load your events."))
  }, [user])

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const nextEvent = upcoming[0]
  const totalRegistrations = (events ?? []).reduce((sum, e) => sum + e.registeredCount, 0)

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Display role="screenTitle" style={styles.title}>{venue?.name ?? 'Your venue'}</Display>
        {error ? <Banner message={error} /> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Display role="stubDay" tone="clay">{events?.length ?? 0}</Display>
            <Meta style={styles.statLabel}>Events created</Meta>
          </View>
          <View style={styles.stat}>
            <Display role="stubDay" tone="clay">{totalRegistrations}</Display>
            <Meta style={styles.statLabel}>Total registrations</Meta>
          </View>
        </View>

        <Display style={styles.sectionTitle}>Next event</Display>
        {nextEvent ? (
          <EventCard event={nextEvent} tone="deep" onPress={() => router.push(`/(app)/event/${nextEvent.id}`)} />
        ) : (
          <Body style={styles.muted}>Nothing scheduled — create your next event.</Body>
        )}

        <View style={styles.cta}>
          <AuthButton label="Create event" onPress={() => router.push('/(app)/create-event')} variant="primary" loading={false} />
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.md },
  title: { marginBottom: space.lg },
  statsRow: { flexDirection: 'row', gap: space.md, marginBottom: space.xl },
  stat: {
    flex: 1,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  statLabel: { marginTop: space.xs },
  sectionTitle: { marginBottom: space.md },
  muted: { marginBottom: space.md },
  // Pinned to the bottom, so it must clear the flat bottom tab bar.
  cta: { marginTop: 'auto', marginBottom: NAV_CLEARANCE },
})
