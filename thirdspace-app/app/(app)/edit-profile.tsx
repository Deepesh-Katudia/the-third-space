import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
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
import { Borough, MediaAsset, SocialHandles, SocialPlatform } from '../../types/models'
import { MediaSlotPicker } from '../../components/MediaSlotPicker'
import { SOCIAL_PLATFORMS, normalizeHandle, isValidHandle, shouldSeedSocials } from '../../utils/socials'
import { useSocials } from '../../hooks/useSocials'
import { updateProfile, setSocials } from '../../services/profiles'
import { pickMedia, uploadMedia, deleteMedia, MediaLimitError, type PickedMedia } from '../../services/media'
import { coerceLegacyVibe, limitMessage } from '../../utils/media'
import { ContentRejectedError, contentRejectedMessage } from '../../utils/contentFilter'
import { avatarColor, initials } from '../../utils/avatar'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space, type as typeScale } from '../../constants/design'

const BIO_LIMIT = 300
const MIN_INTERESTS = 3
const VIBE_SLOTS = [0, 1, 2] as const
const INTEREST_OPTIONS =['Art', 'Coffee', 'Film', 'Music', 'Hiking', 'Reading', 'Fitness', 'Food', 'Photography', 'Nightlife', 'Wellness', 'Gaming', 'Fashion', 'Travel', 'Vinyl', 'Cooking']

