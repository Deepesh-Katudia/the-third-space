import React from 'react'
import { Pressable, View, StyleSheet, GestureResponderEvent } from 'react-native'
import { colors, radius } from '../constants/theme'

// Props are a subset of React Navigation's BottomTabBarButtonProps — typed locally so
// this stays decoupled from the nav version. The active highlight is a compact pill that
// hugs the icon+label and floats centered in the bar, matching the design comp, instead
// of React Navigation's default full-cell `tabBarActiveBackgroundColor` fill.
type PressHandler = ((e: GestureResponderEvent) => void) | null | undefined

interface PillTabButtonProps {
  children?: React.ReactNode
  onPress?: PressHandler
  onLongPress?: PressHandler
  accessibilityState?: { selected?: boolean }
  accessibilityLabel?: string
  testID?: string
}

export function PillTabButton({
  children, onPress, onLongPress, accessibilityState, accessibilityLabel, testID,
}: PillTabButtonProps) {
  const focused = !!accessibilityState?.selected
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={styles.cell}
    >
      <View style={[styles.pill, focused && styles.pillActive]}>
        {children}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  cell: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center' },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.icon,
  },
  pillActive: { backgroundColor: 'rgba(255,159,61,0.16)' },
})
