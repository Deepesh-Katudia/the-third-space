import React, { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { FormInput } from './FormInput'
import { AuthButton } from './AuthButton'
import { BOROUGHS } from '../constants/categories'
import { Borough, Venue } from '../types/models'
import { palette, radius, space } from '../constants/design'
import { Body, Meta } from './ui/Text'

interface VenueFormErrors {
  name?: string
  borough?: string
  neighborhood?: string
  description?: string
}

interface VenueFormProps {
  initial?: Venue
  submitLabel: string
  onSubmit: (venue: Venue) => Promise<void>
}

export function VenueForm({ initial, submitLabel, onSubmit }: VenueFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [borough, setBorough] = useState<Borough | ''>(initial?.borough ?? '')
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [errors, setErrors] = useState<VenueFormErrors>({})
  const [saving, setSaving] = useState(false)

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
})
