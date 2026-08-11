# Storage Media Uploads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship image and video uploads to Firebase Storage across four surfaces — profile, event cover, venue gallery and chat attachments — in `thirdspace-app`.

**Architecture:** Client-direct uploads. One `services/media.ts` owns every write to Storage; `storage.rules` is the only real enforcement. Every asset is described by a `MediaAsset` whose `thumbURL` is the image itself for photos and a generated poster frame for video, so every render site draws one thing and adds a play badge only when `type === 'video'`. Playback is always tap-to-open in a fullscreen modal; nothing autoplays inline.

**Tech Stack:** Expo SDK 54 / React Native 0.81, TypeScript 5.7, expo-router v6, Firebase JS SDK v11 (Storage + Firestore), Jest (jest-expo), `@firebase/rules-unit-testing`.

**Source spec:** `docs/superpowers/specs/2026-08-10-storage-media-uploads-design.md`

## Global Constraints

- **The Storage bucket does not exist yet.** `the-third-space-626e8.firebasestorage.app` returns 404. Someone must click Firebase Console → Build → Storage → Get started. All code and unit tests below work without it; **nothing can be verified on device until it exists.**
- **Size caps are strict inequalities.** Images must be **under** `5 * 1024 * 1024` bytes; video under `50 * 1024 * 1024` bytes and `<= 60000` ms. Exactly 5 MB is rejected. Client and rules must agree exactly.
- **Video duration is NOT enforceable in `storage.rules`** — rules see only `size` and `contentType`. The size cap is the only real backstop.
- **No literal hex anywhere under `app/` or `components/`.** `__tests__/constants/tokens.test.ts` has an empty allowlist and must stay empty. Use `palette`, `space`, `radius`, `font` from `constants/design.ts`.
- **Every type role is uppercase already** via `constants/design.ts`. Never write an inline `textTransform`.
- **All three new dependencies are included in Expo Go.** Do not add a config plugin or suggest a dev build.
- **Run from `thirdspace-app/`.** Commands: `npx jest`, `npx tsc --noEmit`, `npm run test:rules`.
- **Existing suites must stay green:** 62 suites / 484 tests, `npx tsc --noEmit` clean.
- **Never use `router.push('/literal/[id]')` string templates** — dynamic routes use object form: `router.push({ pathname: '/(app)/x/[id]', params })`.
- **Commit after every task.** Conventional commits (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`). No attribution trailers.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `utils/media.ts` | Pure decisions: paths, presets, limits, labels, legacy coercion |
| `services/media.ts` | The only module that touches Firebase Storage |
| `components/MediaThumb.tsx` | Renders a `MediaAsset` poster + play badge |
| `components/MediaSlotPicker.tsx` | Tap-to-add tile with upload progress and remove |
| `components/MediaViewer.tsx` | Fullscreen modal: `VideoView` for clips, `Image` for photos |
| `__tests__/utils/media.test.ts` | Pure unit tests |
| `__tests__/services/media.test.ts` | Mocked-SDK service tests |
| `__tests__/components/MediaThumb.test.tsx` | Component tests |
| `__tests__/components/MediaSlotPicker.test.tsx` | Component tests |
| `__tests__/rules/storage.rules.test.ts` | Storage rules against the emulator |
| `functions/src/mediaLabel.ts` | Push-body fallback for attachment-only messages |
| `functions/src/mediaLabel.test.ts` | Its test |

**Modified:** `types/models.ts`, `storage.rules`, `package.json`, `services/photos.ts`, `services/events.ts`, `services/chat.ts`, `components/ui/TicketCard.tsx`, `components/EventCard.tsx`, `components/ChatBubble.tsx`, `components/VenueForm.tsx`, `app/(auth)/create-profile.tsx`, `app/(app)/edit-profile.tsx`, `app/(app)/member/[uid].tsx`, `app/(app)/(attender)/profile.tsx`, `app/(app)/create-event.tsx`, `app/(app)/event/[id].tsx`, `app/(app)/(hoster)/venue.tsx`, `app/(app)/chat/[id].tsx`, `functions/src/onNewDirectMessage.ts`.

---

# PHASE 1 — Foundation

### Task 1: Dependencies and the `MediaAsset` type

**Files:**
- Modify: `thirdspace-app/package.json` (via `npx expo install`)
- Modify: `thirdspace-app/types/models.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `MediaType`, `MediaAsset` exported from `types/models.ts`. Every later task imports these.

- [ ] **Step 1: Install the three Expo packages**

Run from `thirdspace-app/`:

```bash
npx expo install expo-video expo-video-thumbnails expo-image-manipulator
```

All three are bundled in Expo Go. Do **not** add anything to `app.json` `plugins` — none of these needs a config plugin for our usage (we use no background playback and no picture-in-picture).

- [ ] **Step 2: Add the media types to `types/models.ts`**

Append after the `Borough` type (around line 33), before `interface Venue`:

```ts
// ── Media ─────────────────────────────────────────────────────────────────
export type MediaType = 'image' | 'video'

/**
 * One uploaded asset. `thumbURL` is ALWAYS populated so every render site draws
 * exactly one thing and adds a play badge only when `type === 'video'`:
 *   - image  -> thumbURL === url
 *   - video  -> thumbURL is a generated poster frame
 *   - video whose poster generation failed on device -> thumbURL === ''
 * MediaThumb renders an ink tile with a play badge for that last case. There is
 * deliberately no "processing" state: uploads are synchronous from the client.
 */
export interface MediaAsset {
  type: MediaType
  url: string
  thumbURL: string
  width: number
  height: number
  /** Videos only. Milliseconds. */
  durationMs?: number
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean (nothing consumes the types yet).

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json types/models.ts
git commit -m "feat: add media dependencies and the MediaAsset descriptor"
```

---

### Task 2: `utils/media.ts` — pure decisions

**Files:**
- Create: `thirdspace-app/utils/media.ts`
- Test: `thirdspace-app/__tests__/utils/media.test.ts`

**Interfaces:**
- Consumes: `MediaAsset`, `MediaType` from `types/models.ts` (Task 1).
- Produces:
  - `type MediaSlot` — discriminated union, 5 variants
  - `mediaPath(slot: MediaSlot): string`
  - `thumbPath(slot: MediaSlot): string`
  - `presetFor(slot: MediaSlot): CompressionPreset` where `CompressionPreset = { maxEdge: number; quality: number }`
  - `THUMB_PRESET: CompressionPreset`
  - `type LimitResult = 'ok' | 'too-large' | 'too-long'`
  - `withinLimits(bytes: number, durationMs: number | undefined, type: MediaType): LimitResult`
  - `limitMessage(result: LimitResult, type: MediaType): string`
  - `coerceLegacyVibe(value: unknown): MediaAsset[]`
  - `mediaPreviewLabel(media?: MediaAsset | null): string`
  - `IMAGE_MAX_BYTES`, `VIDEO_MAX_BYTES`, `VIDEO_MAX_MS`

- [ ] **Step 1: Write the failing test**

Create `__tests__/utils/media.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/utils/media.test.ts`
Expected: FAIL — `Cannot find module '../../utils/media'`.

- [ ] **Step 3: Write the implementation**

Create `utils/media.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/utils/media.test.ts`
Expected: PASS, 20 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add utils/media.ts __tests__/utils/media.test.ts
git commit -m "feat: add pure media helpers for paths, presets and limits"
```

---

### Task 3: `services/media.ts` — the only module touching Storage

**Files:**
- Create: `thirdspace-app/services/media.ts`
- Test: `thirdspace-app/__tests__/services/media.test.ts`

**Interfaces:**
- Consumes: everything from `utils/media.ts` (Task 2); `storage` from `firebase/config`.
- Produces:
  - `interface PickedMedia { uri: string; type: MediaType; width: number; height: number; durationMs?: number; fileSize?: number }`
  - `pickMedia(opts: { allowVideo: boolean; aspect?: [number, number] }): Promise<PickedMedia | null>`
  - `uploadMedia(slot: MediaSlot, picked: PickedMedia, onProgress?: (fraction: number) => void): Promise<MediaAsset>`
  - `deleteMedia(asset: MediaAsset): Promise<void>`
  - `class MediaLimitError extends Error` with `.result: LimitResult`

- [ ] **Step 1: Write the failing test**

Create `__tests__/services/media.test.ts`:

```ts
import { pickMedia, uploadMedia, deleteMedia, MediaLimitError } from '../../services/media'
import * as ImagePicker from 'expo-image-picker'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { ImageManipulator } from 'expo-image-manipulator'
import { uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { IMAGE_MAX_BYTES, VIDEO_MAX_BYTES } from '../../utils/media'

jest.mock('../../firebase/config', () => ({ storage: {} }))
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
jest.mock('expo-video-thumbnails', () => ({ getThumbnailAsync: jest.fn() }))
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: { manipulate: jest.fn() },
}))
jest.mock('firebase/storage', () => ({
  ref: jest.fn((_s, path) => ({ path })),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
}))

/** Minimal stand-in for the resumable UploadTask: thenable + an `on` subscription. */
function fakeTask(totalBytes: number) {
  const task: Record<string, unknown> = {
    snapshot: { ref: { path: 'p' } },
    on: jest.fn((_event: string, next: (s: { bytesTransferred: number; totalBytes: number }) => void) => {
      next({ bytesTransferred: totalBytes / 2, totalBytes })
      next({ bytesTransferred: totalBytes, totalBytes })
    }),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve({ ref: { path: 'p' } })),
  }
  return task
}

function mockBlob(size: number, type: string) {
  ;(global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({
    blob: async () => ({ size, type }),
  })
}

function mockManipulator(uri: string, width: number, height: number) {
  ;(ImageManipulator.manipulate as jest.Mock).mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    renderAsync: jest.fn().mockResolvedValue({
      saveAsync: jest.fn().mockResolvedValue({ uri, width, height }),
    }),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(getDownloadURL as jest.Mock).mockResolvedValue('https://dl/x')
})

