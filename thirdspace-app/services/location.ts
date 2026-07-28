import * as Location from 'expo-location'
import { Borough } from '../types/models'
import { boroughFromPlace } from '../utils/boroughs'
import { getOnboardingPrefs } from './preferences'

/** A slow or indoor fix must never hold up the entry screen. */
const FIX_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([
    promise,
    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms) }),
  ]).finally(() => clearTimeout(timer))
}

/**
 * Resolves the user's NYC borough from GPS.
 *
 * NEVER rejects. Opt-out, denied permission, GPS failure, timeout and a location
 * outside NYC all resolve to null so the caller can fall through to the next source
 * in the resolution chain.
 */
export async function detectBorough(): Promise<Borough | null> {
  try {
    // Honour the Get Started opt-in: if they said no, do not raise the OS prompt.
    const prefs = await getOnboardingPrefs()
    if (!prefs.location) return null

    // Probe before prompting: a user who already denied (and can't be asked again)
    // must not see the OS dialog on every cold start.
    const current = await Location.getForegroundPermissionsAsync()
    if (current.status !== 'granted') {
      if (!current.canAskAgain) return null
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return null
    }

    const position = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
      FIX_TIMEOUT_MS
    )
    if (!position) return null

    const places = await withTimeout(Location.reverseGeocodeAsync(position.coords), FIX_TIMEOUT_MS)
    if (!places || places.length === 0) return null

    return boroughFromPlace(places[0])
  } catch {
    return null
  }
}
