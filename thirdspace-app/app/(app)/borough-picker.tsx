import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { BOROUGHS } from '../../constants/categories'
import { Borough } from '../../types/models'
import { useUserLocation } from '../../hooks/useUserLocation'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

/** null is a real option — "All of NYC" — not the absence of one. */
const OPTIONS: { label: string; value: Borough | null }[] = [
  { label: 'All of NYC', value: null },
  ...BOROUGHS.map((b) => ({ label: b, value: b as Borough | null })),
]

export default function BoroughPicker() {
  const router = useRouter()
  const { borough, setBorough } = useUserLocation()

  const choose = (value: Borough | null) => {
    setBorough(value)
    router.back()
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Location</Display>
      </View>

      <Body role="bodySm" style={styles.hint}>
        Pick a borough to see what&apos;s happening near you. This overrides your location.
      </Body>

      <View style={styles.card}>
        {OPTIONS.map((option, index) => {
          const isSelected = option.value === borough
          const isLast = index === OPTIONS.length - 1
          return (
            <TouchableOpacity
              key={option.label}
              style={[styles.row, isLast && styles.rowLast]}
              onPress={() => choose(option.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Display>{option.label}</Display>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <Meta style={styles.footnote}>Change this any time from the chip on Discover.</Meta>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  hint: { marginHorizontal: space.xl, marginBottom: space.lg },
  card: {
    marginHorizontal: space.xl,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.rule },
  footnote: { marginHorizontal: space.xl, marginTop: space.md + 2 },
})
