import React from 'react'
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Display, Meta } from './Text'

const PHOTO_HEIGHT = 96
/** Events carry no image today, so the ticket keeps its silhouette with a color band. */
const BAND_HEIGHT = 44
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
  const headerHeight = photoUri ? PHOTO_HEIGHT : BAND_HEIGHT

  return (
    <TouchableOpacity testID="ticket-card" onPress={onPress} activeOpacity={0.9} style={styles.card}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.header, { height: PHOTO_HEIGHT }]} />
      ) : (
        <View testID="ticket-band" style={[styles.header, styles.band, { height: BAND_HEIGHT }]} />
      )}

      <View style={styles.tear} />
      <View
        testID="ticket-notch"
        style={{ ...styles.notch, ...styles.notchLeft, top: headerHeight - NOTCH / 2, backgroundColor: notchColor }}
      />
      <View
        testID="ticket-notch"
        style={{ ...styles.notch, ...styles.notchRight, top: headerHeight - NOTCH / 2, backgroundColor: notchColor }}
      />

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
  header: {
    width: '100%',
    borderTopLeftRadius: radius.ticket,
    borderTopRightRadius: radius.ticket,
  },
  band: { backgroundColor: palette.orangeDeep },
  tear: { borderTopWidth: 1, borderTopColor: palette.rule, borderStyle: 'dashed', marginHorizontal: space.lg },
  notch: { position: 'absolute', width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2 },
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
