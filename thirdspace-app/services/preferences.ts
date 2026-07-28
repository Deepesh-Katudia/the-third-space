import AsyncStorage from '@react-native-async-storage/async-storage'
import { Borough } from '../types/models'
import { BOROUGHS } from '../constants/categories'

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

const OVERRIDE_KEY = 'locationOverride'

export interface LocationOverride {
  /** null means the user explicitly chose "All of NYC" — distinct from no override. */
  borough: Borough | null
}

/** Records a deliberate borough choice. GPS never overrides this on a later launch. */
export async function setLocationOverride(borough: Borough | null): Promise<void> {
  try {
    await AsyncStorage.setItem(OVERRIDE_KEY, JSON.stringify({ borough }))
  } catch {
    // A failed preference write must not break the picker.
  }
}

/** Returns null when the user has never chosen, so the caller can fall through to GPS. */
export async function getLocationOverride(): Promise<LocationOverride | null> {
  try {
    const raw = await AsyncStorage.getItem(OVERRIDE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { borough } = parsed as { borough?: unknown }
    if (borough === null) return { borough: null }
    if (typeof borough === 'string' && (BOROUGHS as string[]).includes(borough)) {
      return { borough: borough as Borough }
    }
    return null
  } catch {
    return null
  }
}
