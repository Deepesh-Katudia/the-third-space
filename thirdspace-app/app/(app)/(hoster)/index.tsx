import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>{venue?.name ?? 'Your venue'}</Text>
        {error ? <Banner message={error} /> : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{events?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Events created</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{totalRegistrations}</Text>
            <Text style={styles.statLabel}>Total registrations</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Next event</Text>
        {nextEvent ? (
          <EventCard event={nextEvent} onPress={() => router.push(`/(app)/event/${nextEvent.id}`)} />
        ) : (
          <Text style={styles.muted}>Nothing scheduled — create your next event.</Text>
        )}

        <View style={styles.cta}>
          <AuthButton label="Create event" onPress={() => router.push('/(app)/create-event')} variant="primary" loading={false} />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 20, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, backgroundColor: 'white', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)' },
  statNumber: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#C4614A' },
  statLabel: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70', marginTop: 4 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12 },
  muted: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#8C7B70', marginBottom: 12 },
  cta: { marginTop: 'auto', marginBottom: 24 },
})
