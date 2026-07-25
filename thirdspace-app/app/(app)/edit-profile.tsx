import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { AuthButton } from '../../components/AuthButton'
import { FormInput } from '../../components/FormInput'
import { InterestChip } from '../../components/InterestChip'
import { LoadingView } from '../../components/LoadingView'
import { EmptyState } from '../../components/EmptyState'
import { BOROUGHS } from '../../constants/categories'
import { Borough } from '../../types/models'
import { updateProfile } from '../../services/profiles'
import { pickImage, uploadProfilePhoto } from '../../services/photos'
import { avatarColor, initials } from '../../utils/avatar'

const BIO_LIMIT = 300
const MIN_INTERESTS = 3
const INTEREST_OPTIONS = ['Art', 'Coffee', 'Film', 'Music', 'Hiking', 'Reading', 'Fitness', 'Food', 'Photography', 'Nightlife', 'Wellness', 'Gaming', 'Fashion', 'Travel', 'Vinyl', 'Cooking']

export default function EditProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading, hasError } = useProfile(user?.uid)

  const [seeded, setSeeded] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [newPhotoPicked, setNewPhotoPicked] = useState(false)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [borough, setBorough] = useState<Borough>('Brooklyn')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Seed the form once from the loaded profile; later realtime updates must not
  // clobber in-progress edits.
  useEffect(() => {
    if (seeded || !profile) return
    setPhotoUri(profile.photoURL)
    setBio(profile.bio)
    setInterests(profile.interests)
    setNeighborhood(profile.neighborhood)
    setBorough(profile.borough)
    setSeeded(true)
  }, [profile, seeded])

  const name = profile?.displayName ?? user?.displayName ?? 'Member'
  const canSubmit = interests.length >= MIN_INTERESTS && neighborhood.trim().length > 0

  const toggleInterest = (label: string) =>
    setInterests((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]))

  const handlePickPhoto = async () => {
    try {
      const uri = await pickImage('avatar')
      if (uri) {
        setPhotoUri(uri)
        setNewPhotoPicked(true)
      }
    } catch {
      // user cancelled or denied permission — ignore
    }
  }

  const handleSave = async () => {
    if (!user || !canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      let photoURL = profile?.photoURL ?? null
      if (newPhotoPicked && photoUri) {
        try { photoURL = await uploadProfilePhoto(user.uid, 'avatar', photoUri) } catch { /* keep existing */ }
      }
      await updateProfile(user.uid, {
        bio: bio.trim(),
        interests,
        neighborhood: neighborhood.trim(),
        borough,
        photoURL,
      })
      router.back()
    } catch {
      setError("Couldn't save changes. Try again.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingView />

  if (hasError || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <EmptyState emoji="🫥" title="Profile unavailable" body="We couldn't load your profile. Try again." />
        <TouchableOpacity onPress={() => router.back()} style={styles.backCenter}>
          <Text style={styles.backCenterText}>← Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.photoWrap}>
            <TouchableOpacity style={styles.photoSlot} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} />
              ) : (
                <View style={[styles.photoFallback, { backgroundColor: avatarColor(name) }]}>
                  <Text style={styles.photoInitials}>{initials(name)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Change photo</Text>
          </View>

          <Text style={styles.fieldLabel}>Bio</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Illustrator, new to Brooklyn, always up for good coffee…"
            placeholderTextColor="#6B6F78"
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_LIMIT))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{bio.length}/{BIO_LIMIT}</Text>

          <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} placeholder="Williamsburg" />

          <Text style={styles.fieldLabel}>Borough</Text>
          <View style={styles.chipWrap}>
            {BOROUGHS.map((b) => (
              <InterestChip key={b} label={b} selected={borough === b} onPress={() => setBorough(b)} />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Text>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((label) => (
              <InterestChip key={label} label={label} selected={interests.includes(label)} onPress={() => toggleInterest(label)} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.submitWrap}>
            <AuthButton
              label="Save changes"
              onPress={handleSave}
              variant="primary"
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F3F5' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  back: { fontSize: 24, color: '#15161A' },
  headerTitle: { fontFamily: 'Poppins_800ExtraBold', fontSize: 22, color: '#15161A', letterSpacing: -0.5 },
  headerSpacer: { width: 24 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },
  backCenterText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 16, paddingBottom: 40 },
  photoWrap: { alignItems: 'center', marginBottom: 28 },
  photoSlot: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', marginBottom: 8 },
  photoImg: { width: 96, height: 96 },
  photoFallback: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontFamily: 'Poppins_600SemiBold', fontSize: 32, color: 'white' },
  photoHint: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  fieldLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#15161A', marginBottom: 10, marginTop: 8 },
  bioInput: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)', borderRadius: 14, padding: 16, minHeight: 96, fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#15161A', lineHeight: 21 },
  counter: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#6B6F78', alignSelf: 'flex-end', marginTop: 6, marginBottom: 16 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30', marginBottom: 12 },
  submitWrap: { marginTop: 12 },
})
