import React, { useCallback, useMemo, useState } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { getMyRegisteredEvents } from '../../../services/events'
import { EventCard } from '../../../components/EventCard'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'
import { daysUntil } from '../../../utils/eventHelpers'
import { Screen } from '../../../components/ui/Screen'
import { Display, Meta } from '../../../components/ui/Text'
import { palette, radius, space, NAV_CLEARANCE } from '../../../constants/design'

type TabKey = 'upcoming' | 'hosting' | 'past'

export default function MyEvents() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<CommunityEvent[] | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<TabKey>('upcoming')

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

  const now = Date.now()
  const { upcoming, past } = useMemo(() => {
    const list = events ?? []
    return {
      upcoming: list.filter((e) => e.startsAt.toMillis() >= now).sort((a, b) => a.startsAt.toMillis() - b.startsAt.toMillis()),
      past: list.filter((e) => e.startsAt.toMillis() < now).sort((a, b) => b.startsAt.toMillis() - a.startsAt.toMillis()),
    }
  }, [events, now])

  if (!events && !error) return <LoadingView />

  const tabs: { key: TabKey; label: string; count: number | null }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'hosting', label: 'Hosting', count: 0 },
    { key: 'past', label: 'Past', count: null },
  ]

  const goEvent = (id: string) => router.push({ pathname: '/(app)/event/[id]', params: { id } })

  const [next, ...restUpcoming] = upcoming

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <Display role="screenTitle" style={styles.title}>My events</Display>

      <View style={styles.tabRow}>
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabPill, active && styles.tabPillActive]}>
              <Meta role="eyebrow" tone={active ? 'clay' : 'inkSoft'}>
                {t.label}
                {t.count !== null ? ` · ${t.count}` : ''}
              </Meta>
            </TouchableOpacity>
          )
        })}
      </View>

      {error ? <View style={styles.bannerWrap}><Banner message={error} /></View> : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {tab === 'upcoming' &&
          (upcoming.length === 0 ? (
            <EmptyState
              emoji="🎟️"
              title="Nothing on the calendar"
              body="Events you register for show up here."
              actionLabel="Browse events"
              onAction={() => router.push('/(app)/(attender)')}
            />
          ) : (
            <>
              {/* Same card as everywhere else — "next up" earns its emphasis from the
                  eyebrow and the footer actions, not from a second card shape. */}
              <Meta role="eyebrow" tone="clay" style={styles.nextLabel}>Next up · {nextUpLabel(next, now)}</Meta>
              <EventCard
                event={next}
                tone="deep"
                onPress={() => goEvent(next.id)}
                footer={
                  <View style={styles.nextFooter}>
                    <AttendeeAvatarStack
                      uids={Array.from({ length: Math.min(next.registeredCount, 4) }, (_, i) => `${next.id}:${i}`)}
                      count={next.registeredCount}
                      size={28}
                    />
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: next.id } })}
                    >
                      <Meta role="eyebrow" style={styles.onInk}>Open chat</Meta>
                    </TouchableOpacity>
                  </View>
                }
              />

              {restUpcoming.length > 0 ? (
                <>
                  <Meta role="eyebrow" style={styles.sectionLabel}>Also coming up</Meta>
                  {restUpcoming.map((e) => (
                    <EventCard key={e.id} event={e} tone="deep" onPress={() => goEvent(e.id)} trailing={<GoingBadge />} />
                  ))}
                </>
              ) : null}
            </>
          ))}

        {tab === 'hosting' && (
          <EmptyState
            emoji="✦"
            title="You're not hosting yet"
            body="Become a host to create events and gather your own community."
            actionLabel="Become a host"
            onAction={() => router.push('/(app)/(attender)/profile')}
          />
        )}

        {tab === 'past' &&
          (past.length === 0 ? (
            <EmptyState emoji="🕊️" title="No past events" body="Once you've attended events, they'll appear here." />
          ) : (
            past.map((e) => (
              <EventCard key={e.id} event={e} tone="deep" onPress={() => goEvent(e.id)} trailing={<RateAction />} />
            ))
          ))}
      </ScrollView>
    </Screen>
  )
}

function nextUpLabel(event: CommunityEvent, now: number): string {
  const d = daysUntil(event.startsAt.toDate(), new Date(now))
  if (d <= 0) return 'today'
  if (d === 1) return 'tomorrow'
  return `in ${d} days`
}

function GoingBadge() {
  return (
    <View style={styles.goingBadge}>
      <Meta role="eyebrow" tone="sage">Going</Meta>
    </View>
  )
}

function RateAction() {
  return (
    <TouchableOpacity style={styles.rateBtn}>
      <Meta role="eyebrow" tone="clay">Rate ★</Meta>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  title: { paddingHorizontal: space.xl, paddingTop: space.md, marginBottom: space.lg },
  tabRow: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xl, marginBottom: space.sm },
  tabPill: {
    borderRadius: radius.chip,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  tabPillActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  bannerWrap: { paddingHorizontal: space.xl, paddingTop: space.sm },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: NAV_CLEARANCE },

  nextLabel: { marginBottom: space.sm },
  nextFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatBtn: { backgroundColor: palette.ink, borderRadius: radius.pill, paddingHorizontal: space.lg + 2, paddingVertical: space.sm + 1 },
  onInk: { color: palette.cream },

  sectionLabel: { marginBottom: space.md, marginTop: space.xl },
  goingBadge: { borderWidth: 1, borderColor: palette.rule, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 1 },
  rateBtn: { borderWidth: 1, borderColor: palette.rule, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 1 },
})
