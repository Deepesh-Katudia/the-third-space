import React, { useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
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
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { palette, radius, space, type as typeScale } from '../../constants/design'

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
    <Screen tone="cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Display role="screenTitle" style={styles.title}>Make yourself real.</Display>
          <Body role="bodyLg" style={styles.subtitle}>A photo and a few interests help people recognize you at events.</Body>

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
            <Body role="bodySm">Add a photo</Body>
          </View>

          <Meta role="eyebrow" style={styles.fieldLabel}>Short bio</Meta>
          <TextInput
            style={styles.bioInput}
            placeholder="Illustrator, new to Brooklyn, always up for good coffee…"
            placeholderTextColor={palette.inkSoft}
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_LIMIT))}
            multiline
            textAlignVertical="top"
          />
          <Meta style={styles.counter}>{bio.length}/{BIO_LIMIT}</Meta>

          <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} placeholder="Williamsburg" />

          <Meta role="eyebrow" style={styles.fieldLabel}>Borough</Meta>
          <View style={styles.chipWrap}>
            {BOROUGHS.map((b) => (
              <InterestChip key={b} label={b} selected={borough === b} onPress={() => setBorough(b)} />
            ))}
          </View>

          <Meta role="eyebrow" style={styles.fieldLabel}>Date of birth</Meta>
          <TouchableOpacity style={styles.dobBtn} onPress={() => setShowPicker(true)}>
            <Body role="bodyLg" tone="ink">{dob.toLocaleDateString()} · age {age}</Body>
          </TouchableOpacity>
          {age < MIN_AGE ? <Body role="bodySm" tone="clay" style={styles.ageError}>You must be at least {MIN_AGE}.</Body> : null}
          {showPicker ? (
            <DateTimePicker
              value={dob}
              mode="date"
              maximumDate={new Date()}
              onChange={(_e, d) => { setShowPicker(Platform.OS === 'ios'); if (d) setDob(d) }}
            />
          ) : null}

          <Meta role="eyebrow" style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Meta>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((label) => (
              <InterestChip key={label} label={label} selected={interests.includes(label)} onPress={() => toggleInterest(label)} />
            ))}
          </View>

          {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

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
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xxl, paddingBottom: space.xxl + space.sm },
  title: { marginBottom: space.sm },
  subtitle: { marginBottom: space.xxl - space.xs },
  photoWrap: { alignItems: 'center', marginBottom: space.xxl - space.xs },
  photoSlot: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', marginBottom: space.sm },
  photoImg: { width: 96, height: 96 },
  photoFallback: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  photoInitials: { ...typeScale.button, fontSize: 32, lineHeight: 38, color: palette.cream },
  fieldLabel: { marginBottom: space.sm + 2, marginTop: space.sm },
  bioInput: {
    ...typeScale.bodyLg,
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    padding: space.lg,
    minHeight: 96,
    color: palette.ink,
  },
  counter: { alignSelf: 'flex-end', marginTop: space.xs + 2, marginBottom: space.lg },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl - 4 },
  dobBtn: {
    backgroundColor: palette.orangeLight,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    marginBottom: space.sm,
  },
  ageError: { marginBottom: space.md },
  error: { marginBottom: space.md },
  submitWrap: { marginTop: space.md },
})
