import { photoPath } from '../../services/photos'

jest.mock('../../firebase/config', () => ({ storage: {} }))
jest.mock('expo-image-picker', () => ({}))
jest.mock('firebase/storage', () => ({ ref: jest.fn(), uploadBytes: jest.fn(), getDownloadURL: jest.fn() }))

describe('photoPath', () => {
  it('builds a per-user, per-kind storage path', () => {
    expect(photoPath('u1', 'avatar')).toBe('profilePhotos/u1/avatar.jpg')
    expect(photoPath('u1', 'vibe2')).toBe('profilePhotos/u1/vibe2.jpg')
  })
})
