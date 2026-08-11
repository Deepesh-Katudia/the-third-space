import {
  mediaPath, thumbPath, presetFor, THUMB_PRESET, withinLimits, limitMessage,
  coerceLegacyVibe, mediaPreviewLabel,
  IMAGE_MAX_BYTES, VIDEO_MAX_BYTES, VIDEO_MAX_MS,
} from '../../utils/media'
import { MediaAsset } from '../../types/models'

describe('mediaPath', () => {
  it('keeps the avatar at its historical path so existing uploads are overwritten', () => {
    expect(mediaPath({ kind: 'avatar', uid: 'u1' })).toBe('profilePhotos/u1/avatar.jpg')
  })

  it('drops the extension on slots that may hold an image OR a video', () => {
    expect(mediaPath({ kind: 'vibe', uid: 'u1', index: 2 })).toBe('profilePhotos/u1/vibe2')
    expect(mediaPath({ kind: 'venue', uid: 'v1', index: 0 })).toBe('venuePhotos/v1/0')
  })

  it('roots the event cover at the hoster uid, because rules cannot ask Firestore who owns an event', () => {
    expect(mediaPath({ kind: 'eventCover', hosterUid: 'h1', eventId: 'e1' }))
      .toBe('eventCovers/h1/e1/cover')
  })

  it('keys chat media by author, thread and message', () => {
    expect(mediaPath({ kind: 'chat', authorUid: 'a1', threadId: 't1', messageId: 'm1' }))
      .toBe('chatMedia/a1/t1/m1')
  })
})

describe('thumbPath', () => {
  it('suffixes the media path', () => {
    expect(thumbPath({ kind: 'vibe', uid: 'u1', index: 0 })).toBe('profilePhotos/u1/vibe0_thumb')
  })

  it('suffixes the avatar path after its extension, matching the rules pattern', () => {
    expect(thumbPath({ kind: 'avatar', uid: 'u1' })).toBe('profilePhotos/u1/avatar.jpg_thumb')
  })
})

describe('presetFor', () => {
  it('crops the avatar smallest', () => {
    expect(presetFor({ kind: 'avatar', uid: 'u1' })).toEqual({ maxEdge: 512, quality: 0.8 })
  })

  it('uses the gallery preset for vibe, venue and event cover', () => {
    const gallery = { maxEdge: 1440, quality: 0.75 }
    expect(presetFor({ kind: 'vibe', uid: 'u1', index: 0 })).toEqual(gallery)
    expect(presetFor({ kind: 'venue', uid: 'u1', index: 0 })).toEqual(gallery)
    expect(presetFor({ kind: 'eventCover', hosterUid: 'h', eventId: 'e' })).toEqual(gallery)
  })

  it('uses a lighter preset for chat', () => {
    expect(presetFor({ kind: 'chat', authorUid: 'a', threadId: 't', messageId: 'm' }))
      .toEqual({ maxEdge: 1280, quality: 0.7 })
  })

  it('exposes one fixed poster preset, independent of slot', () => {
    expect(THUMB_PRESET).toEqual({ maxEdge: 640, quality: 0.6 })
  })
})

describe('withinLimits', () => {
  it('accepts an image one byte under the ceiling and rejects the ceiling itself', () => {
    expect(withinLimits(IMAGE_MAX_BYTES - 1, undefined, 'image')).toBe('ok')
    expect(withinLimits(IMAGE_MAX_BYTES, undefined, 'image')).toBe('too-large')
  })

  it('accepts a video one byte under the ceiling and rejects the ceiling itself', () => {
    expect(withinLimits(VIDEO_MAX_BYTES - 1, 1000, 'video')).toBe('ok')
    expect(withinLimits(VIDEO_MAX_BYTES, 1000, 'video')).toBe('too-large')
  })

  it('accepts a video exactly at the duration cap and rejects one millisecond over', () => {
    expect(withinLimits(1000, VIDEO_MAX_MS, 'video')).toBe('ok')
    expect(withinLimits(1000, VIDEO_MAX_MS + 1, 'video')).toBe('too-long')
  })

  it('reports duration before size, so the user fixes the cause they can act on', () => {
    expect(withinLimits(VIDEO_MAX_BYTES, VIDEO_MAX_MS + 1, 'video')).toBe('too-long')
  })

  it('treats unknown video duration as acceptable rather than blocking the upload', () => {
    expect(withinLimits(1000, undefined, 'video')).toBe('ok')
  })
})

describe('limitMessage', () => {
  it('names the actual cause per media type', () => {
    expect(limitMessage('too-large', 'image')).toBe('That photo is too large. Try a smaller one.')
    expect(limitMessage('too-large', 'video')).toBe('That clip is too large. Try a shorter one.')
    expect(limitMessage('too-long', 'video')).toBe('Clips can be up to 60 seconds.')
  })

  it('returns an empty string for the ok case', () => {
    expect(limitMessage('ok', 'image')).toBe('')
  })
})

describe('coerceLegacyVibe', () => {
  it('maps a legacy bare string to an image asset whose poster is itself', () => {
    expect(coerceLegacyVibe(['https://a/1.jpg'])).toEqual([
      { type: 'image', url: 'https://a/1.jpg', thumbURL: 'https://a/1.jpg', width: 0, height: 0 },
    ])
  })

  it('passes a well-formed MediaAsset through untouched', () => {
    const asset: MediaAsset = { type: 'video', url: 'u', thumbURL: 't', width: 4, height: 5, durationMs: 900 }
    expect(coerceLegacyVibe([asset])).toEqual([asset])
  })

  it('returns an empty array for anything that is not an array', () => {
    expect(coerceLegacyVibe(undefined)).toEqual([])
    expect(coerceLegacyVibe(null)).toEqual([])
    expect(coerceLegacyVibe('nope')).toEqual([])
  })

  it('drops entries that are neither a string nor a usable asset', () => {
    expect(coerceLegacyVibe([42, { type: 'image' }, null])).toEqual([])
  })
})

describe('mediaPreviewLabel', () => {
  it('returns uppercase labels, because every type role in this app is uppercase', () => {
    expect(mediaPreviewLabel({ type: 'image', url: 'u', thumbURL: 'u', width: 1, height: 1 })).toBe('PHOTO')
    expect(mediaPreviewLabel({ type: 'video', url: 'u', thumbURL: 't', width: 1, height: 1 })).toBe('VIDEO')
  })

  it('returns an empty string when there is no media', () => {
    expect(mediaPreviewLabel(undefined)).toBe('')
    expect(mediaPreviewLabel(null)).toBe('')
  })
})