describe('pickMedia', () => {
  it('returns null when the library permission is denied', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    expect(await pickMedia({ allowVideo: true })).toBeNull()
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('returns null when the user cancels', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true })
    expect(await pickMedia({ allowVideo: true })).toBeNull()
  })

  it('offers videos and caps their duration at the picker when video is allowed', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://v', type: 'video', width: 720, height: 1280, duration: 4000, fileSize: 900 }],
    })
    const picked = await pickMedia({ allowVideo: true })
    expect(picked).toEqual({ uri: 'file://v', type: 'video', width: 720, height: 1280, durationMs: 4000, fileSize: 900 })
    const opts = (ImagePicker.launchImageLibraryAsync as jest.Mock).mock.calls[0][0]
    expect(opts.mediaTypes).toEqual(['images', 'videos'])
    expect(opts.videoMaxDuration).toBe(60)
  })

  it('offers images only when video is not allowed', async () => {
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file://i', type: 'image', width: 100, height: 100 }],
    })
    await pickMedia({ allowVideo: false })
    expect((ImagePicker.launchImageLibraryAsync as jest.Mock).mock.calls[0][0].mediaTypes).toEqual(['images'])
  })
})

describe('uploadMedia — images', () => {
  it('compresses, uploads one object, and makes thumbURL the image itself', async () => {
    mockManipulator('file://small', 800, 600)
    mockBlob(1000, 'image/jpeg')
    ;(uploadBytesResumable as jest.Mock).mockReturnValue(fakeTask(1000))

    const asset = await uploadMedia(
      { kind: 'vibe', uid: 'u1', index: 0 },
      { uri: 'file://big', type: 'image', width: 4000, height: 3000 }
    )

    expect(uploadBytesResumable).toHaveBeenCalledTimes(1)
    expect(asset).toEqual({
      type: 'image', url: 'https://dl/x', thumbURL: 'https://dl/x', width: 800, height: 600,
    })
    expect(VideoThumbnails.getThumbnailAsync).not.toHaveBeenCalled()
  })

  it('reports progress as a 0-1 fraction', async () => {
    mockManipulator('file://small', 10, 10)
    mockBlob(1000, 'image/jpeg')
    ;(uploadBytesResumable as jest.Mock).mockReturnValue(fakeTask(1000))
    const onProgress = jest.fn()

    await uploadMedia({ kind: 'avatar', uid: 'u1' }, { uri: 'file://a', type: 'image', width: 1, height: 1 }, onProgress)

    expect(onProgress).toHaveBeenCalledWith(0.5)
    expect(onProgress).toHaveBeenCalledWith(1)
  })

  it('rejects an oversized image before any upload call', async () => {
    mockManipulator('file://small', 10, 10)
    mockBlob(IMAGE_MAX_BYTES, 'image/jpeg')

    await expect(
      uploadMedia({ kind: 'avatar', uid: 'u1' }, { uri: 'file://a', type: 'image', width: 1, height: 1 })
    ).rejects.toBeInstanceOf(MediaLimitError)
    expect(uploadBytesResumable).not.toHaveBeenCalled()
  })
})

