import { MediaAsset, MediaType } from '../types/models'

/**
 * Where an asset lives. One union rather than one function per surface: adding a
 * sixth surface later is one variant and one case, not a new upload path.
 */
export type MediaSlot =
  | { kind: 'avatar'; uid: string }
  | { kind: 'vibe'; uid: string; index: number }
  | { kind: 'eventCover'; hosterUid: string; eventId: string }
  | { kind: 'venue'; uid: string; index: number }
  | { kind: 'chat'; authorUid: string; threadId: string; messageId: string }

/**
 * Extensions are dropped on every slot that can hold either an image or a video.
 * Content type lives in object metadata instead, and the fixed path means swapping a
 * photo for a clip OVERWRITES rather than stranding the old object — which is what
 * makes replacement orphan-free everywhere.
 *
 * The avatar keeps `.jpg` because it is always an image and existing uploads already
 * live there; changing it would strand every current avatar.
 *
 * The event cover is rooted at the HOSTER uid, not the event id alone. Storage rules
 * cannot query Firestore to ask who owns an event, so ownership has to be expressible
 * in the path itself.
 */
export function mediaPath(slot: MediaSlot): string {
  switch (slot.kind) {
    case 'avatar':     return `profilePhotos/${slot.uid}/avatar.jpg`
    case 'vibe':       return `profilePhotos/${slot.uid}/vibe${slot.index}`
    case 'eventCover': return `eventCovers/${slot.hosterUid}/${slot.eventId}/cover`
    case 'venue':      return `venuePhotos/${slot.uid}/${slot.index}`
    case 'chat':       return `chatMedia/${slot.authorUid}/${slot.threadId}/${slot.messageId}`
  }
}

export function thumbPath(slot: MediaSlot): string {
  return `${mediaPath(slot)}_thumb`
}

export interface CompressionPreset {
  /** Longest edge, in pixels. Aspect ratio is preserved. */
  maxEdge: number
  /** 0-1, passed straight to expo-image-manipulator's `compress`. */
  quality: number
}

const GALLERY_PRESET: CompressionPreset = { maxEdge: 1440, quality: 0.75 }

/** One fixed preset for every generated poster frame, whatever the slot. */
export const THUMB_PRESET: CompressionPreset = { maxEdge: 640, quality: 0.6 }

export function presetFor(slot: MediaSlot): CompressionPreset {
  switch (slot.kind) {
    case 'avatar': return { maxEdge: 512, quality: 0.8 }
    case 'chat':   return { maxEdge: 1280, quality: 0.7 }
    case 'vibe':
    case 'venue':
    case 'eventCover':
      return GALLERY_PRESET
  }
}

/**
 * Strict inequalities, matching storage.rules exactly (`request.resource.size < N`).
 * Exactly 5 MB is REJECTED. If these two ever drift, the client accepts a file the
 * rules then refuse, which is the worst possible place to discover a limit.
 */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024

/**
 * Duration is a PRODUCT constraint, not a security one: storage.rules sees only
 * `size` and `contentType`, never media metadata. The size cap is the real backstop.
 */
export const VIDEO_MAX_MS = 60_000

export type LimitResult = 'ok' | 'too-large' | 'too-long'

export function withinLimits(bytes: number, durationMs: number | undefined, type: MediaType): LimitResult {
  if (type === 'video') {
    // Duration first: it is the cause a user can actually act on, and it is cheap to
    // check before the file is ever materialised into memory.
    if (durationMs !== undefined && durationMs > VIDEO_MAX_MS) return 'too-long'
    return bytes >= VIDEO_MAX_BYTES ? 'too-large' : 'ok'
  }
  return bytes >= IMAGE_MAX_BYTES ? 'too-large' : 'ok'
}

export function limitMessage(result: LimitResult, type: MediaType): string {
  if (result === 'too-long') return 'Clips can be up to 60 seconds.'
  if (result === 'too-large') {
    return type === 'video'
      ? 'That clip is too large. Try a shorter one.'
      : 'That photo is too large. Try a smaller one.'
  }
  return ''
}

function isMediaAsset(value: unknown): value is MediaAsset {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (v.type === 'image' || v.type === 'video')
    && typeof v.url === 'string'
    && typeof v.thumbURL === 'string'
}

/**
 * `Profile.vibePhotos` was typed `string[]` and never written — every stored value in
 * Firestore is `[]`. The retype to `MediaAsset[]` is therefore safe, but assuming
 * production data matches your assumptions is how you find out it does not, so a bare
 * string is still coerced rather than crashing a profile screen.
 */
export function coerceLegacyVibe(value: unknown): MediaAsset[] {
  if (!Array.isArray(value)) return []
  return value.reduce<MediaAsset[]>((acc, entry) => {
    if (typeof entry === 'string') {
      acc.push({ type: 'image', url: entry, thumbURL: entry, width: 0, height: 0 })
    } else if (isMediaAsset(entry)) {
      acc.push(entry)
    }
    return acc
  }, [])
}

/**
 * Fills `lastMessageText` and the push body for an attachment-only message. Uppercase
 * because every type role in this app is uppercase — a lowercase "Photo" would be the
 * only string in the codebase fighting the token.
 */
export function mediaPreviewLabel(media?: MediaAsset | null): string {
  if (!media) return ''
  return media.type === 'video' ? 'VIDEO' : 'PHOTO'
}
