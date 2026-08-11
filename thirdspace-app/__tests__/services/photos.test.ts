import { captureImage } from '../../services/photos'

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))

import * as ImagePicker from 'expo-image-picker'

describe('captureImage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the camera URI when the camera is granted', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cam' }] })
    expect(await captureImage('id')).toBe('file://cam')
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('falls back to the library when the camera is denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://lib' }] })
    expect(await captureImage('selfie')).toBe('file://lib')
  })

  it('returns null when both camera and library are denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    expect(await captureImage('id')).toBeNull()
  })

  it('returns null when the user cancels', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true })
    expect(await captureImage('id')).toBeNull()
  })
})
