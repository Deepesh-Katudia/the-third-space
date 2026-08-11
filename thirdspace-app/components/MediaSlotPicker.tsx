import React from 'react'
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { MediaAsset } from '../types/models'
import { palette, radius, space } from '../constants/design'
import { Meta } from './ui/Text'
import { MediaThumb } from './MediaThumb'

interface MediaSlotPickerProps {
  media: MediaAsset | null
  /** 0-1 while uploading; null or absent when idle. */
  progress?: number | null
  /** Caption under the empty affordance, e.g. "Add a photo or clip". */
  label?: string
  style?: StyleProp<ViewStyle>
  onPick: () => void
  onRemove: () => void
}

/**
 * A single fillable media slot: tap to add, thumb once filled, determinate bar while
 * uploading. Used by the profile vibe grid, the venue gallery and the event cover.
 *
 * Chat deliberately does NOT use this — a slot grid and a send-attachment button are
 * different interactions, and one component forced to be both ends up with a `variant`
 * prop meaning "ignore half my props".
 */
export function MediaSlotPicker({ media, progress = null, label, style, onPick, onRemove }: MediaSlotPickerProps) {
  const uploading = progress !== null && progress !== undefined

  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        testID="slot-picker"
        activeOpacity={0.85}
        onPress={uploading ? undefined : onPick}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel={media ? 'Replace media' : 'Add media'}
        style={styles.tap}
      >
        {media ? (
          <MediaThumb media={media} style={styles.fill} />
        ) : (
          <View testID="slot-picker-empty" style={[styles.fill, styles.empty]}>
            <Ionicons name="add" size={22} color={palette.inkSoft} />
            {label ? <Meta style={styles.label}>{label}</Meta> : null}
          </View>
        )}
      </TouchableOpacity>

      {media && !uploading ? (
        <TouchableOpacity
          testID="slot-picker-remove"
          onPress={onRemove}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Remove media"
          style={styles.remove}
        >
          <Ionicons name="close" size={14} color={palette.cream} />
        </TouchableOpacity>
      ) : null}

      {uploading ? (
        <View testID="slot-picker-progress" style={styles.progressTrack}>
          <View
            testID="slot-picker-progress-fill"
            style={[styles.progressFill, { width: `${Math.round((progress ?? 0) * 100)}%` }]}
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  tap: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    borderRadius: radius.ticket - 4,
    borderWidth: 1,
    borderColor: palette.rule,
    borderStyle: 'dashed',
    backgroundColor: palette.orangeLight,
  },
  label: { textAlign: 'center', paddingHorizontal: space.xs },
  remove: {
    position: 'absolute',
    top: space.xs,
    right: space.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
  progressTrack: {
    position: 'absolute',
    left: space.sm,
    right: space.sm,
    bottom: space.sm,
    height: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    backgroundColor: palette.rule,
  },
  progressFill: { height: '100%', backgroundColor: palette.clay },
})
