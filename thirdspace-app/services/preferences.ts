import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'onboardingPrefs'

export interface OnboardingPrefs {
  location: boolean
  notifications: boolean
}

const DEFAULTS: OnboardingPrefs = { location: true, notifications: true }

/** Opt-ins captured on the Get Started screen. Never throws — prefs are not worth a crash. */
export async function setOnboardingPrefs(prefs: OnboardingPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // A failed preference write must not block onboarding.
  }
}

export async function getOnboardingPrefs(): Promise<OnboardingPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULTS
    const data = parsed as Partial<OnboardingPrefs>
    return {
      location: typeof data.location === 'boolean' ? data.location : DEFAULTS.location,
      notifications: typeof data.notifications === 'boolean' ? data.notifications : DEFAULTS.notifications,
    }
  } catch {
    return DEFAULTS
  }
}
