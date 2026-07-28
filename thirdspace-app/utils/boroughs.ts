import { Borough } from '../types/models'

/**
 * The subset of a reverse-geocode result this module needs. Deliberately NOT typed
 * as expo-location's `LocationGeocodedAddress` so this module stays dependency-free
 * and testable with plain objects.
 */
export interface GeocodedPlace {
  subregion?: string | null
  city?: string | null
  district?: string | null
}

/**
 * Reverse geocoding rarely returns the borough name itself — it usually returns the
 * county, and which field carries it differs by platform. Every alias below has been
 * observed from one of the two platforms.
 */
const ALIASES: Record<string, Borough> = {
  brooklyn: 'Brooklyn',
  'kings county': 'Brooklyn',
  kings: 'Brooklyn',
  manhattan: 'Manhattan',
  'new york county': 'Manhattan',
  queens: 'Queens',
  'queens county': 'Queens',
  bronx: 'Bronx',
  'the bronx': 'Bronx',
  'bronx county': 'Bronx',
  'staten island': 'Staten Island',
  'richmond county': 'Staten Island',
  richmond: 'Staten Island',
}

/**
 * Maps a reverse-geocode result to an NYC borough, or null when it is not a place
 * we recognise. Null is a normal outcome (the user may simply be outside NYC), not
 * an error — callers fall through to the next source in the resolution chain.
 */
export function boroughFromPlace(place: GeocodedPlace | null | undefined): Borough | null {
  if (!place) return null
  // `city` is checked last: for NYC, both Apple and Google routinely return
  // `city: "New York"` for points outside Manhattan, with the real borough
  // carried in `district` (subLocality). Checking `city` first would confidently
  // misreport those as Manhattan.
  for (const field of [place.subregion, place.district, place.city]) {
    if (!field) continue
    const hit = ALIASES[field.trim().toLowerCase()]
    if (hit) return hit
  }
  return null
}
