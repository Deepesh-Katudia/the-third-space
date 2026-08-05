import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { palette } from '../constants/design'
import { AmbientBackdrop } from './AmbientBackdrop'

interface LoadingViewProps {
  /** Must match the screen it stands in for — this fills the whole viewport. */
  tone?: 'deep' | 'cream'
}

/**
 * Carries the ambient field too, so a gate that resolves in 200ms does not flash a flat
 * orange rectangle between two moving ones.
 */
export function LoadingView({ tone = 'deep' }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <AmbientBackdrop />
      {tone === 'cream' && <View style={styles.veil} pointerEvents="none" />}
      <ActivityIndicator size="large" color={palette.clay} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.creamVeil },
})
