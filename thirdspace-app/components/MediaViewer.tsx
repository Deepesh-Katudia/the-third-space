import React from 'react'
import { Modal, Image, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { MediaAsset } from '../types/models'
import { palette, reward, space } from '../constants/design'

interface MediaViewerProps {
  media: MediaAsset | null
  onClose: () => void
}

/**
 * The one place media is played. Every surface renders a MediaThumb and opens this on
 * tap — nothing in the app autoplays inline, which is what keeps a video-capable
 * EventCard in a scrolling feed as cheap as an image-only one.
 *
 * `useVideoPlayer` is called unconditionally (hooks cannot be conditional); it is
 * handed an empty source for images, which expo-video treats as nothing to load.
 */
export function MediaViewer({ media, onClose }: MediaViewerProps) {
  const player = useVideoPlayer(media?.type === 'video' ? media.url : '', (p) => {
    p.loop = false
  })

  if (!media) return null

  return (
    <Modal testID="media-viewer" visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable testID="media-viewer-backdrop" style={styles.backdrop} onPress={onClose}>
        {media.type === 'video' ? (
          <VideoView style={styles.media} player={player} allowsFullscreen nativeControls contentFit="contain" />
        ) : (
          <Image testID="media-viewer-image" source={{ uri: media.url }} style={styles.media} resizeMode="contain" />
        )}
      </Pressable>

      <Pressable style={styles.close} onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
        <Ionicons name="close" size={24} color={palette.cream} />
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // The one dark scrim outside the reward frame. Reuses the reward veil token rather
  // than inventing a second near-black, so there is still exactly one in the system.
  backdrop: { flex: 1, backgroundColor: reward.veil, alignItems: 'center', justifyContent: 'center' },
  media: { width: '100%', height: '80%' },
  close: { position: 'absolute', top: space.xxl + space.lg, right: space.xl },
})
