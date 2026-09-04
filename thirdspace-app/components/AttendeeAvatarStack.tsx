import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { avatarColor, initials } from '../utils/avatar'
import { palette, font } from '../constants/design'

/**
 * `solid` fills each disc with the member's identity tint — the default everywhere a
 * stack sits on a flat surface (a ticket, a chat header) and needs to read at a glance.
 *
 * `glass` drops the tint and lets the ambient field through instead: a wash of the light
 * tone, a lit top edge, and ink initials. It exists for surfaces that sit directly on
 * the field, where five saturated discs punched into a soft gradient are the loudest
 * thing on the screen. Identity still comes from the initials and the photo — the tint
 * was only ever a second, redundant channel for it.
 */
type AvatarVariant = 'solid' | 'glass'

interface AttendeeAvatarStackProps {
  /** Seeds (names or uids) used to render initial-based avatars. */
  uids: string[]
  /** Total attendee count; drives the "+N" overflow chip. */
  count: number
  /** Optional profile photo URLs, index-aligned with `uids`. A real photo is
   *  shown when present; otherwise the initial-based avatar is used. */
  photoURLs?: (string | null | undefined)[]
  size?: number
  /** Max avatars rendered before collapsing into a "+N" chip. */
  max?: number
  /** Border color of each avatar (matches the surface it sits on). Ignored by `glass`,
   *  which draws its own lit edge — a ring in the surface colour would punch an opaque
   *  hole in the very thing the glass is there to show. */
  ringColor?: string
  variant?: AvatarVariant
}

export function AttendeeAvatarStack({
  uids,
  count,
  photoURLs,
  size = 32,
  max = 4,
  ringColor = palette.orangeLight,
  variant = 'solid',
}: AttendeeAvatarStackProps) {
  const shown = uids.slice(0, max)
  const overflow = count - shown.length
  const overlap = Math.round(size * 0.32)
  const glass = variant === 'glass'
  const border = glass ? palette.glassEdge : ringColor

  return (
    <View style={styles.row}>
      {shown.map((seed, i) => {
        const photo = photoURLs?.[i]
        const fill = glass
          ? palette.glassFill
          : photo
            ? palette.orangeLight
            : avatarColor(seed)
        return (
          <View
            key={`${seed}-${i}`}
            testID={glass ? 'avatar-glass' : 'avatar-solid'}
            style={[
              styles.avatar,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: fill,
                borderColor: border,
                marginLeft: i === 0 ? 0 : -overlap,
                zIndex: shown.length - i,
              },
            ]}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: size, height: size }} />
            ) : (
              <Text
                style={[
                  styles.initials,
                  { fontSize: size * 0.4, color: glass ? palette.ink : palette.cream },
                ]}
              >
                {initials(seed)}
              </Text>
            )}
            {glass ? <View style={styles.sheen} pointerEvents="none" /> : null}
          </View>
        )
      })}
      {overflow > 0 ? (
        <View
          style={[
            styles.avatar,
            glass ? styles.overflowGlass : styles.overflow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: border,
              marginLeft: -overlap,
            },
          ]}
        >
          <Text
            style={[
              styles.overflowText,
              { fontSize: size * 0.34, color: glass ? palette.ink : palette.cream },
            ]}
          >
            +{overflow}
          </Text>
          {glass ? <View style={styles.sheen} pointerEvents="none" /> : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, overflow: 'hidden' },
  // Avatar fills stay outside the two-tone palette on purpose — they encode identity.
  // Cream initials clear AA on every entry (guarded by contrast.test.ts). The glass
  // variant overrides the colour to ink, which clears AA on both field tones.
  initials: { fontFamily: font.bodySemi },
  /** The specular catch along the top of a glass disc. Clipped by `overflow: hidden`. */
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '46%',
    backgroundColor: palette.glassSheen,
  },
  overflow: { backgroundColor: palette.ink },
  overflowGlass: { backgroundColor: palette.glassFill },
  overflowText: { fontFamily: font.bodySemi },
})