export default function EditProfile() {
  const router = useRouter()
  const { user } = useAuth()
  const { profile, loading, hasError } = useProfile(user?.uid)
  const { handles: loadedSocials, loading: socialsLoading, visible: socialsVisible } = useSocials(user?.uid)

  const [seeded, setSeeded] = useState(false)
  const [pickedAvatar, setPickedAvatar] = useState<PickedMedia | null>(null)
  const [vibes, setVibes] = useState<(MediaAsset | null)[]>([null, null, null])
  const [vibeProgress, setVibeProgress] = useState<(number | null)[]>([null, null, null])
  const [bio, setBio] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [neighborhood, setNeighborhood] = useState('')
  const [borough, setBorough] = useState<Borough>('Brooklyn')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Raw text, normalized only on validate/save — normalizing per keystroke would
  // fight anyone mid-way through pasting a URL.
  const [socialInputs, setSocialInputs] = useState<Record<SocialPlatform, string>>({ instagram: '', tiktok: '', x: '' })
  const [socialsSeeded, setSocialsSeeded] = useState(false)

  // Seed the form once from the loaded profile; later realtime updates must not
  // clobber in-progress edits.
  useEffect(() => {
    if (seeded || !profile) return
    // Coerce on the way in: the field was typed string[] before it was ever written.
    const loadedVibes = coerceLegacyVibe(profile.vibePhotos)
    setVibes([loadedVibes[0] ?? null, loadedVibes[1] ?? null, loadedVibes[2] ?? null])
    setBio(profile.bio)
    setInterests(profile.interests)
    setNeighborhood(profile.neighborhood)
    setBorough(profile.borough)
    setSeeded(true)
  }, [profile, seeded])

  // Socials load on their own subscription, so they need their own seed guard — and
  // it must key off a read that SUCCEEDED, not merely one that stopped loading.
  useEffect(() => {
    if (!shouldSeedSocials({
      hasUid: Boolean(user?.uid),
      loading: socialsLoading,
      visible: socialsVisible,
      seeded: socialsSeeded,
    })) return
    setSocialInputs({
      instagram: loadedSocials.instagram ?? '',
      tiktok: loadedSocials.tiktok ?? '',
      x: loadedSocials.x ?? '',
    })
    setSocialsSeeded(true)
  }, [loadedSocials, socialsLoading, socialsVisible, socialsSeeded, user?.uid])

  const name = profile?.displayName ?? user?.displayName ?? 'Member'

  const toggleInterest = (label: string) =>
    setInterests((prev) => (prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]))

  const socialErrors = useMemo(() => {
    const out: Partial<Record<SocialPlatform, string>> = {}
    for (const p of SOCIAL_PLATFORMS) {
      const raw = socialInputs[p.id]
      if (!raw.trim()) continue
      if (!isValidHandle(p.id, normalizeHandle(raw))) out[p.id] = `That doesn't look like a ${p.label} handle.`
    }
    return out
  }, [socialInputs])

  const cleanedSocials = useMemo(() => {
    const out: SocialHandles = {}
    for (const p of SOCIAL_PLATFORMS) {
      const handle = normalizeHandle(socialInputs[p.id])
      if (handle) out[p.id] = handle
    }
    return out
  }, [socialInputs])

  // setSocials is a full overwrite, so writing from a form that never loaded the
  // stored handles would erase them. Writing when nothing changed is also a needless
  // failure surface on every profile save.
  const socialsChanged = useMemo(
    () => SOCIAL_PLATFORMS.some((p) => (loadedSocials[p.id] ?? '') !== (cleanedSocials[p.id] ?? '')),
    [loadedSocials, cleanedSocials]
  )

  const canSubmit =
    interests.length >= MIN_INTERESTS &&
    neighborhood.trim().length > 0 &&
    Object.keys(socialErrors).length === 0

  const handlePickPhoto = async () => {
    const picked = await pickMedia({ allowVideo: false, aspect: [1, 1] })
    if (picked) setPickedAvatar(picked)
  }

  const setAt = <T,>(list: T[], index: number, value: T): T[] =>
    list.map((entry, i) => (i === index ? value : entry))

  const handlePickVibe = async (index: number) => {
    const picked = await pickMedia({ allowVideo: true })
    if (!picked || !user) return
    setVibeProgress((p) => setAt(p, index, 0))
    try {
      const asset = await uploadMedia(
        { kind: 'vibe', uid: user.uid, index },
        picked,
        (fraction) => setVibeProgress((p) => setAt(p, index, fraction))
      )
      setVibes((v) => setAt(v, index, asset))
    } catch (e: unknown) {
      setError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that. Check your connection and try again.")
    } finally {
      setVibeProgress((p) => setAt(p, index, null))
    }
  }

  const handleRemoveVibe = (index: number) => {
    const existing = vibes[index]
    setVibes((v) => setAt(v, index, null))
    // Fire-and-forget: deleteMedia never throws, and the slot is already empty in the
    // UI. The write on save is what actually detaches it from the profile.
    if (existing) void deleteMedia(existing)
  }

  const handleSave = async () => {
    if (!user || !canSubmit || busy) return
    setBusy(true)
    setError('')
    try {
      let photoURL = profile?.photoURL ?? null
      if (pickedAvatar) {
        try {
          const asset = await uploadMedia({ kind: 'avatar', uid: user.uid }, pickedAvatar)
          photoURL = asset.url
        } catch (e: unknown) {
          setError(e instanceof MediaLimitError
            ? limitMessage(e.result, pickedAvatar.type)
            : "Couldn't upload your photo. Your other changes were saved.")
        }
      }
      await updateProfile(user.uid, {
        bio: bio.trim(),
        interests,
        neighborhood: neighborhood.trim(),
        borough,
        photoURL,
        vibePhotos: vibes.filter((v): v is MediaAsset => v !== null),
      })
      if (socialsSeeded && socialsChanged) {
        await setSocials(user.uid, cleanedSocials)
      }
      router.back()
    } catch (e: unknown) {
      setError(
        e instanceof ContentRejectedError
          ? contentRejectedMessage(e.field)
          : "Couldn't save changes. Try again."
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <LoadingView tone="cream" />

  if (hasError || !profile) {
    return (
      <Screen tone="cream">
        <StatusBar style="dark" />
        <EmptyState emoji="🫥" title="Profile unavailable" body="We couldn't load your profile. Try again." />
        <View style={styles.backCenter}>
          <BackButton label="Go back" />
        </View>
      </Screen>
    )
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Edit profile</Display>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.photoWrap}>
            <TouchableOpacity style={styles.photoSlot} onPress={handlePickPhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
              {pickedAvatar?.uri ?? profile?.photoURL ? (
                <Image source={{ uri: pickedAvatar?.uri ?? profile?.photoURL ?? undefined }} style={styles.photoImg} />
              ) : (
                <View style={[styles.photoFallback, { backgroundColor: avatarColor(name) }]}>
                  <Text style={styles.photoInitials}>{initials(name)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <Body role="bodySm">Change photo</Body>
          </View>

          <Meta role="eyebrow" style={styles.fieldLabel}>Bio</Meta>
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

          <Meta role="eyebrow" style={styles.fieldLabel}>Socials — only your connections can see these</Meta>
          {socialsLoading ? (
            <Body role="bodySm" style={styles.socialsNotice}>Loading your handles…</Body>
          ) : !socialsSeeded ? (
            // Rendering editable fields here would let someone type a handle that the
            // save path then silently drops — setSocials is skipped when the form never
            // loaded the stored set, because it is a full overwrite.
            <Body role="bodySm" tone="clay" style={styles.socialsNotice}>
              We couldn&apos;t load your handles, so they can&apos;t be edited right now. Your saved handles are unchanged.
            </Body>
          ) : (
            SOCIAL_PLATFORMS.map((p) => (
              <FormInput
                key={p.id}
                label={p.label}
                prefix="@"
                value={socialInputs[p.id]}
                onChangeText={(t) => setSocialInputs((prev) => ({ ...prev, [p.id]: t }))}
                error={socialErrors[p.id]}
                placeholder="yourhandle"
                autoCapitalize="none"
                autoCorrect={false}
              />
            ))
          )}

          <Meta role="eyebrow" style={styles.fieldLabel}>Vibe</Meta>
          <Body role="bodySm" style={styles.vibeHint}>Up to three photos or clips. Clips can be 60 seconds.</Body>
          <View style={styles.vibeGrid}>
            {VIBE_SLOTS.map((index) => (
              <MediaSlotPicker
                key={index}
                style={styles.vibeSlot}
                media={vibes[index]}
                progress={vibeProgress[index]}
                label={index === 0 ? 'Add' : undefined}
                onPick={() => handlePickVibe(index)}
                onRemove={() => handleRemoveVibe(index)}
              />
            ))}
          </View>

          <Meta role="eyebrow" style={styles.fieldLabel}>Pick at least {MIN_INTERESTS} interests</Meta>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((label) => (
              <InterestChip key={label} label={label} selected={interests.includes(label)} onPress={() => toggleInterest(label)} />
            ))}
          </View>

          {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

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
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  headerSpacer: { width: 24 },
  backCenter: { alignItems: 'center', paddingBottom: space.xxl + space.sm },
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.lg, paddingBottom: space.xxl + space.sm },
  photoWrap: { alignItems: 'center', marginBottom: space.xxl - space.xs },
  photoSlot: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', marginBottom: space.sm },
  photoImg: { width: 96, height: 96 },
  photoFallback: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
  // Avatar tints stay outside the two-tone palette — they encode identity.
  photoInitials: { ...typeScale.button, fontSize: 32, lineHeight: 38, color: palette.cream },
  fieldLabel: { marginBottom: space.sm + 2, marginTop: space.sm },
  socialsNotice: { marginBottom: space.lg },
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
  vibeHint: { marginBottom: space.sm },
  vibeGrid: { flexDirection: 'row', gap: space.sm, marginBottom: space.xl },
  // 4:5 slots, three across.
  vibeSlot: { flex: 1, aspectRatio: 4 / 5 },
  error: { marginBottom: space.md },
  submitWrap: { marginTop: space.md },
})
