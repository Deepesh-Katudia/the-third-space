import * as Location from 'expo-location'
import { detectBorough } from '../../services/location'
import { getOnboardingPrefs } from '../../services/preferences'

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Low: 2 },
}))
jest.mock('../../services/preferences', () => ({ getOnboardingPrefs: jest.fn() }))

const granted = { status: 'granted' }
const position = { coords: { latitude: 40.7, longitude: -73.9 } }

beforeEach(() => {
  jest.clearAllMocks()
  ;(getOnboardingPrefs as jest.Mock).mockResolvedValue({ location: true, notifications: true })
  ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue(granted)
  ;(Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(position)
  ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ subregion: 'Kings County' }])
})

describe('detectBorough', () => {
  it('resolves the borough from a granted fix', async () => {
    await expect(detectBorough()).resolves.toBe('Brooklyn')
  })

  it('never raises the OS prompt when the user declined location at onboarding', async () => {
    ;(getOnboardingPrefs as jest.Mock).mockResolvedValue({ location: false, notifications: true })
    await expect(detectBorough()).resolves.toBeNull()
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
  })

  it('returns null when permission is denied', async () => {
    ;(Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' })
    await expect(detectBorough()).resolves.toBeNull()
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('returns null instead of throwing when the GPS call rejects', async () => {
    ;(Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(new Error('no fix'))
    await expect(detectBorough()).resolves.toBeNull()
  })

  it('returns null when reverse geocoding yields nothing', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([])
    await expect(detectBorough()).resolves.toBeNull()
  })

  it('returns null when the fix is outside NYC', async () => {
    ;(Location.reverseGeocodeAsync as jest.Mock).mockResolvedValue([{ city: 'Boston' }])
    await expect(detectBorough()).resolves.toBeNull()
  })

  it('gives up rather than hanging the entry screen when the fix never arrives', async () => {
    jest.useFakeTimers()
    ;(Location.getCurrentPositionAsync as jest.Mock).mockReturnValue(new Promise(() => {}))
    const pending = detectBorough()
    // advanceTimersByTimeAsync (not the sync form) — detectBorough awaits the prefs
    // read and the permission request before it reaches the timeout race, and only
    // the async form flushes those microtasks between ticks.
    await jest.advanceTimersByTimeAsync(5000)
    await expect(pending).resolves.toBeNull()
    jest.useRealTimers()
  })

  it('asks for low accuracy, which is all a borough lookup needs', async () => {
    await detectBorough()
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: Location.Accuracy.Low })
  })
})