describe('uploadMedia — video', () => {
  it('uploads the clip and its poster, and never compresses the clip', async () => {
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockResolvedValue({ uri: 'file://poster', width: 640, height: 360 })
    mockManipulator('file://poster-small', 640, 360)
    mockBlob(2000, 'video/mp4')
    ;(uploadBytesResumable as jest.Mock).mockReturnValue(fakeTask(2000))

    const asset = await uploadMedia(
      { kind: 'chat', authorUid: 'a', threadId: 't', messageId: 'm' },
      { uri: 'file://clip', type: 'video', width: 1080, height: 1920, durationMs: 4000, fileSize: 2000 }
    )

    expect(uploadBytesResumable).toHaveBeenCalledTimes(2)
    expect(asset.type).toBe('video')
    expect(asset.durationMs).toBe(4000)
    expect(asset.width).toBe(1080)
    expect(asset.thumbURL).toBe('https://dl/x')
  })

  it('still uploads the clip with an empty thumbURL when poster generation fails', async () => {
    ;(VideoThumbnails.getThumbnailAsync as jest.Mock).mockRejectedValue(new Error('no frame'))
    mockBlob(2000, 'video/mp4')
    ;(uploadBytesResumable as jest.Mock).mockReturnValue(fakeTask(2000))

    const asset = await uploadMedia(
      { kind: 'venue', uid: 'v', index: 1 },
      { uri: 'file://clip', type: 'video', width: 100, height: 100, durationMs: 1000, fileSize: 2000 }
    )

    expect(uploadBytesResumable).toHaveBeenCalledTimes(1)
    expect(asset.thumbURL).toBe('')
  })

  it('rejects a too-long clip from the asset metadata, without materialising the file', async () => {
    await expect(
      uploadMedia(
        { kind: 'venue', uid: 'v', index: 0 },
        { uri: 'file://clip', type: 'video', width: 1, height: 1, durationMs: 61_000, fileSize: 100 }
      )
    ).rejects.toMatchObject({ result: 'too-long' })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(uploadBytesResumable).not.toHaveBeenCalled()
  })

  it('rejects an oversized clip from fileSize, without materialising the file', async () => {
    await expect(
      uploadMedia(
        { kind: 'venue', uid: 'v', index: 0 },
        { uri: 'file://clip', type: 'video', width: 1, height: 1, durationMs: 1000, fileSize: VIDEO_MAX_BYTES }
      )
    ).rejects.toMatchObject({ result: 'too-large' })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})

describe('deleteMedia', () => {
  it('deletes both the asset and its poster', async () => {
    ;(deleteObject as jest.Mock).mockResolvedValue(undefined)
    await deleteMedia({ type: 'video', url: 'https://dl/a', thumbURL: 'https://dl/b', width: 1, height: 1 })
    expect(deleteObject).toHaveBeenCalledTimes(2)
  })

  it('skips the poster when it is the image itself, so one object is not deleted twice', async () => {
    ;(deleteObject as jest.Mock).mockResolvedValue(undefined)
    await deleteMedia({ type: 'image', url: 'https://dl/a', thumbURL: 'https://dl/a', width: 1, height: 1 })
    expect(deleteObject).toHaveBeenCalledTimes(1)
  })

  it('never throws — failing to delete something already gone is not a failure', async () => {
    ;(deleteObject as jest.Mock).mockRejectedValue(new Error('not found'))
    await expect(
      deleteMedia({ type: 'image', url: 'https://dl/a', thumbURL: 'https://dl/a', width: 1, height: 1 })
    ).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/services/media.test.ts`
Expected: FAIL — `Cannot find module '../../services/media'`.

- [ ] **Step 3: Write the implementation**

Create `services/media.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/services/media.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Typecheck and commit**

```bash
npx tsc --noEmit
git add services/media.ts __tests__/services/media.test.ts
git commit -m "feat: add the media upload service with resumable uploads and caps"
```

---

### Task 4: `storage.rules` and its emulator tests

**Files:**
- Modify: `thirdspace-app/storage.rules` (full replacement)
- Create: `thirdspace-app/__tests__/rules/storage.rules.test.ts`
- Modify: `thirdspace-app/package.json` (the `test:rules` script)

**Interfaces:**
- Consumes: the path shapes produced by `mediaPath`/`thumbPath` (Task 2). **These must agree exactly** — a path the rules do not recognise is a permission-denied at runtime.
- Produces: deployable Storage rules.

- [ ] **Step 1: Write the failing test**

Create `__tests__/rules/storage.rules.test.ts`:

```ts
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage'
import { readFileSync } from 'fs'

let env: RulesTestEnvironment

/** A byte payload of an exact size, so the caps can be probed on both sides. */
function bytes(size: number): Uint8Array {
  return new Uint8Array(size)
}

const IMAGE = { contentType: 'image/jpeg' }
const VIDEO = { contentType: 'video/mp4' }

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'thirdspace-storage-rules-test',
    storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  })
})
afterAll(async () => env.cleanup())
beforeEach(async () => env.clearStorage())

test('a signed-in member can read another member profile photo', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE)
  })
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(getBytes(ref(me, 'profilePhotos/other/avatar.jpg')))
})

test('an anonymous visitor can read nothing', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE)
  })
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), 'profilePhotos/other/avatar.jpg')))
})

test('a member writes their own avatar but not somebody else\'s', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/avatar.jpg'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/other/avatar.jpg'), bytes(10), IMAGE))
})

test('the avatar slot refuses video, because an avatar is always an image', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/avatar.jpg'), bytes(10), VIDEO))
})

test('a vibe slot accepts both an image and a video', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0'), bytes(10), IMAGE))
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe2'), bytes(10), VIDEO))
})

test('a vibe poster must be an image, never a video', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0_thumb'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe0_thumb'), bytes(10), VIDEO))
})

test('the prefix is not an open bucket — only the named slots are writable', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe9'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/anything.zip'), bytes(10), IMAGE))
})

test('the image cap is a strict inequality: one byte under passes, the ceiling itself fails', async () => {
  const me = env.authenticatedContext('me').storage()
  const CAP = 5 * 1024 * 1024
  await assertSucceeds(uploadBytes(ref(me, 'profilePhotos/me/vibe0'), bytes(CAP - 1), IMAGE))
  await assertFails(uploadBytes(ref(me, 'profilePhotos/me/vibe1'), bytes(CAP), IMAGE))
})

test('a hoster writes a cover under their own uid, and nobody else can', async () => {
  const host = env.authenticatedContext('host').storage()
  const other = env.authenticatedContext('other').storage()
  await assertSucceeds(uploadBytes(ref(host, 'eventCovers/host/e1/cover'), bytes(10), VIDEO))
  await assertSucceeds(uploadBytes(ref(host, 'eventCovers/host/e1/cover_thumb'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(other, 'eventCovers/host/e1/cover'), bytes(10), IMAGE))
})

test('venue slots are bounded to 0-5', async () => {
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(uploadBytes(ref(me, 'venuePhotos/me/5'), bytes(10), IMAGE))
  await assertFails(uploadBytes(ref(me, 'venuePhotos/me/6'), bytes(10), IMAGE))
})

test('chat media is writable only by its author', async () => {
  const me = env.authenticatedContext('me').storage()
  const other = env.authenticatedContext('other').storage()
  await assertSucceeds(uploadBytes(ref(me, 'chatMedia/me/t1/msg1'), bytes(10), VIDEO))
  await assertFails(uploadBytes(ref(other, 'chatMedia/me/t1/msg1'), bytes(10), IMAGE))
})

test('chat media is READABLE by any signed-in member — this is the known limitation', async () => {
  // Storage rules cannot get() a Firestore document, so a DM attachment cannot be
  // gated on conversation membership. It is protected by an unguessable download
  // token, not by this rule. Asserted so the trade-off is visible, not accidental.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'chatMedia/someone/t1/msg1'), bytes(10), IMAGE)
  })
  const stranger = env.authenticatedContext('stranger').storage()
  await assertSucceeds(getBytes(ref(stranger, 'chatMedia/someone/t1/msg1')))
})

test('delete is allowed for the owner without a contentType on the request', async () => {
  // On delete there is no request.resource. If create/update and delete were not
  // split, validMedia() would raise an evaluation error rather than returning false.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/me/vibe0'), bytes(10), IMAGE)
  })
  const me = env.authenticatedContext('me').storage()
  await assertSucceeds(deleteObject(ref(me, 'profilePhotos/me/vibe0')))
})

test('delete is refused for a non-owner', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await uploadBytes(ref(ctx.storage(), 'profilePhotos/me/vibe0'), bytes(10), IMAGE)
  })
  const other = env.authenticatedContext('other').storage()
  await assertFails(deleteObject(ref(other, 'profilePhotos/me/vibe0')))
})
```

- [ ] **Step 2: Widen the rules test script**

In `thirdspace-app/package.json`, change the `test:rules` script:

```json
"test:rules": "npx firebase-tools emulators:exec --only firestore,storage \"jest --config jest.rules.config.js\""
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:rules`
Expected: FAIL — the current `storage.rules` has no `vibe`, `eventCovers`, `venuePhotos` or `chatMedia` matches, so most uploads are denied.

(If Java or the Firebase CLI is unavailable in your environment, note that and continue; this suite is the one part of the plan that needs the emulator.)

- [ ] **Step 4: Replace `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    function signedIn()     { return request.auth != null; }
    function ownedBy(uid)   { return signedIn() && request.auth.uid == uid; }
    function isImage()      { return request.resource.contentType.matches('image/.*'); }
    function isVideo()      { return request.resource.contentType.matches('video/.*'); }
    function imageUnder(mb) { return isImage() && request.resource.size < mb * 1024 * 1024; }

    // Video duration is NOT checkable here — rules see size and contentType, never
    // media metadata. The 60s cap is a product constraint enforced client-side; this
    // size ceiling is the only real backstop.
    function validMedia()   { return imageUnder(5)
                                || (isVideo() && request.resource.size < 50 * 1024 * 1024); }

    // Reads are signedIn() everywhere, chatMedia included. A DM attachment is
    // protected by the unguessable token in its download URL, not by a membership
    // check, because Storage rules cannot get() a Firestore document. Same posture
    // profiles/{uid} already takes. Accepted knowingly; see the design doc.
    //
    // create/update is split from delete throughout: on a delete there is no
    // request.resource, so validMedia() would raise an evaluation error rather than
    // returning false. Exactly the split the socials rule in firestore.rules makes.
    //
    // The FILENAME is matched, not just the prefix. matches() is a whole-string
    // match, so 'vibe[0-2]' rejects 'vibe0_thumb' and the clauses stay disjoint.
    // Without this, ownedBy(uid) alone would make every member's prefix unbounded
    // free hosting — which on the Blaze plan is your bill.

    match /profilePhotos/{uid}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(uid) && (
        (file == 'avatar.jpg'            && imageUnder(5)) ||
        (file.matches('vibe[0-2]')       && validMedia())  ||
        (file.matches('vibe[0-2]_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(uid);
    }

    match /eventCovers/{hosterUid}/{eventId}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(hosterUid) && (
        (file == 'cover'       && validMedia()) ||
        (file == 'cover_thumb' && imageUnder(5))
      );
      allow delete: if ownedBy(hosterUid);
    }

    match /venuePhotos/{uid}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(uid) && (
        (file.matches('[0-5]')       && validMedia()) ||
        (file.matches('[0-5]_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(uid);
    }

    // Leans on Firestore auto-ids being alphanumeric only (20 chars from a 62-symbol
    // alphabet), which is what keeps [A-Za-z0-9]+ disjoint from the _thumb variant.
    // If message ids ever stop being auto-generated, revisit this pattern.
    match /chatMedia/{authorUid}/{threadId}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(authorUid) && (
        (file.matches('[A-Za-z0-9]+')       && validMedia()) ||
        (file.matches('[A-Za-z0-9]+_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(authorUid);
    }
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test:rules`
Expected: PASS — the existing Firestore rules suite (31 tests) plus 14 new Storage tests.

- [ ] **Step 6: Commit**

```bash
git add storage.rules __tests__/rules/storage.rules.test.ts package.json
git commit -m "feat: add Storage rules for all four media surfaces, with emulator tests"
```

---

### Task 5: `MediaThumb`

**Files:**
- Create: `thirdspace-app/components/MediaThumb.tsx`
- Test: `thirdspace-app/__tests__/components/MediaThumb.test.tsx`

**Interfaces:**
- Consumes: `MediaAsset` (Task 1); tokens from `constants/design.ts`.
- Produces: `MediaThumb` with props `{ media: MediaAsset; style?: StyleProp<ViewStyle>; onPress?: () => void }`, and exported `formatDuration(ms: number): string`.
- testIDs later tasks assert on: `media-thumb`, `media-thumb-image`, `media-thumb-fallback`, `media-thumb-play`, `media-thumb-duration`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/MediaThumb.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaThumb, formatDuration } from '../../components/MediaThumb'
import { MediaAsset } from '../../types/models'

const image: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 100, height: 100 }
const video: MediaAsset = { type: 'video', url: 'https://a/v.mp4', thumbURL: 'https://a/p.jpg', width: 100, height: 100, durationMs: 74_000 }
const posterless: MediaAsset = { ...video, thumbURL: '' }

describe('formatDuration', () => {
  it('formats as m:ss with a zero-padded seconds field', () => {
    expect(formatDuration(74_000)).toBe('1:14')
    expect(formatDuration(9_000)).toBe('0:09')
    expect(formatDuration(0)).toBe('0:00')
  })
})

describe('MediaThumb', () => {
  it('renders the poster and no play badge for an image', () => {
    const { getByTestId, queryByTestId } = render(<MediaThumb media={image} />)
    expect(getByTestId('media-thumb-image').props.source).toEqual({ uri: 'https://a/i.jpg' })
    expect(queryByTestId('media-thumb-play')).toBeNull()
  })

  it('renders the poster plus a play badge and duration for a video', () => {
    const { getByTestId } = render(<MediaThumb media={video} />)
    expect(getByTestId('media-thumb-image').props.source).toEqual({ uri: 'https://a/p.jpg' })
    expect(getByTestId('media-thumb-play')).toBeTruthy()
    expect(getByTestId('media-thumb-duration').props.children).toBe('1:14')
  })

  it('falls back to a flat tile when poster generation failed, and still shows it is a video', () => {
    const { getByTestId, queryByTestId } = render(<MediaThumb media={posterless} />)
    expect(queryByTestId('media-thumb-image')).toBeNull()
    expect(getByTestId('media-thumb-fallback')).toBeTruthy()
    expect(getByTestId('media-thumb-play')).toBeTruthy()
  })

  it('omits the duration chip when the video has no recorded duration', () => {
    const { queryByTestId } = render(<MediaThumb media={{ ...video, durationMs: undefined }} />)
    expect(queryByTestId('media-thumb-duration')).toBeNull()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<MediaThumb media={image} onPress={onPress} />)
    fireEvent.press(getByTestId('media-thumb'))
    expect(onPress).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/MediaThumb.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/MediaThumb.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/MediaThumb.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Verify no literal hex was introduced, then commit**

```bash
npx jest __tests__/constants/tokens.test.ts
npx tsc --noEmit
git add components/MediaThumb.tsx __tests__/components/MediaThumb.test.tsx
git commit -m "feat: add MediaThumb, the single media render path"
```

---

### Task 6: `MediaViewer`

**Files:**
- Create: `thirdspace-app/components/MediaViewer.tsx`
- Test: `thirdspace-app/__tests__/components/MediaViewer.test.tsx`

**Interfaces:**
- Consumes: `MediaAsset` (Task 1); `expo-video` (Task 1).
- Produces: `MediaViewer` with props `{ media: MediaAsset | null; onClose: () => void }`. Renders nothing when `media` is null.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/MediaViewer.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaViewer } from '../../components/MediaViewer'
import { MediaAsset } from '../../types/models'

jest.mock('expo-video', () => {
  const React2 = require('react')
  const { View } = require('react-native')
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn() })),
    VideoView: (props: Record<string, unknown>) => React2.createElement(View, { testID: 'video-view', ...props }),
  }
})

const image: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }
const video: MediaAsset = { type: 'video', url: 'https://a/v.mp4', thumbURL: 'https://a/p.jpg', width: 10, height: 10 }

describe('MediaViewer', () => {
  it('renders nothing when there is no media', () => {
    const { queryByTestId } = render(<MediaViewer media={null} onClose={() => {}} />)
    expect(queryByTestId('media-viewer')).toBeNull()
  })

  it('renders the full asset, not the poster, for an image', () => {
    const { getByTestId } = render(<MediaViewer media={image} onClose={() => {}} />)
    expect(getByTestId('media-viewer-image').props.source).toEqual({ uri: 'https://a/i.jpg' })
  })

  it('renders a video view for a clip', () => {
    const { getByTestId, queryByTestId } = render(<MediaViewer media={video} onClose={() => {}} />)
    expect(getByTestId('video-view')).toBeTruthy()
    expect(queryByTestId('media-viewer-image')).toBeNull()
  })

  it('closes when the backdrop is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(<MediaViewer media={image} onClose={onClose} />)
    fireEvent.press(getByTestId('media-viewer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/MediaViewer.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/MediaViewer.tsx`:

```tsx
import React from 'react'
import { Modal, View, Image, Pressable, StyleSheet } from 'react-native'
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/MediaViewer.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add components/MediaViewer.tsx __tests__/components/MediaViewer.test.tsx
git commit -m "feat: add the fullscreen media viewer"
```

---

### Task 7: `MediaSlotPicker`

**Files:**
- Create: `thirdspace-app/components/MediaSlotPicker.tsx`
- Test: `thirdspace-app/__tests__/components/MediaSlotPicker.test.tsx`

**Interfaces:**
- Consumes: `MediaThumb` (Task 5), `MediaAsset` (Task 1).
- Produces: `MediaSlotPicker` with props
  `{ media: MediaAsset | null; progress?: number | null; label?: string; style?: StyleProp<ViewStyle>; onPick: () => void; onRemove: () => void }`.
  `progress` is `null`/absent when idle and `0..1` while uploading.
- testIDs: `slot-picker`, `slot-picker-empty`, `slot-picker-remove`, `slot-picker-progress`, `slot-picker-progress-fill`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/components/MediaSlotPicker.test.tsx`:

```tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaSlotPicker } from '../../components/MediaSlotPicker'
import { MediaAsset } from '../../types/models'

const asset: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }

describe('MediaSlotPicker', () => {
  it('shows an empty affordance and no remove button when the slot is empty', () => {
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={null} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('slot-picker-empty')).toBeTruthy()
    expect(queryByTestId('slot-picker-remove')).toBeNull()
  })

  it('calls onPick when an empty slot is tapped', () => {
    const onPick = jest.fn()
    const { getByTestId } = render(<MediaSlotPicker media={null} onPick={onPick} onRemove={() => {}} />)
    fireEvent.press(getByTestId('slot-picker'))
    expect(onPick).toHaveBeenCalled()
  })

  it('shows the thumb and a remove button once filled', () => {
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={asset} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('media-thumb-image')).toBeTruthy()
    expect(getByTestId('slot-picker-remove')).toBeTruthy()
    expect(queryByTestId('slot-picker-empty')).toBeNull()
  })

  it('calls onRemove when the remove button is tapped', () => {
    const onRemove = jest.fn()
    const { getByTestId } = render(<MediaSlotPicker media={asset} onPick={() => {}} onRemove={onRemove} />)
    fireEvent.press(getByTestId('slot-picker-remove'))
    expect(onRemove).toHaveBeenCalled()
  })

  it('renders a determinate progress bar while uploading', () => {
    const { getByTestId } = render(
      <MediaSlotPicker media={null} progress={0.4} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('slot-picker-progress-fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '40%' })])
    )
  })

  it('does not let a slot be re-picked or removed mid-upload', () => {
    const onPick = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={asset} progress={0.4} onPick={onPick} onRemove={() => {}} />
    )
    fireEvent.press(getByTestId('slot-picker'))
    expect(onPick).not.toHaveBeenCalled()
    expect(queryByTestId('slot-picker-remove')).toBeNull()
  })

  it('shows no progress bar when idle', () => {
    const { queryByTestId } = render(<MediaSlotPicker media={asset} onPick={() => {}} onRemove={() => {}} />)
    expect(queryByTestId('slot-picker-progress')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/components/MediaSlotPicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `components/MediaSlotPicker.tsx`:

```tsx
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/components/MediaSlotPicker.test.tsx`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
npx jest __tests__/constants/tokens.test.ts
npx tsc --noEmit
git add components/MediaSlotPicker.tsx __tests__/components/MediaSlotPicker.test.tsx
git commit -m "feat: add MediaSlotPicker with determinate upload progress"
```

---

### Task 8: Migrate the avatar onto `services/media.ts` and stop swallowing failures

**Files:**
- Modify: `thirdspace-app/services/photos.ts` (remove `pickImage`, `uploadProfilePhoto`, `photoPath`, `PhotoKind`)
- Modify: `thirdspace-app/app/(auth)/create-profile.tsx:13,48,62`
- Modify: `thirdspace-app/app/(app)/edit-profile.tsx:17,116,133`
- Modify: `thirdspace-app/__tests__/services/photos.test.ts` (drop the `photoPath` describe block)

**Interfaces:**
- Consumes: `pickMedia`, `uploadMedia`, `MediaLimitError` (Task 3); `limitMessage` (Task 2).
- Produces: `services/photos.ts` reduced to `CaptureKind` and `captureImage` only.

- [ ] **Step 1: Reduce `services/photos.ts` to the ID-verification capture**

Replace the whole file with:

```ts
import * as ImagePicker from 'expo-image-picker'

export type CaptureKind = 'id' | 'selfie'

/**
 * Local-only capture for ID verification: camera when granted, otherwise the photo
 * library, otherwise null. The returned URI is NEVER uploaded — that is the entire
 * reason this stayed out of services/media.ts, which exists to upload things.
 */
export async function captureImage(kind: CaptureKind): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: kind === 'selfie' ? [1, 1] : [3, 2],
    quality: 0.7,
  }
  const cam = await ImagePicker.requestCameraPermissionsAsync()
  if (cam.granted) {
    const result = await ImagePicker.launchCameraAsync(options)
    return result.canceled ? null : result.assets[0].uri
  }
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!lib.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync(options)
  return result.canceled ? null : result.assets[0].uri
}
```

- [ ] **Step 2: Trim the obsolete test**

In `__tests__/services/photos.test.ts`, delete the `import { photoPath, captureImage }` line's `photoPath` binding and the entire `describe('photoPath', ...)` block (lines 13-18), leaving:

```ts
import { captureImage } from '../../services/photos'
```

Also drop `MediaTypeOptions` from the `expo-image-picker` mock — the file no longer references it.

- [ ] **Step 3: Run the trimmed test to confirm it still passes**

Run: `npx jest __tests__/services/photos.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 4: Update `app/(auth)/create-profile.tsx`**

Change the import on line 13:

```tsx
import { pickMedia, uploadMedia, MediaLimitError } from '../../services/media'
import { limitMessage } from '../../utils/media'
```

Replace the `handlePickPhoto` body (around line 48) so it stores the picked asset rather than a bare URI:

```tsx
  const handlePickPhoto = async () => {
    const picked = await pickMedia({ allowVideo: false, aspect: [1, 1] })
    if (picked) setPickedAvatar(picked)
  }
```

Add the state beside the existing photo state:

```tsx
  const [pickedAvatar, setPickedAvatar] = useState<PickedMedia | null>(null)
```

and import the type: `import type { PickedMedia } from '../../services/media'`.

Replace the silent upload (line 62) with one that reports:

```tsx
      let photoURL: string | null = null
      if (pickedAvatar) {
        try {
          const asset = await uploadMedia({ kind: 'avatar', uid: user.uid }, pickedAvatar)
          photoURL = asset.url
        } catch (e: unknown) {
          // A failed avatar must not block profile creation — but it must never be
          // silent either. The old `catch { photoURL = null }` told the user nothing.
          setError(e instanceof MediaLimitError
            ? limitMessage(e.result, pickedAvatar.type)
            : "Couldn't upload your photo. Your profile was saved without it.")
        }
      }
```

Wherever the screen previously rendered `photoUri`, render `pickedAvatar?.uri ?? null` instead.

- [ ] **Step 5: Update `app/(app)/edit-profile.tsx`**

Change the import on line 17 the same way, replace `handlePickPhoto` (line 116):

```tsx
  const handlePickPhoto = async () => {
    const picked = await pickMedia({ allowVideo: false, aspect: [1, 1] })
    if (picked) setPickedAvatar(picked)
  }
```

and replace line 133:

```tsx
      let photoURL = profile?.photoURL ?? null
      if (pickedAvatar) {
        try {
          const asset = await uploadMedia({ kind: 'avatar', uid: user.uid }, pickedAvatar)
          photoURL = asset.url
        } catch (e: unknown) {
          setError(e instanceof MediaLimitError
            ? limitMessage(e.result, pickedAvatar.type)
            : "Couldn't upload your photo. Your other changes were saved.")
        }
      }
```

Replace the `photoUri` / `newPhotoPicked` state pair with the single `pickedAvatar` state, and render `pickedAvatar?.uri ?? profile?.photoURL ?? null` in the avatar preview.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: all suites pass; no type errors.

- [ ] **Step 7: Commit**

```bash
git add services/photos.ts __tests__/services/photos.test.ts "app/(auth)/create-profile.tsx" "app/(app)/edit-profile.tsx"
git commit -m "refactor: move avatar uploads onto the media service and surface failures"
```

---

# PHASE 2 — Profile vibe media

### Task 9: Vibe grid in `edit-profile`

**Files:**
- Modify: `thirdspace-app/types/models.ts` (`Profile.vibePhotos`, `CreateProfileInput.vibePhotos`)
- Modify: `thirdspace-app/app/(app)/edit-profile.tsx`
- Modify: `thirdspace-app/services/profiles.ts` (accept `vibePhotos` in the update payload)

**Interfaces:**
- Consumes: `MediaSlotPicker` (Task 7), `pickMedia`/`uploadMedia`/`deleteMedia` (Task 3), `coerceLegacyVibe`/`limitMessage` (Task 2).
- Produces: `profiles/{uid}.vibePhotos` written as `MediaAsset[]`.

- [ ] **Step 1: Retype the model**

In `types/models.ts`, change both occurrences:

```ts
export interface Profile {
  displayName: string
  photoURL: string | null
  /**
   * Was `string[]`, and was never written by any code path — every stored value is
   * `[]`, so this retype needed no backfill. Readers still run coerceLegacyVibe()
   * because assuming production data matches your assumptions is how you find out
   * it does not.
   */
  vibePhotos: MediaAsset[]
  // ...rest unchanged
}
```

and in `CreateProfileInput`:

```ts
  vibePhotos: MediaAsset[]
```

- [ ] **Step 2: Add the grid state to `edit-profile.tsx`**

```tsx
const VIBE_SLOTS = [0, 1, 2] as const

  const [vibes, setVibes] = useState<(MediaAsset | null)[]>([null, null, null])
  const [vibeProgress, setVibeProgress] = useState<(number | null)[]>([null, null, null])

  // Seed from the loaded profile exactly once, coercing anything legacy.
  useEffect(() => {
    if (!profile) return
    const loaded = coerceLegacyVibe(profile.vibePhotos)
    setVibes([loaded[0] ?? null, loaded[1] ?? null, loaded[2] ?? null])
  }, [profile])

  const setAt = <T,>(list: T[], index: number, value: T): T[] =>
    list.map((entry, i) => (i === index ? value : entry))

  const handlePickVibe = async (index: number) => {
    const picked = await pickMedia({ allowVideo: true })
    if (!picked || !user) return
    setVibeProgress((p) => setAt(p, index, 0))
    try {
      const asset = await uploadMedia(
        { kind: 'vibe', uid: user.uid, index },
        picked,
        (fraction) => setVibeProgress((p) => setAt(p, index, fraction))
      )
      setVibes((v) => setAt(v, index, asset))
    } catch (e: unknown) {
      setError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that. Check your connection and try again.")
    } finally {
      setVibeProgress((p) => setAt(p, index, null))
    }
  }

  const handleRemoveVibe = (index: number) => {
    const existing = vibes[index]
    setVibes((v) => setAt(v, index, null))
    // Fire-and-forget: deleteMedia never throws, and the slot is already empty in the
    // UI. The write below is what actually detaches it from the profile.
    if (existing) void deleteMedia(existing)
  }
```

- [ ] **Step 3: Render the grid**

Insert above the save button:

```tsx
        <Meta role="eyebrow" style={styles.sectionLabel}>Vibe</Meta>
        <Body role="bodySm" style={styles.vibeHint}>Up to three photos or clips. Clips can be 60 seconds.</Body>
        <View style={styles.vibeGrid}>
          {VIBE_SLOTS.map((index) => (
            <MediaSlotPicker
              key={index}
              style={styles.vibeSlot}
              media={vibes[index]}
              progress={vibeProgress[index]}
              label={index === 0 ? 'Add' : undefined}
              onPick={() => handlePickVibe(index)}
              onRemove={() => handleRemoveVibe(index)}
            />
          ))}
        </View>
```

with styles:

```tsx
  vibeHint: { marginBottom: space.sm },
  vibeGrid: { flexDirection: 'row', gap: space.sm, marginBottom: space.xl },
  // 4:5 slots, three across.
  vibeSlot: { flex: 1, aspectRatio: 4 / 5 },
```

- [ ] **Step 4: Persist on save**

Add to the `updateProfile` payload in `handleSave`:

```tsx
        vibePhotos: vibes.filter((v): v is MediaAsset => v !== null),
```

- [ ] **Step 5: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green. `services/profiles.ts` may need `vibePhotos` added to its update type — if `tsc` complains, add it to the accepted partial.

- [ ] **Step 6: Commit**

```bash
git add types/models.ts services/profiles.ts "app/(app)/edit-profile.tsx"
git commit -m "feat: let members fill the three vibe slots with photos or clips"
```

---

### Task 10: Render vibe media on the profile screens

**Files:**
- Modify: `thirdspace-app/app/(app)/member/[uid].tsx:113-121`
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx`

**Interfaces:**
- Consumes: `MediaThumb` (Task 5), `MediaViewer` (Task 6), `coerceLegacyVibe` (Task 2).
- Produces: nothing new.

- [ ] **Step 1: Replace the raw `Image` map in `member/[uid].tsx`**

```tsx
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const vibes = useMemo(() => coerceLegacyVibe(profile?.vibePhotos), [profile?.vibePhotos])
```

and the render block:

```tsx
        {vibes.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Vibe</Meta>
            <View style={styles.vibeStrip}>
              {vibes.map((media, i) => (
                <MediaThumb key={i} media={media} style={styles.vibePhoto} onPress={() => setViewing(media)} />
              ))}
            </View>
          </>
        ) : null}
```

and mount the viewer once, beside the existing `</ScrollView>`:

```tsx
      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
```

Keep the existing `styles.vibePhoto` dimensions — `MediaThumb` fills whatever box it is given.

- [ ] **Step 2: Add the same strip to `(attender)/profile.tsx`**

Add these imports:

```tsx
import { MediaThumb } from '../../../components/MediaThumb'
import { MediaViewer } from '../../../components/MediaViewer'
import { coerceLegacyVibe } from '../../../utils/media'
import { MediaAsset } from '../../../types/models'
```

this state:

```tsx
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const vibes = useMemo(() => coerceLegacyVibe(profile?.vibePhotos), [profile?.vibePhotos])
```

this block wherever the profile body renders (this screen has no vibe strip today, so it is new here):

```tsx
        {vibes.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Vibe</Meta>
            <View style={styles.vibeStrip}>
              {vibes.map((media, i) => (
                <MediaThumb key={i} media={media} style={styles.vibePhoto} onPress={() => setViewing(media)} />
              ))}
            </View>
          </>
        ) : null}
```

these styles:

```tsx
  vibeStrip: { flexDirection: 'row', gap: space.sm },
  vibePhoto: { flex: 1, aspectRatio: 4 / 5 },
```

and this mount, as the last child of the screen:

```tsx
      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
```

- [ ] **Step 3: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/member/[uid].tsx" "app/(app)/(attender)/profile.tsx"
git commit -m "feat: render vibe media with play badges and a tap-to-open viewer"
```

---

# PHASE 3 — Event cover

### Task 11: `TicketCard` play badge and `EventCard` cover

**Files:**
- Modify: `thirdspace-app/types/models.ts` (`CommunityEvent.cover`)
- Modify: `thirdspace-app/components/ui/TicketCard.tsx:17,29-38`
- Modify: `thirdspace-app/components/EventCard.tsx:40-42`
- Test: `thirdspace-app/__tests__/components/ui/TicketCard.test.tsx` (add two cases)
- Test: `thirdspace-app/__tests__/components/EventCard.test.tsx` (add two cases; create if absent)

**Interfaces:**
- Consumes: `MediaAsset` (Task 1).
- Produces: `TicketCard` gains `showPlayBadge?: boolean`. **`photoUri` keeps its name and type** so the existing TicketCard tests continue to pass unchanged, and so `components/ui/` stays free of domain types — `EventCard` does the `MediaAsset` → `photoUri` mapping.

- [ ] **Step 1: Add the model field**

In `types/models.ts`, inside `CommunityEvent`, after `borough`:

```ts
  /**
   * Optional for the same reason `borough` is: every event that already exists has
   * none, and TicketCard's "No photo yet" band is a designed empty state, not a gap.
   * Set at creation only — this app has no edit-event route.
   */
  cover?: MediaAsset
```

- [ ] **Step 2: Write the failing tests**

Add to `__tests__/components/ui/TicketCard.test.tsx`:

```tsx
  it('renders no play badge for a still photo', () => {
    const { queryByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    expect(queryByTestId('ticket-play')).toBeNull()
  })

  it('renders a play badge over the media band when asked', () => {
    const { getByTestId } = render(
      <TicketCard tone="deep" photoUri="https://example.com/a.jpg" showPlayBadge day="18" month="Jul" onPress={() => {}}>
        <Text>x</Text>
      </TicketCard>
    )
    expect(getByTestId('ticket-play')).toBeTruthy()
  })
```

Add to `__tests__/components/EventCard.test.tsx`. If the file does not exist, create it with this preamble:

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { Timestamp } from 'firebase/firestore'
import { EventCard } from '../../components/EventCard'
import { CommunityEvent } from '../../types/models'

const baseEvent: CommunityEvent = {
  id: 'e1',
  title: 'Basement Tape Night',
  description: 'Bring a tape.',
  category: 'stage-time',
  startsAt: Timestamp.fromDate(new Date('2026-08-14T20:00:00Z')),
  capacity: 30,
  ageRequirement: '21+',
  venueId: 'v1',
  venueName: 'The Wallflower',
  neighborhood: 'Bushwick',
  borough: 'Brooklyn',
  registeredCount: 12,
}

describe('EventCard cover', () => {
```

then the two cases (closing the `describe` after them):

```tsx
  it('draws the placeholder band for an event with no cover', () => {
    const { getByTestId, queryByTestId } = render(<EventCard event={baseEvent} onPress={() => {}} />)
    expect(getByTestId('ticket-band')).toBeTruthy()
    expect(queryByTestId('ticket-play')).toBeNull()
  })

  it('passes a video cover poster through and asks for a play badge', () => {
    const event = {
      ...baseEvent,
      cover: { type: 'video' as const, url: 'https://a/v.mp4', thumbURL: 'https://a/p.jpg', width: 16, height: 9, durationMs: 5000 },
    }
    const { getByTestId, queryByTestId } = render(<EventCard event={event} onPress={() => {}} />)
    expect(queryByTestId('ticket-band')).toBeNull()
    expect(getByTestId('ticket-play')).toBeTruthy()
  })
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest __tests__/components/ui/TicketCard.test.tsx __tests__/components/EventCard.test.tsx`
Expected: FAIL — no `ticket-play` testID exists.

- [ ] **Step 4: Add the badge to `TicketCard`**

Add to the props interface:

```tsx
  /** Overlays a play badge on the media band. EventCard sets this for a video cover. */
  showPlayBadge?: boolean
```

Destructure it, and wrap the media block:

```tsx
      <View>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.media} />
        ) : (
          // Events without a cover get a filled, captioned band rather than a blank
          // strip, so the card reads as "a photo goes here" instead of broken.
          <View testID="ticket-band" style={[styles.media, styles.band]}>
            <Ionicons name="image-outline" size={30} color={palette.orangeLight} />
            <Meta role="eyebrow" style={styles.bandLabel}>No photo yet</Meta>
          </View>
        )}
        {showPlayBadge ? (
          <View testID="ticket-play" style={styles.play}>
            <Ionicons name="play" size={16} color={palette.cream} />
          </View>
        ) : null}
      </View>
```

and the style:

```tsx
  play: {
    position: 'absolute',
    alignSelf: 'center',
    top: MEDIA_HEIGHT / 2 - 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.ink,
  },
```

- [ ] **Step 5: Map the cover in `EventCard`**

Replace lines 40-42:

```tsx
      // The cover's poster IS the image for a photo, and a generated frame for a clip,
      // so one prop covers both. TicketCard stays free of domain types on purpose.
      photoUri={event.cover?.thumbURL || null}
      showPlayBadge={event.cover?.type === 'video'}
```

- [ ] **Step 6: Run to verify pass, then commit**

Run: `npx jest __tests__/components/ui/TicketCard.test.tsx __tests__/components/EventCard.test.tsx && npx tsc --noEmit`
Expected: PASS.

```bash
git add types/models.ts components/ui/TicketCard.tsx components/EventCard.tsx __tests__/components/ui/TicketCard.test.tsx __tests__/components/EventCard.test.tsx
git commit -m "feat: render an event cover as the ticket stub, with a play badge for clips"
```

---

### Task 12: `createEvent` takes a pre-made ref; cover field in `create-event`

**Files:**
- Modify: `thirdspace-app/services/events.ts:41-60`
- Modify: `thirdspace-app/app/(app)/create-event.tsx`
- Test: `thirdspace-app/__tests__/services/events.test.ts`

**Interfaces:**
- Consumes: `MediaSlotPicker` (Task 7), `pickMedia`/`uploadMedia`/`deleteMedia` (Task 3).
- Produces: `newEventRef(): DocumentReference` and `createEvent(eventRef, venueId, venue, input, cover?)`.

- [ ] **Step 1: Write the failing test**

Add to `__tests__/services/events.test.ts`, with these fixtures at the top of the new block:

```ts
import { newEventRef, buildEventDoc } from '../../services/events'
import { Venue, CommunityEvent } from '../../types/models'

const venue: Venue = {
  name: 'The Wallflower',
  borough: 'Brooklyn',
  neighborhood: 'Bushwick',
  description: 'A room with a piano.',
}

const input = {
  title: '  Basement Tape Night  ',
  description: 'Bring a tape.',
  category: 'stage-time' as const,
  startsAt: new Date('2026-08-14T20:00:00Z'),
  capacity: 30,
  ageRequirement: '21+' as const,
}
```

```ts
it('writes the event at the caller-supplied ref, so the cover path is known before upload', async () => {
  const ref = newEventRef()
  expect(typeof ref.id).toBe('string')
  expect(ref.id.length).toBeGreaterThan(0)
})

it('omits `cover` entirely when no cover was supplied, rather than writing undefined', async () => {
  // Firestore rejects an explicit `undefined`; the field must simply be absent.
  const written = buildEventDoc('v1', venue, input, undefined)
  expect('cover' in written).toBe(false)
})

it('includes `cover` when one was supplied', async () => {
  const cover = { type: 'image' as const, url: 'u', thumbURL: 'u', width: 1, height: 1 }
  expect(buildEventDoc('v1', venue, input, cover).cover).toEqual(cover)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/services/events.test.ts`
Expected: FAIL — `newEventRef` and `buildEventDoc` are not exported.

- [ ] **Step 3: Change `services/events.ts`**

Replace `createEvent` (lines 41-60) with:

```ts
/**
 * Mint the id BEFORE the write. The cover's storage path contains the event id
 * (`eventCovers/{hosterUid}/{eventId}/cover`), so the upload has to happen against a
 * ref we already hold — which `addDoc` cannot give us.
 */
export function newEventRef() {
  return doc(collection(db, 'events'))
}

/** Extracted so the shape can be asserted without a Firestore round-trip. */
export function buildEventDoc(venueId: string, venue: Venue, input: CreateEventInput, cover?: MediaAsset) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    startsAt: Timestamp.fromDate(input.startsAt),
    capacity: input.capacity,
    ageRequirement: input.ageRequirement,
    venueId,
    venueName: venue.name,
    neighborhood: venue.neighborhood,
    ...(venue.borough ? { borough: venue.borough } : {}),
    // Spread rather than `cover: cover` — Firestore rejects an explicit undefined,
    // and CommunityEvent.cover is optional precisely so old events have no key.
    ...(cover ? { cover } : {}),
    registeredCount: 0,
    createdAt: serverTimestamp(),
  }
}

export async function createEvent(
  eventRef: DocumentReference,
  venueId: string,
  venue: Venue,
  input: CreateEventInput,
  cover?: MediaAsset
): Promise<void> {
  await setDoc(eventRef, buildEventDoc(venueId, venue, input, cover))
  await updateDoc(doc(db, 'venues', venueId), { eventsCount: increment(1) })
}
```

Add `setDoc` and `DocumentReference` to the `firebase/firestore` import, add `MediaAsset` to the models import, and remove `addDoc` if it is now unused.

- [ ] **Step 4: Add the cover field to `create-event.tsx`**

```tsx
  const [eventRef] = useState(() => newEventRef())
  const [cover, setCover] = useState<MediaAsset | null>(null)
  const [coverProgress, setCoverProgress] = useState<number | null>(null)

  const handlePickCover = async () => {
    const picked = await pickMedia({ allowVideo: true, aspect: [16, 9] })
    if (!picked || !user) return
    setCoverProgress(0)
    try {
      const asset = await uploadMedia(
        { kind: 'eventCover', hosterUid: user.uid, eventId: eventRef.id },
        picked,
        setCoverProgress
      )
      setCover(asset)
    } catch (e: unknown) {
      setError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that cover. You can publish without one.")
    } finally {
      setCoverProgress(null)
    }
  }

  const handleRemoveCover = () => {
    const existing = cover
    setCover(null)
    if (existing) void deleteMedia(existing)
  }
```

Render above the title field:

```tsx
        <Meta role="eyebrow" style={styles.sectionLabel}>Cover</Meta>
        <MediaSlotPicker
          style={styles.cover}
          media={cover}
          progress={coverProgress}
          label="Add a photo or clip"
          onPick={handlePickCover}
          onRemove={handleRemoveCover}
        />
```

with `cover: { width: '100%', aspectRatio: 16 / 9, marginBottom: space.xl }`.

Change the submit call to pass the ref and the cover:

```tsx
      await createEvent(eventRef, user.uid, venue, input, cover ?? undefined)
```

- [ ] **Step 5: Run to verify pass, then commit**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

```bash
git add services/events.ts "app/(app)/create-event.tsx" __tests__/services/events.test.ts
git commit -m "feat: attach an optional cover when creating an event"
```

---

### Task 13: Cover on the event detail hero, and delete cleanup

**Files:**
- Modify: `thirdspace-app/app/(app)/event/[id].tsx`
- Modify: `thirdspace-app/services/events.ts` (`deleteEvent`)

**Interfaces:**
- Consumes: `MediaThumb` (Task 5), `MediaViewer` (Task 6), `deleteMedia` (Task 3).
- Produces: nothing new.

- [ ] **Step 1: Render the cover band above the ink hero**

In `event/[id].tsx`, immediately before the existing ink hero block:

```tsx
      {event.cover ? (
        <MediaThumb media={event.cover} style={styles.coverBand} onPress={() => setViewing(event.cover ?? null)} />
      ) : null}
```

with:

```tsx
  // Deliberately ABOVE the ink hero, not behind it. The hero's tear notches sit at the
  // ink/field seam at its BOTTOM edge; putting the cover on top leaves that seam — and
  // the codemap's note about those notches being painted orangeDeep — untouched.
  coverBand: { width: '100%', aspectRatio: 16 / 9, borderRadius: 0 },
```

Add `const [viewing, setViewing] = useState<MediaAsset | null>(null)` and mount `<MediaViewer media={viewing} onClose={() => setViewing(null)} />` at the end of the screen.

- [ ] **Step 2: Clean up the cover in `deleteEvent`**

At the top of `deleteEvent`, before the batched deletes:

```ts
  // Best-effort, and deliberately before the doc is gone — this is the last moment the
  // cover URL is readable. deleteMedia never throws.
  const snap = await getDoc(doc(db, 'events', eventId))
  const cover = snap.exists() ? (snap.data() as CommunityEvent).cover : undefined
  if (cover) await deleteMedia(cover)
```

Import `deleteMedia` from `./media`.

- [ ] **Step 3: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/event/[id].tsx" services/events.ts
git commit -m "feat: show the event cover on the detail hero and clean it up on delete"
```

---

# PHASE 4 — Venue gallery

### Task 14: `Venue.photos` and the gallery in `VenueForm`

**Files:**
- Modify: `thirdspace-app/types/models.ts` (`Venue.photos`)
- Modify: `thirdspace-app/components/VenueForm.tsx`

**Interfaces:**
- Consumes: `MediaSlotPicker` (Task 7), `pickMedia`/`uploadMedia`/`deleteMedia` (Task 3).
- Produces: `venues/{uid}.photos` as `MediaAsset[]`, max 6.

- [ ] **Step 1: Add the model field**

```ts
export interface Venue {
  name: string
  borough: Borough
  neighborhood: string
  description: string
  /** Up to 6. Optional: venues created before the gallery shipped have none. */
  photos?: MediaAsset[]
}
```

- [ ] **Step 2: Add gallery state to `VenueForm`**

```tsx
const VENUE_SLOTS = [0, 1, 2, 3, 4, 5] as const

  const [photos, setPhotos] = useState<(MediaAsset | null)[]>(() => {
    const seeded = initial?.photos ?? []
    return VENUE_SLOTS.map((i) => seeded[i] ?? null)
  })
  const [progress, setProgress] = useState<(number | null)[]>(VENUE_SLOTS.map(() => null))
  const [mediaError, setMediaError] = useState('')

  const setAt = <T,>(list: T[], index: number, value: T): T[] =>
    list.map((entry, i) => (i === index ? value : entry))

  const handlePick = async (index: number) => {
    const picked = await pickMedia({ allowVideo: true })
    if (!picked) return
    setMediaError('')
    setProgress((p) => setAt(p, index, 0))
    try {
      const asset = await uploadMedia(
        { kind: 'venue', uid: venueUid, index },
        picked,
        (fraction) => setProgress((p) => setAt(p, index, fraction))
      )
      setPhotos((v) => setAt(v, index, asset))
    } catch (e: unknown) {
      setMediaError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't upload that. Check your connection and try again.")
    } finally {
      setProgress((p) => setAt(p, index, null))
    }
  }

  const handleRemove = (index: number) => {
    const existing = photos[index]
    setPhotos((v) => setAt(v, index, null))
    if (existing) void deleteMedia(existing)
  }
```

`VenueForm` needs the hoster uid for the storage path, so add it to the props:

```tsx
interface VenueFormProps {
  /** The hoster's uid — venues are keyed by it, and so are their storage paths. */
  venueUid: string
  initial?: Venue
  submitLabel: string
  onSubmit: (venue: Venue) => Promise<void>
}
```

and pass `venueUid={user!.uid}` from both `venue-setup.tsx` and wherever `(hoster)/venue.tsx` renders the form.

- [ ] **Step 3: Render the grid and include it in the submit payload**

```tsx
        <Meta role="eyebrow" style={styles.sectionLabel}>Photos</Meta>
        <Body role="bodySm" style={styles.hint}>Up to six photos or clips of the space.</Body>
        {mediaError ? <Banner message={mediaError} /> : null}
        <View style={styles.grid}>
          {VENUE_SLOTS.map((index) => (
            <MediaSlotPicker
              key={index}
              style={styles.slot}
              media={photos[index]}
              progress={progress[index]}
              onPick={() => handlePick(index)}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </View>
```

```tsx
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.xl },
  slot: { width: '31%', aspectRatio: 1 },
  hint: { marginBottom: space.sm },
```

In `handleSubmit`, add to the submitted venue:

```tsx
      photos: photos.filter((p): p is MediaAsset => p !== null),
```

- [ ] **Step 4: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add types/models.ts components/VenueForm.tsx "app/(app)/venue-setup.tsx"
git commit -m "feat: let hosters add a venue gallery of photos and clips"
```

---

### Task 15: Render the venue gallery, and the strip on event detail

**Files:**
- Modify: `thirdspace-app/app/(app)/(hoster)/venue.tsx`
- Modify: `thirdspace-app/app/(app)/event/[id].tsx`
- Modify: `thirdspace-app/hooks/useVenue.ts` (only if it narrows the returned shape)

**Interfaces:**
- Consumes: `MediaThumb` (Task 5), `MediaViewer` (Task 6).
- Produces: nothing new.

- [ ] **Step 1: Render the gallery on the hoster's venue screen**

```tsx
        {venue.photos && venue.photos.length > 0 ? (
          <>
            <Meta role="eyebrow" style={styles.sectionLabel}>Photos</Meta>
            <View style={styles.grid}>
              {venue.photos.map((media, i) => (
                <MediaThumb key={i} media={media} style={styles.tile} onPress={() => setViewing(media)} />
              ))}
            </View>
          </>
        ) : null}
```

```tsx
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { width: '31%', aspectRatio: 1 },
```

Add the `viewing` state and mount `MediaViewer`, as in Task 10.

- [ ] **Step 2: Add the strip to `event/[id].tsx` beneath the venue name**

The event document does not carry venue photos, so fetch the venue by `event.venueId`:

```tsx
  const [venuePhotos, setVenuePhotos] = useState<MediaAsset[]>([])

  useEffect(() => {
    if (!event?.venueId) return
    let cancelled = false
    // One-shot, not a subscription: venue photos do not change while somebody reads an
    // event, and a second live listener per event screen buys nothing.
    getVenue(event.venueId)
      .then((v) => { if (!cancelled) setVenuePhotos(v?.photos ?? []) })
      .catch(() => { /* the strip simply does not render */ })
    return () => { cancelled = true }
  }, [event?.venueId])
```

```tsx
        {venuePhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStrip}>
            {venuePhotos.map((media, i) => (
              <MediaThumb key={i} media={media} style={styles.venueTile} onPress={() => setViewing(media)} />
            ))}
          </ScrollView>
        ) : null}
