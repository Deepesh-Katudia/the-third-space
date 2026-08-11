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
