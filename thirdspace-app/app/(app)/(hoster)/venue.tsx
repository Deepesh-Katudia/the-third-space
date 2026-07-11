import React, { useState } from 'react'
import { Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Your venue</Text>
        <TouchableOpacity style={styles.settingsRow} onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.settingsText}>Settings</Text>
          <Text style={styles.settingsChevron}>›</Text>
        </TouchableOpacity>
        {banner ? <Banner message={banner.message} tone={banner.tone} /> : null}
        <VenueForm initial={venue} submitLabel="Save changes" onSubmit={handleSubmit} />
        <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 24, letterSpacing: -0.5 },
  signOutButton: { marginTop: 24, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },

  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'white', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)', marginBottom: 12 },
  settingsText: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  settingsChevron: { fontFamily: 'DMSans_400Regular', fontSize: 20, color: '#8C7B70' },
})
