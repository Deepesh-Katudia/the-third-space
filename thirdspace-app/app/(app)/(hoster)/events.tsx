import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'

export default function HosterEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    return subscribeVenueEvents(user.uid, setEvents, () => setError("Couldn't load your events."))
  }, [user])

  if (!events && !error) return <LoadingView />

  const now = Date.now()
  const upcoming = (events ?? []).filter((e) => e.startsAt.toMillis() >= now)
  const past = (events ?? []).filter((e) => e.startsAt.toMillis() < now).reverse()
  const ordered = [...upcoming, ...past]

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Your events</Text>
        <TouchableOpacity onPress={() => router.push('/(app)/create-event')} style={styles.createButton}>
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>
      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}
      <FlatList
        data={ordered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            emoji="✨"
            title="No events yet"
            body="Create your first event and it appears in the community feed instantly."
            actionLabel="Create event"
            onAction={() => router.push('/(app)/create-event')}
          />
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, marginBottom: 16 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', letterSpacing: -0.5 },
  createButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { paddingHorizontal: 24 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
