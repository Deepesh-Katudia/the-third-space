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

/**
 * A resumable-task stand-in whose settlement is genuinely deferred until `settle()`
 * is called. `fakeTask` above resolves its `then` synchronously, so it cannot tell
 * "awaited" apart from "not awaited" — this one can, because there is a real gap
 * between the task being issued and it settling.
 */
function deferredTask() {
  let resolveTask: (value: unknown) => void = () => {}
  const donePromise = new Promise((resolve) => { resolveTask = resolve })
  const task: Record<string, unknown> = {
    on: jest.fn(),
    then: (resolve: (v: unknown) => unknown) => donePromise.then(() => resolve({ ref: { path: 'p' } })),
  }
  return { task, settle: () => resolveTask(undefined) }
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

  it('does not resolve the download URL until the resumable upload actually settles', async () => {
    mockManipulator('file://small', 10, 10)
    mockBlob(1000, 'image/jpeg')
    const { task, settle } = deferredTask()
    ;(uploadBytesResumable as jest.Mock).mockReturnValue(task)

    const pending = uploadMedia({ kind: 'avatar', uid: 'u1' }, { uri: 'file://a', type: 'image', width: 1, height: 1 })

    // A macrotask boundary drains every microtask queued ahead of `await task`
    // (compress, then toBlob) without the deferred task itself settling, since
    // `donePromise` only resolves once `settle()` is called below.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(getDownloadURL).not.toHaveBeenCalled()

    settle()
    await pending

    expect(getDownloadURL).toHaveBeenCalledTimes(1)
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
