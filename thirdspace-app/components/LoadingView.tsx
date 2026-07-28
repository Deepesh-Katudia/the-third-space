import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { palette } from '../constants/design'

interface LoadingViewProps {
  /** Must match the screen it stands in for — this fills the whole viewport. */
  tone?: 'deep' | 'cream'
}

export function LoadingView({ tone = 'deep' }: LoadingViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: tone === 'deep' ? palette.orangeDeep : palette.cream }]}>
      <ActivityIndicator size="large" color={palette.clay} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
