import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, Redirect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useAuth } from '../../hooks/useAuth'
import { useVenue } from '../../hooks/useVenue'
import { createEvent } from '../../services/events'
import { validateEventForm, EventFormErrors } from '../../utils/eventValidation'
import { formatEventDate } from '../../utils/eventHelpers'
import { EVENT_CATEGORIES } from '../../constants/categories'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { Banner } from '../../components/Banner'
import { LoadingView } from '../../components/LoadingView'
import { AgeRequirement, EventCategory } from '../../types/models'

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

  if (loading || venueLoading) return <LoadingView />
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
      await createEvent(user!.uid, venue, {
        title,
        description,
        category: category as EventCategory,
        startsAt,
        capacity: Number(capacity),
        ageRequirement,
      })
      router.back()
    } catch {
      setBanner("Couldn't create the event. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create an event</Text>
        {banner ? <Banner message={banner} /> : null}

        <FormInput label="Title" value={title} onChangeText={setTitle} error={errors.title} placeholder="Ceramics Night" />
        <FormInput label="Description" value={description} onChangeText={setDescription} error={errors.description} placeholder="What to expect, what to bring" />

        <Text style={styles.label}>Category</Text>
        <View style={styles.chipRow}>
          {EVENT_CATEGORIES.map((c) => (
            <TouchableOpacity key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive]}>
              <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}

        <Text style={styles.label}>Date & time</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity onPress={() => setPickerMode('date')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{formatEventDate(startsAt).split(' · ')[0]}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setPickerMode('time')} style={styles.dateButton}>
            <Text style={styles.dateButtonText}>{formatEventDate(startsAt).split(' · ')[1]}</Text>
          </TouchableOpacity>
        </View>
        {errors.startsAt ? <Text style={styles.errorText}>{errors.startsAt}</Text> : null}
        {pickerMode ? (
          <DateTimePicker
            value={startsAt}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onPickerChange}
          />
        ) : null}

        <FormInput label="Capacity" value={capacity} onChangeText={setCapacity} error={errors.capacity} keyboardType="number-pad" placeholder="12" />

        <Text style={styles.label}>Age requirement</Text>
        <View style={styles.chipRow}>
          {(['18+', '21+'] as AgeRequirement[]).map((a) => (
            <TouchableOpacity key={a} onPress={() => setAgeRequirement(a)} style={[styles.chip, ageRequirement === a && styles.chipActive]}>
              <Text style={[styles.chipText, ageRequirement === a && styles.chipTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.submit}>
          <AuthButton label="Publish event" onPress={handleSubmit} variant="primary" loading={saving} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 24, paddingBottom: 40 },
  back: { marginBottom: 24 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 24, letterSpacing: -0.5 },
  label: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#2C1810', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: '#C4614A', borderColor: '#C4614A' },
  chipText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#8C7B70' },
  chipTextActive: { color: 'white' },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateButton: { flex: 1, borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 12, padding: 14, alignItems: 'center', backgroundColor: 'white' },
  dateButtonText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#2C1810' },
  errorText: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginBottom: 8 },
  submit: { marginTop: 8 },
})
