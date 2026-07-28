import React, { useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { saveVenue } from '../../services/venues'
import { VenueForm } from '../../components/VenueForm'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { Venue } from '../../types/models'
import { Screen } from '../../components/ui/Screen'
import { Display, Body } from '../../components/ui/Text'
import { space } from '../../constants/design'

export default function VenueSetup() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)
  const [error, setError] = useState('')

  if (loading || venueLoading) return <LoadingView tone="cream" />
  if (role !== 'hoster') return <Redirect href="/(app)" />
  if (venue) return <Redirect href="/(app)/(hoster)" />

  const handleSubmit = async (data: Venue) => {
    setError('')
    try {
      await saveVenue(user!.uid, data)
      // useVenue's snapshot fires -> the venue check above redirects automatically.
    } catch {
      setError("Couldn't save your venue. Check your connection and try again.")
    }
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Display role="screenTitle" style={styles.title}>Set up your venue</Display>
        <Body role="bodyLg" style={styles.subtitle}>This is how your events appear to the community.</Body>
        {error ? <Banner message={error} /> : null}
        <VenueForm submitLabel="Save and continue" onSubmit={handleSubmit} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xxl + space.sm, paddingBottom: space.xxl + space.sm },
  title: { marginBottom: space.sm },
  subtitle: { marginBottom: space.xl },
})
