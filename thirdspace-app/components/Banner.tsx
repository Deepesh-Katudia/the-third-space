import React from 'react'
import { View, StyleSheet } from 'react-native'
import { palette, radius, space } from '../constants/design'
import { Body } from './ui/Text'

interface BannerProps {
  message: string
  tone?: 'error' | 'success'
}

/**
 * The two-tone palette carries no dedicated red/green, and adding one would break the
 * "eight values, nothing else" rule. Clay (warm, urgent) and sage (cool, settled) are
 * already AA on cream and on both orange tones, so they carry the semantics instead.
 */
export function Banner({ message, tone = 'error' }: BannerProps) {
  return (
    <View style={styles.banner}>
      <Body role="bodySm" tone={tone === 'error' ? 'clay' : 'sage'}>{message}</Body>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderColor: palette.rule,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    marginBottom: space.lg,
  },
})
