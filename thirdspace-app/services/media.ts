import * as ImagePicker from 'expo-image-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '../firebase/config'
import { MediaAsset, MediaType } from '../types/models'
import {
  MediaSlot, CompressionPreset, LimitResult,
  mediaPath, thumbPath, presetFor, THUMB_PRESET, withinLimits, VIDEO_MAX_MS,
} from '../utils/media'

/** Raised when a file breaches a cap. Carries the reason so the UI can name it. */
export class MediaLimitError extends Error {
  readonly result: LimitResult
  constructor(result: LimitResult) {
    super(`media limit: ${result}`)
    this.name = 'MediaLimitError'
    this.result = result
  }
}

export interface PickedMedia {
  uri: string
  type: MediaType
  width: number
  height: number
  /** Videos only, milliseconds. */
  durationMs?: number
  /** Not reported by every platform; treated as unknown when absent. */
  fileSize?: number
}

export async function pickMedia(opts: { allowVideo: boolean; aspect?: [number, number] }): Promise<PickedMedia | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: opts.allowVideo ? ['images', 'videos'] : ['images'],
    allowsEditing: opts.aspect !== undefined,
    aspect: opts.aspect,
    quality: 1,            // compression happens in uploadMedia, per-slot
    videoMaxDuration: VIDEO_MAX_MS / 1000,
  })
  if (result.canceled) return null

  const asset = result.assets[0]
  const type: MediaType = asset.type === 'video' ? 'video' : 'image'
  return {
    uri: asset.uri,
    type,
    width: asset.width,
    height: asset.height,
    ...(asset.duration != null ? { durationMs: asset.duration } : {}),
    ...(asset.fileSize != null ? { fileSize: asset.fileSize } : {}),
  }
}

interface Compressed { uri: string; width: number; height: number }

async function compress(uri: string, preset: CompressionPreset, width: number, height: number): Promise<Compressed> {
  // Resize the LONGEST edge; expo-image-manipulator preserves aspect when only one
  // dimension is given, so pass whichever side is larger.
  const context = ImageManipulator.manipulate(uri)
  context.resize(width >= height ? { width: preset.maxEdge } : { height: preset.maxEdge })
  const rendered = await context.renderAsync()
  const saved = await rendered.saveAsync({ compress: preset.quality, format: SaveFormat.JPEG })
  return { uri: saved.uri, width: saved.width, height: saved.height }
}

async function toBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri)
  return res.blob()
}

async function put(path: string, blob: Blob, contentType: string, onProgress?: (f: number) => void): Promise<string> {
  const storageRef = ref(storage, path)
  const task = uploadBytesResumable(storageRef, blob, { contentType })
  if (onProgress) {
    task.on('state_changed', (snap) => {
      if (snap.totalBytes > 0) onProgress(snap.bytesTransferred / snap.totalBytes)
    })
  }
  await task
  return getDownloadURL(storageRef)
}

/**
 * Compress or generate a poster, check the caps, upload, resolve download URLs.
 *
 * Cheap checks run FIRST. A 200 MB clip must be rejected from its metadata, before
 * `fetch(uri).blob()` — the Firebase JS SDK has no streaming upload on React Native,
 * so the blob materialises whole in JS memory and a big enough file is a crash, not
 * an error message.
 */
export async function uploadMedia(
  slot: MediaSlot,
  picked: PickedMedia,
  onProgress?: (fraction: number) => void
): Promise<MediaAsset> {
  // 1. Reject from metadata alone where we can.
  const metaVerdict = withinLimits(picked.fileSize ?? 0, picked.durationMs, picked.type)
  if (metaVerdict !== 'ok') throw new MediaLimitError(metaVerdict)

  if (picked.type === 'image') {
    const small = await compress(picked.uri, presetFor(slot), picked.width, picked.height)
    const blob = await toBlob(small.uri)
    const verdict = withinLimits(blob.size, undefined, 'image')
    if (verdict !== 'ok') throw new MediaLimitError(verdict)

    const url = await put(mediaPath(slot), blob, blob.type || 'image/jpeg', onProgress)
    // thumbURL IS the image: one render path for every surface.
    return { type: 'image', url, thumbURL: url, width: small.width, height: small.height }
  }

  // 2. Poster frame first, so a failure here costs nothing but the poster.
  let thumbURL = ''
  let posterBlob: Blob | null = null
  try {
    const frame = await VideoThumbnails.getThumbnailAsync(picked.uri, { time: 1000, quality: THUMB_PRESET.quality })
    const small = await compress(frame.uri, THUMB_PRESET, frame.width, frame.height)
    posterBlob = await toBlob(small.uri)
  } catch {
    // Poster generation fails on some codecs and some devices. thumbURL stays '' and
    // MediaThumb renders an ink tile with a play badge. No pending state, no retry.
    posterBlob = null
  }

  const blob = await toBlob(picked.uri)
  const verdict = withinLimits(blob.size, picked.durationMs, 'video')
  if (verdict !== 'ok') throw new MediaLimitError(verdict)

  const url = await put(mediaPath(slot), blob, blob.type || 'video/mp4', onProgress)
  if (posterBlob) {
    thumbURL = await put(thumbPath(slot), posterBlob, posterBlob.type || 'image/jpeg')
  }

  return {
    type: 'video',
    url,
    thumbURL,
    width: picked.width,
    height: picked.height,
    ...(picked.durationMs != null ? { durationMs: picked.durationMs } : {}),
  }
}

/**
 * Best-effort. Swallows not-found by design: failing to delete something already gone
 * is not a failure, and every caller is a cleanup path that must not block on it.
 */
export async function deleteMedia(asset: MediaAsset): Promise<void> {
  const urls = asset.thumbURL && asset.thumbURL !== asset.url ? [asset.url, asset.thumbURL] : [asset.url]
  await Promise.all(urls.map(async (url) => {
    try { await deleteObject(ref(storage, url)) } catch { /* already gone */ }
  }))
}
