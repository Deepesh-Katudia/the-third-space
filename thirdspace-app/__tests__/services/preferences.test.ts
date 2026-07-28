import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getOnboardingPrefs, setOnboardingPrefs,
  getLocationOverride, setLocationOverride,
} from '../../services/preferences'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

beforeEach(() => jest.clearAllMocks())

describe('onboarding preferences', () => {
  it('persists both opt-ins as JSON', async () => {
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
    await setOnboardingPrefs({ location: false, notifications: true })
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'onboardingPrefs',
      JSON.stringify({ location: false, notifications: true })
    )
  })

  it('round-trips a stored value', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ location: false, notifications: false }))
    await expect(getOnboardingPrefs()).resolves.toEqual({ location: false, notifications: false })
  })

  it('defaults to opted-in when nothing is stored', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    await expect(getOnboardingPrefs()).resolves.toEqual({ location: true, notifications: true })
  })

  it('falls back to defaults on corrupt JSON rather than throwing', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('{not json')
    await expect(getOnboardingPrefs()).resolves.toEqual({ location: true, notifications: true })
  })

  it('backfills defaults for a partially-shaped stored value', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ location: false }))
    await expect(getOnboardingPrefs()).resolves.toEqual({ location: false, notifications: true })
  })

  it('does not throw when the write fails', async () => {
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'))
    await expect(setOnboardingPrefs({ location: true, notifications: true })).resolves.toBeUndefined()
  })
})

describe('location override', () => {
  it('persists a chosen borough under its own key', async () => {
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
    await setLocationOverride('Queens')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('locationOverride', JSON.stringify({ borough: 'Queens' }))
  })

  it('treats All of NYC as a real stored choice, not an absent one', async () => {
    ;(AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined)
    await setLocationOverride(null)
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('locationOverride', JSON.stringify({ borough: null }))
  })

  it('round-trips a stored borough', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ borough: 'Bronx' }))
    await expect(getLocationOverride()).resolves.toEqual({ borough: 'Bronx' })
  })

  it('round-trips All of NYC distinctly from no override', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ borough: null }))
    await expect(getLocationOverride()).resolves.toEqual({ borough: null })
  })

  it('reports no override when nothing is stored', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(null)
    await expect(getLocationOverride()).resolves.toBeNull()
  })

  it('ignores a corrupt or unknown borough rather than trusting it', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ borough: 'Atlantis' }))
    await expect(getLocationOverride()).resolves.toBeNull()
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('{not json')
    await expect(getLocationOverride()).resolves.toBeNull()
  })

  it('does not throw when the write fails', async () => {
    ;(AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('disk full'))
    await expect(setLocationOverride('Brooklyn')).resolves.toBeUndefined()
  })
})