```

```tsx
  venueStrip: { gap: space.sm, paddingVertical: space.sm },
  venueTile: { width: 96, height: 96 },
```

- [ ] **Step 3: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/(hoster)/venue.tsx" "app/(app)/event/[id].tsx"
git commit -m "feat: show venue photos on the venue screen and the event detail"
```

---

# PHASE 5 — Chat attachments

### Task 16: `Message.media`, sending it, and the list preview label

**Files:**
- Modify: `thirdspace-app/types/models.ts` (`Message.media`)
- Modify: `thirdspace-app/services/chat.ts:16-27,51-66,109-150`
- Test: `thirdspace-app/__tests__/services/sendDirectMessage.test.ts`

**Interfaces:**
- Consumes: `MediaAsset` (Task 1), `mediaPreviewLabel` (Task 2).
- Produces:
  - `newMessageRef(kind: 'group' | 'dm', threadId: string): DocumentReference`
  - `sendEventMessage(eventId, author, text, media?, msgRef?)`
  - `sendDirectMessage(convId, participants, author, text, media?, msgRef?)`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/services/sendDirectMessage.test.ts`:

```ts
it('sends an attachment with no caption and previews it as VIDEO in the list', async () => {
  const media = { type: 'video' as const, url: 'u', thumbURL: 't', width: 1, height: 1, durationMs: 3000 }
  await sendDirectMessage('c1', participants, author, '', media)
  const convWrite = setDocMock.mock.calls.find(([ref]) => ref.path === 'conversations/c1')
  expect(convWrite[1].lastMessageText).toBe('VIDEO')
})

