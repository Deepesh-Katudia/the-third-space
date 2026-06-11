import React, { useState } from 'react'
import { Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { saveVenue } from '../../services/venues'
import { VenueForm } from '../../components/VenueForm'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { Venue } from '../../types/models'

export default function VenueSetup() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)
  const [error, setError] = useState('')

  if (loading || venueLoading) return <LoadingView />
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set up your venue</Text>
        <Text style={styles.subtitle}>This is how your events appear to the community.</Text>
        {error ? <Banner message={error} /> : null}
        <VenueForm submitLabel="Save and continue" onSubmit={handleSubmit} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', marginBottom: 24 },
})
