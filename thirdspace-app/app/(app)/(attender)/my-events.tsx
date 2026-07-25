import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import { getMyRegisteredEvents } from '../../../services/events'
import { CompactEventRow } from '../../../components/CompactEventRow'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { EmptyState } from '../../../components/EmptyState'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { CommunityEvent } from '../../../types/models'
import { formatDayDate, formatTime, daysUntil } from '../../../utils/eventHelpers'
import { NAV_CLEARANCE } from '../../../constants/theme'

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <Text style={styles.title}>My events</Text>

      <View style={styles.tabRow}>
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tabPill, active && styles.tabPillActive]}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {t.label}
                {t.count !== null ? ` · ${t.count}` : ''}
              </Text>
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
              <TouchableOpacity activeOpacity={0.92} onPress={() => goEvent(next.id)}>
                <LinearGradient colors={['#15161A', '#0E0E10']} style={styles.nextCard}>
                  <Text style={styles.nextLabel}>NEXT UP · {nextUpLabel(next, now)}</Text>
                  <Text style={styles.nextTitle}>{next.title}</Text>
                  <Text style={styles.nextMeta}>{formatDayDate(next.startsAt.toDate())} · {formatTime(next.startsAt.toDate())}</Text>
                  <Text style={styles.nextMeta}>{next.venueName} · {next.neighborhood}</Text>
                  <View style={styles.nextFooter}>
                    <AttendeeAvatarStack
                      uids={Array.from({ length: Math.min(next.registeredCount, 4) }, (_, i) => `${next.id}:${i}`)}
                      count={next.registeredCount}
                      size={28}
                      ringColor="#15161A"
                    />
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: next.id } })}
                    >
                      <Text style={styles.chatBtnText}>Open chat</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {restUpcoming.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>Also coming up</Text>
                  {restUpcoming.map((e) => (
                    <CompactEventRow key={e.id} event={e} onPress={() => goEvent(e.id)} trailing={<GoingBadge />} />
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
              <CompactEventRow key={e.id} event={e} onPress={() => goEvent(e.id)} trailing={<RateAction />} />
            ))
          ))}
      </ScrollView>
    </SafeAreaView>
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
      <Text style={styles.goingBadgeText}>Going</Text>
    </View>
  )
}

function RateAction() {
  return (
    <TouchableOpacity style={styles.rateBtn}>
      <Text style={styles.rateText}>Rate ★</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: '#15161A', letterSpacing: -0.5, paddingHorizontal: 24, paddingTop: 12, marginBottom: 16 },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 8 },
  tabPill: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)' },
  tabPillActive: { backgroundColor: '#15161A', borderColor: '#15161A' },
  tabText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#3A3A3A' },
  tabTextActive: { color: 'white' },
  bannerWrap: { paddingHorizontal: 24, paddingTop: 8 },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: NAV_CLEARANCE },

  nextCard: { borderRadius: 20, padding: 20, marginBottom: 8 },
  nextLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, color: '#E2E0DA', letterSpacing: 0.8, marginBottom: 10 },
  nextTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 24, color: '#F3F3F5', marginBottom: 8, letterSpacing: -0.5 },
  nextMeta: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(251,247,242,0.75)', marginBottom: 2 },
  nextFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  chatBtn: { backgroundColor: '#FF9F3D', borderRadius: 100, paddingHorizontal: 18, paddingVertical: 9 },
  chatBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#15161A' },

  sectionLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#6B6F78', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, marginTop: 20 },
  goingBadge: { backgroundColor: 'rgba(47,163,101,0.18)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  goingBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#25804E' },
  rateBtn: { borderWidth: 1, borderColor: 'rgba(226,224,218,0.8)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 5 },
  rateText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#FF9F3D' },
})
