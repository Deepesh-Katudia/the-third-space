import React, { useEffect, useState } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { subscribeVenueEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Meta } from '../../../components/ui/Text'
import { IconButton } from '../../../components/ui/IconButton'
import { CityChip } from '../../../components/ui/CityChip'
import { space, NAV_CLEARANCE } from '../../../constants/design'

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
    <Screen tone="deep">
      <StatusBar style="dark" />
      <View style={styles.topbar}>
        <Display role="screenTitle" style={styles.tagline}>Your events</Display>
        <View style={styles.rightCol}>
          <CityChip label="NYC + Brooklyn" />
          <IconButton name="add" accessibilityLabel="Create event" onPress={() => router.push('/(app)/create-event')} />
        </View>
      </View>

      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}

      <FlatList
        data={ordered}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <View>
            <EventCard
              event={item}
              tone="deep"
              onPress={() => router.push({ pathname: '/(app)/event/[id]', params: { id: item.id } })}
            />
            <TouchableOpacity
              style={styles.announceBtn}
              onPress={() => router.push({ pathname: '/(app)/(hoster)/announcement/[id]', params: { id: item.id } })}
            >
              <Meta role="eyebrow" tone="clay">Send announcement</Meta>
            </TouchableOpacity>
          </View>
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
    </Screen>
  )
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingTop: space.md, marginBottom: space.lg },
  tagline: { maxWidth: 180 },
  rightCol: { alignItems: 'flex-end', gap: space.sm },
  bannerWrap: { paddingHorizontal: space.lg },
  list: { paddingHorizontal: space.lg, paddingBottom: NAV_CLEARANCE },
  announceBtn: { alignSelf: 'flex-start', marginTop: -space.xs, paddingVertical: space.sm, paddingHorizontal: space.xs },
})
