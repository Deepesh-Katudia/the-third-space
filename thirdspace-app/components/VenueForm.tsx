import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { FormInput } from './FormInput'
import { AuthButton } from './AuthButton'
import { Banner } from './Banner'
import { MediaSlotPicker } from './MediaSlotPicker'
import { BOROUGHS } from '../constants/categories'
import { Borough, MediaAsset, Venue } from '../types/models'
import { pickMedia, uploadMedia, deleteMedia, MediaLimitError } from '../services/media'
import { limitMessage } from '../utils/media'
import { palette, radius, space } from '../constants/design'
import { Body, Meta } from './ui/Text'

const VENUE_SLOTS = [0, 1, 2, 3, 4, 5] as const

interface VenueFormErrors {
  name?: string
  borough?: string
  neighborhood?: string
  description?: string
}

interface VenueFormProps {
  /** The hoster's uid — venues are keyed by it, and so are their storage paths. */
  venueUid: string
  initial?: Venue
  submitLabel: string
  onSubmit: (venue: Venue) => Promise<void>
}

export function VenueForm({ venueUid, initial, submitLabel, onSubmit }: VenueFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [borough, setBorough] = useState<Borough | ''>(initial?.borough ?? '')
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<VenueFormErrors>({})
  const [saving, setSaving] = useState(false)
  const [photos, setPhotos] = useState<(MediaAsset | null)[]>(() => {
    const seeded = initial?.photos ?? []
    return VENUE_SLOTS.map((i) => seeded[i] ?? null)
  })
  const [progress, setProgress] = useState<(number | null)[]>(VENUE_SLOTS.map(() => null))
  const [mediaError, setMediaError] = useState('')

  const setAt = <T,>(list: T[], index: number, value: T): T[] =>
    list.map((entry, i) => (i === index ? value : entry))

  const handlePick = async (index: number) => {
    const picked = await pickMedia({ allowVideo: true })
    if (!picked) return
    setMediaError('')
    setProgress((p) => setAt(p, index, 0))
    try {
      const asset = await uploadMedia(
        { kind: 'venue', uid: venueUid, index },
        picked,
        (fraction) => setProgress((p) => setAt(p, index, fraction))
      )
      setPhotos((v) => setAt(v, index, asset))
    } catch (e: unknown) {
      setMediaError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that. Check your connection and try again.")
    } finally {
      setProgress((p) => setAt(p, index, null))
    }
  }

  const handleRemove = (index: number) => {
    const existing = photos[index]
    setPhotos((v) => setAt(v, index, null))
    if (existing) void deleteMedia(existing)
  }

  const handleSubmit = async () => {
    const newErrors: VenueFormErrors = {}
    if (!name.trim()) newErrors.name = 'Venue name is required.'
    if (!borough) newErrors.borough = 'Pick a borough.'
    if (!neighborhood.trim()) newErrors.neighborhood = 'Neighborhood is required.'
    if (!description.trim()) newErrors.description = 'A short description is required.'
    if (Object.keys(newErrors).length > 0 || !borough) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        borough,
        neighborhood: neighborhood.trim(),
        description: description.trim(),
        photos: photos.filter((p): p is MediaAsset => p !== null),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <View>
      <FormInput label="Venue name" value={name} onChangeText={setName} error={errors.name} placeholder="Clay Studio BK" />
      <Meta role="eyebrow" style={styles.label}>Borough</Meta>
      <View style={styles.chipRow}>
        {BOROUGHS.map((b) => (
          <TouchableOpacity
            key={b}
            onPress={() => setBorough(b)}
            style={[styles.chip, borough === b && styles.chipActive]}
          >
            <Meta role="eyebrow" tone={borough === b ? 'clay' : 'inkSoft'}>{b}</Meta>
          </TouchableOpacity>
        ))}
      </View>
      {errors.borough ? <Body role="bodySm" tone="clay" style={styles.errorText}>{errors.borough}</Body> : null}
      <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} error={errors.neighborhood} placeholder="Williamsburg" />
      <FormInput label="About your space" value={description} onChangeText={setDescription} error={errors.description} placeholder="A cozy ceramics studio open to the community" />

      <Meta role="eyebrow" style={styles.label}>Photos</Meta>
      <Body role="bodySm" style={styles.hint}>Up to six photos or clips of the space.</Body>
      {mediaError ? <Banner message={mediaError} /> : null}
      <View style={styles.grid}>
        {VENUE_SLOTS.map((index) => (
          <MediaSlotPicker
            key={index}
            style={styles.slot}
            media={photos[index]}
            progress={progress[index]}
            onPick={() => handlePick(index)}
            onRemove={() => handleRemove(index)}
          />
        ))}
      </View>

      <AuthButton label={submitLabel} onPress={handleSubmit} variant="primary" loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { marginBottom: space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.pill,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
  },
  chipActive: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  errorText: { marginBottom: space.sm },
  hint: { marginBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  slot: { width: '31%', aspectRatio: 1 },
})
