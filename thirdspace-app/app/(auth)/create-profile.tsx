import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../hooks/useAuth'
import { AuthButton } from '../../components/AuthButton'
import { FormInput } from '../../components/FormInput'
import { InterestChip } from '../../components/InterestChip'
import { BOROUGHS } from '../../constants/categories'
import { Borough } from '../../types/models'
import { createProfile } from '../../services/profiles'
import { pickImage, uploadProfilePhoto } from '../../services/photos'
import { ageFromDOB } from '../../utils/profile'
import { avatarColor, initials } from '../../utils/avatar'

const BIO_LIMIT = 300
const MIN_INTERESTS = 3
const MIN_AGE = 18
const INTEREST_OPTIONS = ['Art', 'Coffee', 'Film', 'Music', 'Hiking', 'Reading', 'Fitness', 'Food', 'Photography', 'Nightlife', 'Wellness', 'Gaming', 'Fashion', 'Travel', 'Vinyl', 'Cooking']

export default function CreateProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const name = user?.displayName ?? 'Member'

  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [borough, setBorough] = useState<Borough>('Brooklyn')
  const [dob, setDob] = useState<Date>(new Date(2000, 0, 1))
  const [showPicker, setShowPicker] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const age = ageFromDOB(dob)
  const canSubmit = interests.length >= MIN_INTERESTS && neighborhood.trim().length > 0 && age >= MIN_AGE

  const toggleInterest = (label: string) =>
    setInterests((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]))

  const handlePickPhoto = async () => {
    try {
      const uri = await pickImage('avatar')
      if (uri) setPhotoUri(uri)
    } catch {
      // user cancelled or denied permission — ignore
    }
  }

  const handleSubmit = async () => {
    if (!user || !canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      let photoURL: string | null = null
      if (photoUri) {
        try { photoURL = await uploadProfilePhoto(user.uid, 'avatar', photoUri) } catch { photoURL = null }
      }
      await createProfile(
        user.uid,
        { displayName: name, photoURL, vibePhotos: [], bio: bio.trim(), interests, neighborhood: neighborhood.trim(), borough, age },
        dob
      )
      ;(router.replace as (href: string) => void)('/(app)/verify-identity')
    } catch {
      setError("Couldn't save your profile. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Make yourself real.</Text>
          <Text style={styles.subtitle}>A photo and a few interests help people recognize you at events.</Text>

          <View style={styles.photoWrap}>
            <TouchableOpacity style={styles.photoSlot} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel="Pick a profile photo">
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImg} />
              ) : (
                <View style={[styles.photoFallback, { backgroundColor: avatarColor(name) }]}>
                  <Text style={styles.photoInitials}>{initials(name)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.photoHint}>Add a photo</Text>
          </View>

          <Text style={styles.fieldLabel}>Short bio</Text>
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

          <Text style={styles.fieldLabel}>Date of birth</Text>
          <TouchableOpacity style={styles.dobBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.dobText}>{dob.toLocaleDateString()} · age {age}</Text>
          </TouchableOpacity>
          {age < MIN_AGE ? <Text style={styles.ageError}>You must be at least {MIN_AGE}.</Text> : null}
          {showPicker ? (
            <DateTimePicker
              value={dob}
              mode="date"
              maximumDate={new Date()}
              onChange={(_e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDob(d) }}
            />
          ) : null}

          <Text style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Text>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((label) => (
              <InterestChip key={label} label={label} selected={interests.includes(label)} onPress={() => toggleInterest(label)} />
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.submitWrap}>
            <AuthButton
              label={canSubmit ? 'Enter Your Third Space' : `Complete your profile`}
              onPress={handleSubmit}
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
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 32, paddingBottom: 40 },
  title: { fontFamily: 'Poppins_800ExtraBold', fontSize: 32, color: '#15161A', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 16, color: '#6B6F78', lineHeight: 22, marginBottom: 28 },
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
  dobBtn: { backgroundColor: 'white', borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  dobText: { fontFamily: 'Poppins_500Medium', fontSize: 15, color: '#15161A' },
  ageError: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginBottom: 12 },
  error: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#FF3B30', marginBottom: 12 },
  submitWrap: { marginTop: 12 },
})