it('prefers the caption over the media label when both are present', async () => {
  const media = { type: 'image' as const, url: 'u', thumbURL: 'u', width: 1, height: 1 }
  await sendDirectMessage('c1', participants, author, 'look at this', media)
  const convWrite = setDocMock.mock.calls.find(([ref]) => ref.path === 'conversations/c1')
  expect(convWrite[1].lastMessageText).toBe('look at this')
})

it('still refuses a send with neither text nor media', async () => {
  const result = await sendDirectMessage('c1', participants, author, '   ')
  expect(result).toEqual({ created: false })
  expect(setDocMock).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/services/sendDirectMessage.test.ts`
Expected: FAIL — `sendDirectMessage` takes four arguments.

- [ ] **Step 3: Add the model field**

```ts
export interface Message {
  id: string
  authorUid: string
  authorName: string
  authorPhotoURL: string | null
  text: string
  createdAt: Timestamp | null
  kind?: 'group' | 'announcement'
  /** One attachment per message — the ordinary chat convention. */
  media?: MediaAsset
}
```

- [ ] **Step 4: Change `services/chat.ts`**

In `toMessage`, carry the field through:

```ts
    ...(data.media ? { media: data.media as MediaAsset } : {}),
```

Add the ref minter:

```ts
/**
 * Mint the message id BEFORE the write: the attachment's storage path contains it
 * (`chatMedia/{authorUid}/{threadId}/{messageId}`), so the upload has to run against
 * a ref the caller already holds.
 */
export function newMessageRef(kind: 'group' | 'dm', threadId: string) {
  return kind === 'group'
    ? doc(collection(db, 'eventChats', threadId, 'messages'))
    : doc(collection(db, 'conversations', threadId, 'messages'))
}
```

Change `sendEventMessage`:

```ts
export async function sendEventMessage(
  eventId: string,
  author: MessageAuthor,
  text: string,
  media?: MediaAsset,
  msgRef = newMessageRef('group', eventId)
): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed && !media) return
  // An attachment-only message would otherwise leave the chat list row blank.
  const preview = trimmed || mediaPreviewLabel(media)
  const batch = writeBatch(db)
  batch.set(msgRef, {
    authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
    text: trimmed, createdAt: serverTimestamp(),
    ...(media ? { media } : {}),
  })
  batch.set(
    doc(db, 'eventChats', eventId),
    { lastMessageText: preview, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1) },
    { merge: true }
  )
  await batch.commit()
}
```

Replace `sendDirectMessage` in full (both the create and the append path change):

```ts
export async function sendDirectMessage(
  convId: string,
  participants: ParticipantInfo[],
  author: MessageAuthor,
  text: string,
  media?: MediaAsset,
  msgRef = newMessageRef('dm', convId)
): Promise<SendDirectMessageResult> {
  const trimmed = text.trim()
  if (!trimmed && !media) return { created: false }
  const preview = trimmed || mediaPreviewLabel(media)
  const body = {
    authorUid: author.uid, authorName: author.name, authorPhotoURL: author.photoURL,
    text: trimmed, createdAt: serverTimestamp(),
    ...(media ? { media } : {}),
  }

  const convRef = doc(db, 'conversations', convId)
  const snap = await getDoc(convRef)
  if (!snap.exists()) {
    // Two sequential awaited writes, NOT a batch: rules `get()` sees pre-batch state,
    // so the conversation doc must already exist when the message-create rule runs.
    const names: Record<string, string> = {}
    const photos: Record<string, string | null> = {}
    participants.forEach((p) => { names[p.uid] = p.name; photos[p.uid] = p.photoURL })
    await setDoc(convRef, {
      participants: participants.map((p) => p.uid),
      names, photos,
      status: 'pending', requestedBy: author.uid,
      lastMessageText: preview, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: 1,
    })
    await setDoc(msgRef, body)
    return { created: true }
  }

  const batch = writeBatch(db)
  batch.set(msgRef, body)
  batch.update(convRef, {
    lastMessageText: preview, lastMessageAt: serverTimestamp(), lastMessageAuthor: author.name, messageCount: increment(1),
  })
  await batch.commit()
  return { created: false }
}
```

Import `mediaPreviewLabel` from `../utils/media` and `MediaAsset` from `../types/models`.

- [ ] **Step 5: Run to verify pass, then commit**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

```bash
git add types/models.ts services/chat.ts __tests__/services/sendDirectMessage.test.ts
git commit -m "feat: allow messages to carry one attachment, with a list preview label"
```

---

### Task 17: `ChatBubble` renders media inset

**Files:**
- Modify: `thirdspace-app/components/ChatBubble.tsx`
- Test: `thirdspace-app/__tests__/components/ChatBubble.test.tsx` (create if absent)

**Interfaces:**
- Consumes: `MediaThumb` (Task 5), `MediaAsset` (Task 1).
- Produces: `ChatMessage` gains `media?: MediaAsset`; `ChatBubbleProps` gains `uploadProgress?: number | null` and `onPressMedia?: () => void`.

- [ ] **Step 1: Write the failing test**

```tsx
import React from 'react'
import { render } from '@testing-library/react-native'
import { ChatBubble } from '../../components/ChatBubble'
import { MediaAsset } from '../../types/models'

