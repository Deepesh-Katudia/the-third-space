import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { FormInput } from './FormInput'
import { AuthButton } from './AuthButton'
import { BOROUGHS } from '../constants/categories'
import { Borough, Venue } from '../types/models'

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
      <Text style={styles.label}>Borough</Text>
      <View style={styles.chipRow}>
        {BOROUGHS.map((b) => (
          <TouchableOpacity
            key={b}
            onPress={() => setBorough(b)}
            style={[styles.chip, borough === b && styles.chipActive]}
          >
            <Text style={[styles.chipText, borough === b && styles.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.borough ? <Text style={styles.errorText}>{errors.borough}</Text> : null}
      <FormInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} error={errors.neighborhood} placeholder="Williamsburg" />
      <FormInput label="About your space" value={description} onChangeText={setDescription} error={errors.description} placeholder="A cozy ceramics studio open to the community" />
      <AuthButton label={submitLabel} onPress={handleSubmit} variant="primary" loading={saving} />
    </View>
  )
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#15161A', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: 'rgba(107,111,120,0.4)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#FF9F3D', borderColor: '#FF9F3D' },
  chipText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78' },
  chipTextActive: { color: '#15161A' },
  errorText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#FF3B30', marginBottom: 8 },
})
