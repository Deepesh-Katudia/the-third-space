import * as ImagePicker from 'expo-image-picker'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase/config'

export type PhotoKind = 'avatar' | 'vibe0' | 'vibe1' | 'vibe2'

export function photoPath(uid: string, kind: PhotoKind): string {
  return `profilePhotos/${uid}/${kind}.jpg`
}

// Returns a local image URI, or null if the user cancels / denies permission.
export async function pickImage(kind: PhotoKind): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: kind === 'avatar' ? [1, 1] : [4, 5],
    quality: 0.7,
  })
  if (result.canceled) return null
  return result.assets[0].uri
}

export async function uploadProfilePhoto(uid: string, kind: PhotoKind, uri: string): Promise<string> {
  const res = await fetch(uri)
  const blob = await res.blob()
  const storageRef = ref(storage, photoPath(uid, kind))
  await uploadBytes(storageRef, blob)
  return getDownloadURL(storageRef)
}

export type CaptureKind = 'id' | 'selfie'

// Local-only capture for ID verification: camera when granted, otherwise the
// photo library, otherwise null. The returned URI is NEVER uploaded.
export async function captureImage(kind: CaptureKind): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
