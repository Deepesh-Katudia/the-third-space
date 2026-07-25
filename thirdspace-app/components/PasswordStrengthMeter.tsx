import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PasswordEvaluation, PasswordStrength } from '../utils/password'

interface StrengthMeta {
  label: string
  color: string
  segments: number
}

const STRENGTH: Record<PasswordStrength, StrengthMeta> = {
  weak: { label: 'Weak', color: '#FF3B30', segments: 1 },
  fair: { label: 'Fair', color: '#B0721F', segments: 2 },
  good: { label: 'Good', color: '#FF9F3D', segments: 3 },
  strong: { label: 'Strong', color: '#2FA365', segments: 4 },
}

const CLASS_CHIPS = [
  { key: 'lowercase', text: 'a-z' },
  { key: 'uppercase', text: 'A-Z' },
  { key: 'number', text: '0-9' },
  { key: 'symbol', text: '!@#' },
] as const

interface Requirement {
  met: boolean
  label: string
}

interface Props {
  evaluation: PasswordEvaluation
}

export function PasswordStrengthMeter({ evaluation }: Props) {
  const { checks, classesMet, strength } = evaluation
  const meta = STRENGTH[strength]

  const requirements: Requirement[] = [
    { met: checks.minLength, label: 'At least 8 characters' },
    { met: classesMet >= 3, label: 'At least 3 of the 4 character types below' },
  ]
  if (!checks.notCommon) requirements.push({ met: false, label: 'Avoid common passwords (e.g. “password”)' })
  if (!checks.notPersonal) requirements.push({ met: false, label: "Don’t include your name or email" })

  return (
    <View style={styles.wrap}>
      <View style={styles.barRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.segment, { backgroundColor: i < meta.segments ? meta.color : '#E2E0DA' }]} />
        ))}
        <Text style={[styles.strengthLabel, { color: meta.color }]}>{meta.label}</Text>
      </View>

      <View style={styles.chips}>
        {CLASS_CHIPS.map((chip) => {
          const on = checks[chip.key]
          return (
            <View key={chip.key} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{chip.text}</Text>
            </View>
          )
        })}
      </View>

      <View style={styles.reqs}>
        {requirements.map((req) => (
          <View key={req.label} style={styles.reqRow}>
            <Ionicons
              name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={req.met ? '#2FA365' : '#A2A7AE'}
            />
            <Text style={[styles.reqText, req.met && styles.reqTextMet]}>{req.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: -4, marginBottom: 16, gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, minWidth: 46, textAlign: 'right' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(226,224,218,0.6)', backgroundColor: 'white',
  },
  chipOn: { backgroundColor: '#15161A', borderColor: '#15161A' },
  chipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 12, color: '#A2A7AE' },
  chipTextOn: { color: 'white' },
  reqs: { gap: 6 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqText: { fontFamily: 'Poppins_500Medium', fontSize: 13, color: '#6B6F78', flex: 1 },
  reqTextMet: { color: '#15161A' },
})