const media: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }
const base = { id: 'm1', author: 'Mara', text: '', time: '8:42 PM' }

describe('ChatBubble with media', () => {
  it('renders the attachment inside the bubble', () => {
    const { getByTestId } = render(<ChatBubble message={{ ...base, media }} isSelf={false} />)
    expect(getByTestId('media-thumb-image')).toBeTruthy()
  })

  it('renders the caption below the attachment when there is one', () => {
    const { getByText, getByTestId } = render(
      <ChatBubble message={{ ...base, text: 'found the good table', media }} isSelf={false} />
    )
    expect(getByTestId('media-thumb-image')).toBeTruthy()
    expect(getByText('found the good table')).toBeTruthy()
  })

  it('renders no caption text node for an attachment-only message', () => {
    const { queryByText } = render(<ChatBubble message={{ ...base, media }} isSelf />)
    expect(queryByText('PHOTO')).toBeNull()
  })

  it('shows a progress bar while the attachment is uploading', () => {
    const { getByTestId } = render(
      <ChatBubble message={{ ...base, media }} isSelf uploadProgress={0.25} />
    )
    expect(getByTestId('bubble-upload-fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '25%' })])
    )
  })

  it('shows no progress bar once the upload is done', () => {
    const { queryByTestId } = render(<ChatBubble message={{ ...base, media }} isSelf />)
    expect(queryByTestId('bubble-upload-fill')).toBeNull()
  })

  it('still renders a plain text message unchanged', () => {
    const { getByText, queryByTestId } = render(
      <ChatBubble message={{ ...base, text: 'hello' }} isSelf={false} />
    )
    expect(getByText('hello')).toBeTruthy()
    expect(queryByTestId('media-thumb')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest __tests__/components/ChatBubble.test.tsx`
Expected: FAIL — `media` is not a `ChatMessage` field.

- [ ] **Step 3: Implement**

Extend the interfaces:

```tsx
export interface ChatMessage {
  id: string
  author: string
  text: string
  time: string
  media?: MediaAsset
}

interface ChatBubbleProps {
  message: ChatMessage
  isSelf: boolean
  isSystem?: boolean
  isAnnouncement?: boolean
  showAuthor?: boolean
  /** 0-1 while the attachment uploads; null or absent once it is stored. */
  uploadProgress?: number | null
  onPressMedia?: () => void
}
```

Add a shared inner renderer used by both the self and other branches, so the two cannot drift:

```tsx
/**
 * Media sits INSIDE the bubble's existing padding, above the caption — the bubble keeps
 * its geometry and simply gains a child. Edge-to-edge media would mean dropping the
 * padding conditionally and clipping the image's corner to match the bubble's, which is
 * a second layout for one component to hold.
 */
function BubbleContent({ message, isSelf, uploadProgress, onPressMedia }: {
  message: ChatMessage
  isSelf: boolean
  uploadProgress?: number | null
  onPressMedia?: () => void
}) {
  const uploading = uploadProgress !== null && uploadProgress !== undefined
  return (
    <>
      {message.media ? (
        <View style={styles.mediaWrap}>
          <MediaThumb media={message.media} style={styles.media} onPress={uploading ? undefined : onPressMedia} />
          {uploading ? (
            <View style={styles.uploadTrack}>
              <View testID="bubble-upload-fill" style={[styles.uploadFill, { width: `${Math.round((uploadProgress ?? 0) * 100)}%` }]} />
            </View>
          ) : null}
        </View>
      ) : null}
      {message.text ? (
        <Body role="bodyLg" tone={isSelf ? undefined : 'ink'} style={isSelf ? styles.onInk : undefined}>
          {message.text}
        </Body>
      ) : null}
      <Meta style={[styles.time, isSelf ? styles.onInk : undefined]}>{message.time}</Meta>
    </>
  )
}
```

Replace the bodies of the `isSelf` and default branches with `<BubbleContent .../>`, and add:

```tsx
  mediaWrap: { position: 'relative', marginBottom: space.sm },
  media: { width: 200, height: 150, borderRadius: radius.ticket - 6 },
  uploadTrack: {
    position: 'absolute', left: space.sm, right: space.sm, bottom: space.sm,
    height: 4, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: palette.rule,
  },
  uploadFill: { height: '100%', backgroundColor: palette.clay },
```

- [ ] **Step 4: Run to verify pass, then commit**

Run: `npx jest __tests__/components/ChatBubble.test.tsx && npx tsc --noEmit`
Expected: PASS.

```bash
git add components/ChatBubble.tsx __tests__/components/ChatBubble.test.tsx
git commit -m "feat: render chat attachments inset in the bubble"
```

---

### Task 18: The composer attach button and optimistic upload

**Files:**
- Modify: `thirdspace-app/app/(app)/chat/[id].tsx:169-205`

**Interfaces:**
- Consumes: `newMessageRef`/`sendEventMessage`/`sendDirectMessage` (Task 16), `pickMedia`/`uploadMedia` (Task 3), `ChatBubble` (Task 17), `MediaViewer` (Task 6).
- Produces: nothing new.

- [ ] **Step 1: Add pending-attachment state**

```tsx
  interface Pending { id: string; media: MediaAsset; progress: number }

  const [pending, setPending] = useState<Pending | null>(null)
  const [viewing, setViewing] = useState<MediaAsset | null>(null)

  const handleAttach = async () => {
    if (!myUid || pending) return
    const picked = await pickMedia({ allowVideo: true })
    if (!picked) return

    // Mint the message id first — the storage path contains it.
    const msgRef = newMessageRef(kind === 'group' ? 'group' : 'dm', id)
    // A local optimistic bubble so a slow clip does not look like a dead thread.
    const local: MediaAsset = {
      type: picked.type, url: picked.uri, thumbURL: picked.uri,
      width: picked.width, height: picked.height,
      ...(picked.durationMs != null ? { durationMs: picked.durationMs } : {}),
    }
    setPending({ id: msgRef.id, media: local, progress: 0 })

    // Declared OUTSIDE the try: if the upload succeeds and the Firestore write then
    // fails, this holds the REAL uploaded asset. Cleaning up `local` instead would
    // pass a file:// URI to deleteMedia, which silently does nothing and leaves the
    // actual bytes orphaned in the bucket.
    let uploaded: MediaAsset | null = null

    try {
      uploaded = await uploadMedia(
        { kind: 'chat', authorUid: myUid, threadId: id, messageId: msgRef.id },
        picked,
        (fraction) => setPending((p) => (p ? { ...p, progress: fraction } : p))
      )
      if (kind === 'group') {
        await sendEventMessage(id, authorInfo, draft, uploaded, msgRef)
      } else {
        await sendDirectMessage(id, participantInfo, authorInfo, draft, uploaded, msgRef)
      }
      setDraft('')
    } catch (e: unknown) {
      setSendError(e instanceof MediaLimitError
        ? limitMessage(e.result, picked.type)
        : "Couldn't send that. Check your connection and try again.")
      if (uploaded) void deleteMedia(uploaded)
    } finally {
      // The real message arrives through the snapshot; drop the optimistic copy.
      setPending(null)
    }
  }
```

`authorInfo` and `participantInfo` are the objects the screen's existing `send` function already builds inline for its `sendEventMessage` / `sendDirectMessage` calls. Hoist them out of `send` into `useMemo` values on the component so both `send` and `handleAttach` use one definition:

```tsx
  const authorInfo = useMemo(
    () => ({ uid: myUid, name: myName, photoURL: myPhotoURL }),
    [myUid, myName, myPhotoURL]
  )
```

Keep whatever field sources `send` already uses — the point is one definition, not two that can drift.

- [ ] **Step 2: Render the pending bubble after the mapped messages**

```tsx
          {pending ? (
            <ChatBubble
              key={pending.id}
              message={{ id: pending.id, author: '', text: draft, time: '', media: pending.media }}
              isSelf
              uploadProgress={pending.progress}
            />
          ) : null}
```

- [ ] **Step 3: Add the attach button and un-gate send**

Replace the `inputRow` block:

```tsx
          <View style={styles.inputRow}>
            <TouchableOpacity
              testID="chat-attach"
              style={styles.attachBtn}
              onPress={handleAttach}
              disabled={pending !== null}
              accessibilityRole="button"
              accessibilityLabel="Add a photo or clip"
            >
              <Ionicons name="image-outline" size={20} color={palette.ink} />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder={kind === 'group' ? 'Message the group' : 'Message'}
              placeholderTextColor={palette.inkSoft}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!draft.trim()}
            >
              <Body role="button" style={styles.onInk}>↑</Body>
            </TouchableOpacity>
          </View>
```

```tsx
  attachBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: palette.orangeLight, borderWidth: 1, borderColor: palette.rule,
  },
```

The send button stays gated on `draft.trim()` because an attachment sends itself the moment it is picked — there is no staged-attachment state to send later, which is what keeps this flow one code path instead of two.

- [ ] **Step 4: Pass `media` and the viewer through the mapped messages**

In the `messages.map`, add `media: m.media` to the `message` object and `onPressMedia={() => setViewing(m.media ?? null)}`. Mount `<MediaViewer media={viewing} onClose={() => setViewing(null)} />` beside the existing `Toast`.

- [ ] **Step 5: Run the suite and typecheck**

Run: `npx jest && npx tsc --noEmit`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/chat/[id].tsx"
git commit -m "feat: send photo and video attachments from the chat composer"
```

---

### Task 19: Push body fallback for attachment-only messages

**Files:**
- Create: `thirdspace-app/functions/src/mediaLabel.ts`
- Create: `thirdspace-app/functions/src/mediaLabel.test.ts`
- Modify: `thirdspace-app/functions/src/onNewDirectMessage.ts:9,24`

**Interfaces:**
- Consumes: nothing — `functions/` is a separate workspace and **cannot import from the app**, which is why this helper is duplicated rather than shared.
- Produces: `mediaLabel(media?: { type?: string }): string`.

- [ ] **Step 1: Write the failing test**

Create `functions/src/mediaLabel.test.ts`:

```ts
import { mediaLabel } from './mediaLabel'

describe('mediaLabel', () => {
  it('labels a photo and a clip in uppercase, matching the app', () => {
    expect(mediaLabel({ type: 'image' })).toBe('PHOTO')
    expect(mediaLabel({ type: 'video' })).toBe('VIDEO')
  })

  it('returns an empty string when there is no media', () => {
    expect(mediaLabel(undefined)).toBe('')
    expect(mediaLabel({})).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd functions && npx jest src/mediaLabel.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `functions/src/mediaLabel.ts`:

```ts
/**
 * Deliberately duplicated from the app's utils/media.ts `mediaPreviewLabel`. The
 * functions workspace is compiled separately and cannot import from the app, and a
 * four-line helper is a better trade than a shared build target. Keep the two strings
 * in step.
 */
export function mediaLabel(media?: { type?: string }): string {
  if (!media) return ''
  if (media.type === 'video') return 'VIDEO'
  if (media.type === 'image') return 'PHOTO'
  return ''
}
```

- [ ] **Step 4: Use it in `onNewDirectMessage.ts`**

Widen the message type on line 9:

```ts
  text: string
  media?: { type?: string }
```

and change line 24:

```ts
    // An attachment-only message has no text; without this the push body is empty.
    body: truncateBody(message.text || mediaLabel(message.media)),
```

- [ ] **Step 5: Run the functions suite**

Run: `cd functions && npx jest`
Expected: PASS, including the existing `onNewDirectMessage` tests.

- [ ] **Step 6: Commit**

```bash
git add functions/src/mediaLabel.ts functions/src/mediaLabel.test.ts functions/src/onNewDirectMessage.ts
git commit -m "fix: push a media label instead of an empty body for attachment-only DMs"
```

---

## Final verification

- [ ] **Run everything**

```bash
cd thirdspace-app
npx tsc --noEmit
npx jest
npm run test:rules
cd functions && npx jest && cd ..
```

Expected: `tsc` clean; all app suites pass (484 existing + roughly 60 new); rules suites pass (31 Firestore + 14 Storage); functions suites pass.

- [ ] **Deploy rules** (after the bucket exists)

```bash
npx firebase-tools deploy --only firestore:rules,storage
```

This also ships the two Firestore rules changes the codemap records as undeployed — the `conversations` null guard and the socials gate.

- [ ] **Device smoke test** (requires the provisioned bucket)

Upload one photo and one 45-second clip on each surface: avatar, a vibe slot, an event cover, a venue tile, a chat attachment in both a DM and a group thread. Confirm the play badge appears only on clips, the viewer opens, the chat list row reads PHOTO/VIDEO for an attachment with no caption, and a push for an attachment-only DM has a non-empty body. Then try a clip longer than 60 seconds and confirm the refusal names the duration.

- [ ] **Update the codemap**

Run `/update-codemaps`, or add the media system to `docs/CODEMAPS/thirdspace-codemap.md` by hand — the storage layout, the `thumbURL === url` invariant, the two accepted orphan cases, and the fact that Storage rules cannot gate chat media on membership.
