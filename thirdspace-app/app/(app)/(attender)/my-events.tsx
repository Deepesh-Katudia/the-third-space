import React, { useCallback, useState } from 'react'
import { View, Text, SectionList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { getMyRegisteredEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'

export default function MyEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    try {
      setEvents(await getMyRegisteredEvents(user.uid))
      setError('')
    } catch {
      setError("Couldn't load your events. Pull down to retry.")
    }
  }, [user])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const past = (events ?? []).filter((e) => e.startsAt.toMillis() < now).reverse()
  const sections = [
    { title: 'Upcoming', data: upcoming },
    { title: 'Past', data: past },
  ].filter((s) => s.data.length > 0)

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>My Events</Text>
      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}
      <SectionList
        sections={sections}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
        )}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        contentContainerStyle={styles.list}
        onRefresh={load}
        refreshing={false}
        ListEmptyComponent={
          <EmptyState
            emoji="🎟️"
            title="No events yet"
            body="Events you register for show up here."
            actionLabel="Browse events"
            onAction={() => router.push('/(app)/(attender)')}
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 12, marginBottom: 16 },
  bannerWrap: { paddingHorizontal: 24 },
  sectionTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 20, color: '#2C1810', marginBottom: 12, marginTop: 8 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
