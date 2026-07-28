import React from 'react'
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { palette, radius, space } from '../../constants/design'
import { Display, Meta } from './Text'

/**
 * Photo and placeholder share one height so the tear line and notches sit in the same
 * place whether or not an event has an image — the card never changes shape.
 */
const MEDIA_HEIGHT = 120
const NOTCH = 14

interface TicketCardProps {
  /** MUST match the background of the screen this sits on — the notches are painted in it. */
  tone: 'deep' | 'cream'
  photoUri?: string | null
  day: string
  month: string
  onPress: () => void
  children: React.ReactNode
}

export function TicketCard({ tone, photoUri, day, month, onPress, children }: TicketCardProps) {
  const notchColor = tone === 'deep' ? palette.orangeDeep : palette.cream

  return (
    <TouchableOpacity testID="ticket-card" onPress={onPress} activeOpacity={0.9} style={styles.card}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.media} />
      ) : (
        // Events carry no image field yet. Rather than leave a blank strip, the
        // placeholder is filled and captioned so it reads as "a photo goes here".
        <View testID="ticket-band" style={[styles.media, styles.band]}>
          <Ionicons name="image-outline" size={30} color={palette.orangeLight} />
          <Meta role="eyebrow" style={styles.bandLabel}>No photo yet</Meta>
        </View>
      )}

      <View style={styles.tear} />
      <View testID="ticket-notch" style={[styles.notch, styles.notchLeft, { backgroundColor: notchColor }]} />
      <View testID="ticket-notch" style={[styles.notch, styles.notchRight, { backgroundColor: notchColor }]} />

      <View style={styles.infoWrap}>
        <View style={styles.stub}>
          <Display role="stubDay" tone="clay">{day}</Display>
          <Meta style={styles.month}>{month}</Meta>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: palette.rule,
    marginBottom: space.md,
    overflow: 'visible',
  },
  media: {
    width: '100%',
    height: MEDIA_HEIGHT,
    borderTopLeftRadius: radius.ticket,
    borderTopRightRadius: radius.ticket,
  },
  // Clay, not orangeDeep: the old band matched the screen behind it and read as a gap
  // rather than as image space.
  band: { backgroundColor: palette.clay, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  bandLabel: { color: palette.orangeLight },
  tear: { borderTopWidth: 1, borderTopColor: palette.rule, borderStyle: 'dashed', marginHorizontal: space.lg },
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    top: MEDIA_HEIGHT - NOTCH / 2,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },
  infoWrap: { flexDirection: 'row', gap: space.md, padding: space.md },
  stub: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: palette.rule,
    borderStyle: 'dashed',
    paddingRight: space.md,
  },
  month: { marginTop: 3 },
  body: { flex: 1, minWidth: 0 },
})
