import React, { useState } from 'react'
import { View, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { createEvent, newEventRef } from '../../services/events'
import { pickMedia, uploadMedia, deleteMedia, MediaLimitError } from '../../services/media'
import { limitMessage } from '../../utils/media'
import { MediaSlotPicker } from '../../components/MediaSlotPicker'
import { validateEventForm, EventFormErrors } from '../../utils/eventValidation'
import { formatEventDate } from '../../utils/eventHelpers'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { AgeRequirement, EventCategory, MediaAsset } from '../../types/models'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

function defaultStart(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(19, 0, 0, 0)
  return d
}

export default function CreateEvent() {
  const router = useRouter()
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<EventCategory | ''>('')
  const [startsAt, setStartsAt] = useState<Date>(defaultStart)
  const [capacity, setCapacity] = useState('')
  const [ageRequirement, setAgeRequirement] = useState<AgeRequirement>('18+')
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null)
  const [errors, setErrors] = useState<EventFormErrors>({})
  const [banner, setBanner] = useState('')
  const [saving, setSaving] = useState(false)
  // Minted up front: the cover's storage path contains the event id, so the upload
  // has to target a ref that exists before the event document is written.
  const [eventRef] = useState(() => newEventRef())
  const [cover, setCover] = useState<MediaAsset | null>(null)
  const [coverProgress, setCoverProgress] = useState<number | null>(null)

  if (loading || venueLoading) return <LoadingView tone="cream" />
  if (role !== 'hoster' || !venue) return <Redirect href="/(app)" />

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    const mode = pickerMode
    setPickerMode(null)
    if (!selected || !mode) return
    setStartsAt((prev) => {
      const next = new Date(prev)
      if (mode === 'date') next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
      else next.setHours(selected.getHours(), selected.getMinutes(), 0, 0)
      return next
    })
  }

  const handlePickCover = async () => {
    const picked = await pickMedia({ allowVideo: true, aspect: [16, 9] })
    if (!picked || !user) return
    setCoverProgress(0)
    try {
      const asset = await uploadMedia(
        { kind: 'eventCover', hosterUid: user.uid, eventId: eventRef.id },
        picked,
        setCoverProgress
      )
      setCover(asset)
    } catch (e: unknown) {
      setBanner(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that cover. You can publish without one.")
    } finally {
      setCoverProgress(null)
    }
  }

  const handleRemoveCover = () => {
    const existing = cover
    setCover(null)
    if (existing) void deleteMedia(existing)
  }

  const handleSubmit = async () => {
    const formErrors = validateEventForm({ title, description, category, startsAt, capacity })
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }
    setErrors({})
    setBanner('')
    setSaving(true)
    try {
      await createEvent(eventRef, user!.uid, venue, {
        title,
        description,
        category: category as EventCategory,
        startsAt,
        capacity: Number(capacity),
        ageRequirement,
      }, cover ?? undefined)
      router.back()
    } catch {
      setBanner("Couldn't create the event. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.back}>
          <BackButton label="Cancel" />
        </View>
        <Display role="screenTitle" style={styles.title}>Create an event</Display>
        {banner ? <Banner message={banner} /> : null}

        <Meta role="eyebrow" style={styles.label}>Cover</Meta>
        <MediaSlotPicker
          style={styles.cover}
          media={cover}
          progress={coverProgress}
          label="Add a photo or clip"
          onPick={handlePickCover}
          onRemove={handleRemoveCover}
        />

        <FormInput label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ceramics Night" />
        <FormInput label="Description" value={description} onChangeText={setDescription} error={errors.description} placeholder="What to expect, what to bring" />

        <Meta role="eyebrow" style={styles.label}>Category</Meta>
        {/* Stacked rows rather than chips: the blurb is the point. Touch Grass and
            Slow Down are not self-describing, and miscategorisation happens here. */}
        <View style={styles.categoryList}>
          {EVENT_CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCategory(c.id)}
              style={[styles.categoryRow, category === c.id && styles.chipActive]}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: category === c.id }}
            >
              <Meta style={styles.categoryEmoji}>{c.emoji}</Meta>
              <View style={styles.categoryText}>
                <Display>{c.label}</Display>
                <Body role="bodySm">{c.blurb}</Body>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category ? <Body role="bodySm" tone="clay" style={styles.errorText}>{errors.category}</Body> : null}

        <Meta role="eyebrow" style={styles.label}>Date & time</Meta>
        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => setPickerMode('date')} style={styles.dateButton}>
            <Body role="bodyLg" tone="ink">{formatEventDate(startsAt).split(' · ')[0]}</Body>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPickerMode('time')} style={styles.dateButton}>
            <Body role="bodyLg" tone="ink">{formatEventDate(startsAt).split(' · ')[1]}</Body>
          </TouchableOpacity>
        </View>
        {errors.startsAt ? <Body role="bodySm" tone="clay" style={styles.errorText}>{errors.startsAt}</Body> : null}
        {pickerMode ? (
          <DateTimePicker
            value={startsAt}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
          />
        ) : null}

        <FormInput label="Capacity" value={capacity} onChangeText={setCapacity} error={errors.capacity} keyboardType="number-pad" placeholder="12" />

        <Meta role="eyebrow" style={styles.label}>Age requirement</Meta>
        <View style={styles.chipRow}>
          {(['18+', '21+'] as AgeRequirement[]).map((a) => (
            <TouchableOpacity key={a} onPress={() => setAgeRequirement(a)} style={[styles.chip, ageRequirement === a && styles.chipActive]}>
              <Meta role="eyebrow" tone={ageRequirement === a ? 'clay' : 'inkSoft'}>{a}</Meta>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.submit}>
          <AuthButton label="Publish event" onPress={handleSubmit} variant="primary" loading={saving} />
        </View>
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: space.xl },
  content: { paddingTop: space.xl, paddingBottom: space.xxl + space.sm },
  back: { marginBottom: space.xl },
  title: { marginBottom: space.xl },
  label: { marginBottom: space.sm },
  cover: { width: '100%', aspectRatio: 16 / 9, marginBottom: space.xl },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg },
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
  },
  chipActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  categoryList: { marginBottom: space.lg },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket,
    padding: space.md,
    marginBottom: space.sm,
  },
  categoryEmoji: { fontSize: 20, lineHeight: 24 },
  categoryText: { flex: 1, gap: space.xs },
  dateRow: { flexDirection: 'row', gap: space.md, marginBottom: space.lg },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.ticket - 2,
    padding: space.md + 2,
    alignItems: 'center',
    backgroundColor: palette.orangeLight,
  },
  errorText: { marginBottom: space.sm },
  submit: { marginTop: space.sm },
})
