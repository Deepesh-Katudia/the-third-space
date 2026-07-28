import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PasswordEvaluation, PasswordStrength } from '../utils/password'
import { palette, space } from '../constants/design'
import { Body, Meta } from './ui/Text'

type AccentTone = 'clay' | 'sage'

interface StrengthMeta {
  label: string
  /** The palette has no red/amber/green ladder — the filled segment count carries
   *  the four levels, and clay vs sage carries "not there yet" vs "good". */
  tone: AccentTone
  segments: number
}

const STRENGTH: Record<PasswordStrength, StrengthMeta> = {
  weak: { label: 'Weak', tone: 'clay', segments: 1 },
  fair: { label: 'Fair', tone: 'clay', segments: 2 },
  good: { label: 'Good', tone: 'sage', segments: 3 },
  strong: { label: 'Strong', tone: 'sage', segments: 4 },
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
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < meta.segments ? palette[meta.tone] : palette.rule }]}
          />
        ))}
        <Meta role="eyebrow" tone={meta.tone} style={styles.strengthLabel}>{meta.label}</Meta>
      </View>

      <View style={styles.chips}>
        {CLASS_CHIPS.map((chip) => {
          const on = checks[chip.key]
          return (
            <View key={chip.key} style={[styles.chip, on && styles.chipOn]}>
              <Meta role="eyebrow" tone={on ? 'clay' : 'inkSoft'}>{chip.text}</Meta>
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
              color={req.met ? palette.sage : palette.inkSoft}
            />
            <Body role="bodySm" tone={req.met ? 'ink' : 'inkSoft'} style={styles.reqText}>{req.label}</Body>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginTop: -space.xs, marginBottom: space.lg, gap: space.sm + 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  segment: { flex: 1, height: 5, borderRadius: 3 },
  strengthLabel: { minWidth: 46, textAlign: 'right' },
  chips: { flexDirection: 'row', gap: space.sm },
  chip: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: space.xs,
    borderRadius: space.sm,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  chipOn: { backgroundColor: palette.orangeLight, borderColor: palette.clay },
  reqs: { gap: space.xs + 2 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  reqText: { flex: 1 },
})
