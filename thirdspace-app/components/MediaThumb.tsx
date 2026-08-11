import React from 'react'
import { View, Image, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MediaAsset } from '../types/models'
import { palette, radius, space } from '../constants/design'
import { Meta } from './ui/Text'

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

interface MediaThumbProps {
  media: MediaAsset
  style?: StyleProp<ViewStyle>
  onPress?: () => void
}

/**
 * The single way media is drawn anywhere in this app. Because `thumbURL` is always
 * populated, there is one render path: draw the poster, add a play badge only when
 * the asset is a video. Four surfaces share this so they cannot drift into four
 * slightly different play buttons.
 *
 * `thumbURL === ''` means poster generation failed on device. That renders a flat ink
 * tile rather than a broken image — it is still obviously a video, and there is no
 * "processing" state to explain because uploads are synchronous from the client.
 */
export function MediaThumb({ media, style, onPress }: MediaThumbProps) {
  const isVideo = media.type === 'video'

  return (
    <TouchableOpacity
      testID="media-thumb"
      accessibilityRole="imagebutton"
      accessibilityLabel={isVideo ? 'Video' : 'Photo'}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.wrap, style]}
    >
      {media.thumbURL ? (
        <Image testID="media-thumb-image" source={{ uri: media.thumbURL }} style={styles.image} />
      ) : (
        <View testID="media-thumb-fallback" style={[styles.image, styles.fallback]} />
      )}

      {isVideo ? (
        <View testID="media-thumb-play" style={styles.play}>
          <Ionicons name="play" size={16} color={palette.cream} />
        </View>
      ) : null}

      {isVideo && media.durationMs != null ? (
        <View style={styles.durationPill}>
          <Meta testID="media-thumb-duration" style={styles.durationText}>{formatDuration(media.durationMs)}</Meta>
        </View>
      ) : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: radius.ticket - 4, backgroundColor: palette.orangeLight },
  image: { width: '100%', height: '100%' },
  fallback: { backgroundColor: palette.ink },
  play: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  durationPill: {
    position: 'absolute',
    right: space.xs + 2,
    bottom: space.xs + 2,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    backgroundColor: palette.ink,
  },
  durationText: { color: palette.cream },
})
