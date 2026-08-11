import React, { useState } from 'react'
import { ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useRouter } from 'expo-router'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { saveVenue } from '../../../services/venues'
import { VenueForm } from '../../../components/VenueForm'
import { Banner } from '../../../components/Banner'
import { LoadingView } from '../../../components/LoadingView'
import { Venue } from '../../../types/models'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { palette, radius, space, NAV_CLEARANCE } from '../../../constants/design'

export default function VenueTab() {
  const router = useRouter()
  const { user } = useAuth()
  const { venue, loading } = useVenue(user?.uid)
  const [banner, setBanner] = useState<{ message: string; tone: 'error' | 'success' } | null>(null)

  if (loading || !venue) return <LoadingView />

  const handleSubmit = async (data: Venue) => {
    setBanner(null)
    try {
      await saveVenue(user!.uid, data)
      setBanner({ message: 'Venue updated.', tone: 'success' })
    } catch {
      setBanner({ message: "Couldn't save changes. Try again.", tone: 'error' })
    }
  }

  return (
    <Screen tone="deep">
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Display role="screenTitle" style={styles.title}>Your venue</Display>
        <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/(app)/settings')}>
          <Body role="bodyLg" tone="ink">Settings</Body>
          <Meta style={styles.chevron}>›</Meta>
        </TouchableOpacity>
        {banner ? <Banner message={banner.message} tone={banner.tone} /> : null}
        <VenueForm venueUid={user!.uid} initial={venue} submitLabel="Save changes" onSubmit={handleSubmit} />
        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
          <Meta role="eyebrow" tone="clay">Sign out</Meta>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xxl + space.sm, paddingBottom: NAV_CLEARANCE },
  title: { marginBottom: space.xl },
  signOutButton: {
    marginTop: space.xl,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: palette.clay,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    borderWidth: 1,
    borderColor: palette.rule,
    marginBottom: space.md,
  },
  chevron: { fontSize: 20 },
})
