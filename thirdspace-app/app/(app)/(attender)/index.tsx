import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { CommunityEvent } from '../../../types/models'
import { subscribeUpcomingEvents } from '../../../services/events'
import { CategoryTabs, CategoryFilter } from '../../../components/CategoryTabs'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'

export default function Feed() {
  const router = useRouter()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')

  useEffect(
    () => subscribeUpcomingEvents(setEvents, () => setError("Couldn't load events. Check your connection.")),
    []
  )

  const visible = useMemo(() => {
    if (!events) return []
    const term = search.trim().toLowerCase()
    return events.filter(
      (e) =>
        (category === 'All' || e.category === category) &&
        (!term ||
          e.title.toLowerCase().includes(term) ||
          e.venueName.toLowerCase().includes(term) ||
          e.neighborhood.toLowerCase().includes(term))
    )
  }, [events, search, category])

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TextInput
          style={styles.search}
          placeholder="Search events, venues, neighborhoods"
          placeholderTextColor="#8C7B70"
          value={search}
          onChangeText={setSearch}
        />
        <CategoryTabs selected={category} onSelect={setCategory} />
        {error ? <Banner message={error} /> : null}
      </View>
      {!events && !error ? (
        <LoadingView />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <EventCard event={item} onPress={() => router.push(`/(app)/event/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              emoji="🗓️"
              title="No events yet"
              body="New events appear here in real time — check back soon."
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 12 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 12, letterSpacing: -0.5 },
  search: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(242,197,160,0.4)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810' },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
})
