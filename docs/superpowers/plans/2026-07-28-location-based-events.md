# Location-Based Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the user's NYC borough from GPS and default the Discover feed to events in that borough, falling back to the borough they gave at signup.

**Architecture:** Two dependency-free pure modules (`utils/boroughs.ts`, `utils/locationFilter.ts`) hold all the logic; `services/location.ts` is a thin mockable wrapper over expo-location that never throws; `hooks/useUserLocation.ts` is a module-level store (the `useDiscoverFilters` pattern) so the Discover screen and the picker modal share one source of truth. Location composes *around* `applyEventFilters` rather than being folded into `EventFilters`, so no existing filter test changes.

**Tech Stack:** Expo SDK 54 / React Native 0.81 (New Architecture), TypeScript 5.7, expo-router v6, Jest via jest-expo, `@testing-library/react-native`, `expo-location`.

**Spec:** `docs/superpowers/specs/2026-07-28-location-based-events-design.md`

## Global Constraints

- **Run every command from `thirdspace-app/`.**
- **Every task ends green:** `npx tsc --noEmit` and `npx jest` both pass before committing.
- **No literal hex under `app/` or `components/`.** `__tests__/constants/tokens.test.ts` has an empty allowlist, so the rule is absolute. Colors come from `constants/design.ts`.
- **`jest.mock` factories may only reference variables whose names begin with `mock`.** Jest hoists the factory above surrounding declarations. `const back = jest.fn()` referenced inside a factory fails with "The module factory of `jest.mock()` is not allowed to reference any out-of-scope variables"; `const mockBack = jest.fn()` works. This bit us once already — see `__tests__/components/ui/BackButton.test.tsx`.
- **`Borough` is `'Brooklyn' | 'Manhattan' | 'Queens' | 'Bronx' | 'Staten Island'`** (`types/models.ts:16`). Do not widen it.
- **Location is an enhancement, never a blocker.** No failure path may throw, block render, or show an error banner.
- **Attender-only.** Do not touch the hoster screens.
- **Commit style:** conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). No `Co-Authored-By` trailer — attribution is disabled globally for this repo.
- **Do not change `firestore.rules`.** Verified: `match /events/{eventId}` `allow create` asserts only `venueId == request.auth.uid` plus venue existence, and does not whitelist fields.

---

## File Structure

**New files**

| File | Responsibility |
|------|----------------|
| `utils/boroughs.ts` | Pure `boroughFromPlace()` mapping over `{ subregion, city, district }` |
| `utils/locationFilter.ts` | Pure `filterByBorough()` returning `{ events, widened }` |
| `services/location.ts` | expo-location wrapper → `detectBorough()`, never throws |
| `hooks/useUserLocation.ts` | Module store: resolution chain + manual override |
| `app/(app)/borough-picker.tsx` | Modal route listing 5 boroughs + All of NYC |
| `__tests__/utils/boroughs.test.ts` | |
| `__tests__/utils/locationFilter.test.ts` | |
| `__tests__/services/location.test.ts` | |
| `__tests__/hooks/useUserLocation.test.tsx` | |

**Modified files**

| File | Change |
|------|--------|
| `types/models.ts` | `CommunityEvent.borough?: Borough` |
| `services/events.ts` | `createEvent` copies `venue.borough` |
| `services/preferences.ts` | `get/setLocationOverride` under key `locationOverride` |
| `components/ui/CityChip.tsx` | Optional `onPress` |
| `app/(app)/_layout.tsx` | Register `borough-picker` as a modal |
| `app/(app)/(attender)/index.tsx` | Wire chip + borough filter + widened notice |
| `app.json` | `expo-location` plugin + permission strings |

---

## Task 1: Denormalize `borough` onto events

`Venue` already carries `borough`, so this needs no new host input and `venue-setup` is untouched. The field is **optional** — this is what makes the whole feature deploy without a migration.

**Files:**
- Modify: `thirdspace-app/types/models.ts:25-40`
- Modify: `thirdspace-app/services/events.ts:42-57`
- Modify: `thirdspace-app/__tests__/services/events.test.ts` (append a case to the existing `createEvent` describe)

**Interfaces:**
- Consumes: nothing.
- Produces: `CommunityEvent.borough?: Borough` — read by Task 3's `filterByBorough`.

- [ ] **Step 1: Write the failing test**

In `__tests__/services/events.test.ts`, inside the existing `describe('createEvent', ...)` block, append:

```ts
  it('denormalizes the venue borough onto the event so the feed can filter without a join', async () => {
    ;(addDoc as jest.Mock).mockResolvedValue({ id: 'e1' })
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    const venue = { name: 'V', borough: 'Queens' as const, neighborhood: 'Astoria', description: 'd' }
    await createEvent('v1', venue, {
      title: 'T', description: 'd', category: 'Social' as const,
      startsAt: new Date('2030-01-01'), capacity: 10, ageRequirement: '18+' as const,
    })
    expect(addDoc).toHaveBeenCalledWith(
      { path: 'events' },
      expect.objectContaining({ borough: 'Queens', neighborhood: 'Astoria' })
    )
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/events.test.ts -t "denormalizes"`
Expected: FAIL — the written object has no `borough` key.

- [ ] **Step 3: Add the optional field to the model**

In `types/models.ts`, inside `interface CommunityEvent`, replace the existing `neighborhood: string` line and its comment block with:

```ts
  // venueName + neighborhood are denormalized from the venue at event creation
  // (cards render without a join).
  neighborhood: string
  /**
   * Denormalized from the venue at creation. OPTIONAL on purpose: events created
   * before location filtering shipped have none, and `filterByBorough` shows those
   * in every borough rather than hiding them. Do not make this required without
   * backfilling first.
   */
  borough?: Borough
```

- [ ] **Step 4: Copy it at creation**

In `services/events.ts`, in the `addDoc` call inside `createEvent`, add one line after `neighborhood: venue.neighborhood,`:

```ts
    borough: venue.borough,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx tsc --noEmit && npx jest __tests__/services/events.test.ts`
Expected: PASS. `toEvent` spreads `snap.data()`, so reads pick the field up with no mapper change.

- [ ] **Step 6: Commit**

```bash
git add types/models.ts services/events.ts __tests__/services/events.test.ts
git commit -m "feat: denormalize venue borough onto events

Optional field so existing events need no backfill; filterByBorough shows
borough-less events in every borough rather than hiding them."
```

---

## Task 2: Borough mapping from a reverse-geocode result

Reverse geocoding does not reliably return `"Brooklyn"`. iOS usually puts the borough in `subregion`, Android often in `city` or `district`, and either may return the county name. This module is pure and dependency-free so it can be tested with plain objects.

**Files:**
- Create: `thirdspace-app/utils/boroughs.ts`
- Create: `thirdspace-app/__tests__/utils/boroughs.test.ts`

**Interfaces:**
- Consumes: `Borough` from `types/models`.
- Produces:
  - `export interface GeocodedPlace { subregion?: string | null; city?: string | null; district?: string | null }`
  - `export function boroughFromPlace(place: GeocodedPlace | null | undefined): Borough | null`

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/utils/boroughs.test.ts`:

```ts
import { boroughFromPlace } from '../../utils/boroughs'

describe('boroughFromPlace', () => {
  it('maps each borough from its plain name', () => {
    expect(boroughFromPlace({ subregion: 'Brooklyn' })).toBe('Brooklyn')
    expect(boroughFromPlace({ subregion: 'Manhattan' })).toBe('Manhattan')
    expect(boroughFromPlace({ subregion: 'Queens' })).toBe('Queens')
    expect(boroughFromPlace({ subregion: 'Bronx' })).toBe('Bronx')
    expect(boroughFromPlace({ subregion: 'Staten Island' })).toBe('Staten Island')
  })

  it('maps the county names reverse geocoding actually returns', () => {
    // These are what the OS returns far more often than the borough name.
    expect(boroughFromPlace({ subregion: 'Kings County' })).toBe('Brooklyn')
    expect(boroughFromPlace({ subregion: 'New York County' })).toBe('Manhattan')
    expect(boroughFromPlace({ subregion: 'Queens County' })).toBe('Queens')
    expect(boroughFromPlace({ subregion: 'Bronx County' })).toBe('Bronx')
    expect(boroughFromPlace({ subregion: 'Richmond County' })).toBe('Staten Island')
  })

  it('maps the definite-article and short forms', () => {
    expect(boroughFromPlace({ city: 'The Bronx' })).toBe('Bronx')
    expect(boroughFromPlace({ city: 'New York City' })).toBe('Manhattan')
  })

  it('ignores case and surrounding whitespace', () => {
    expect(boroughFromPlace({ city: '  brooklyn ' })).toBe('Brooklyn')
    expect(boroughFromPlace({ city: 'KINGS COUNTY' })).toBe('Brooklyn')
  })

  it('checks subregion, then city, then district', () => {
    // subregion wins outright when it maps.
    expect(boroughFromPlace({ subregion: 'Kings County', city: 'Manhattan' })).toBe('Brooklyn')
    // an unmappable subregion falls through to city.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Queens' })).toBe('Queens')
    // and then to district.
    expect(boroughFromPlace({ subregion: 'Nassau County', city: 'Hempstead', district: 'Bronx' })).toBe('Bronx')
  })

  it('returns null for a place outside NYC rather than guessing', () => {
    // Not an error state — the caller falls through to the next source.
    expect(boroughFromPlace({ subregion: 'Suffolk County', city: 'Boston' })).toBeNull()
  })

  it('returns null for empty, null and undefined input', () => {
    expect(boroughFromPlace({})).toBeNull()
    expect(boroughFromPlace({ subregion: null, city: null, district: null })).toBeNull()
    expect(boroughFromPlace({ city: '' })).toBeNull()
    expect(boroughFromPlace(null)).toBeNull()
    expect(boroughFromPlace(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/boroughs.test.ts`
Expected: FAIL — `Cannot find module '../../utils/boroughs'`.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/utils/boroughs.ts`:

```ts
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
  'new york': 'Manhattan',
  'new york city': 'Manhattan',
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
  for (const field of [place.subregion, place.city, place.district]) {
    if (!field) continue
    const hit = ALIASES[field.trim().toLowerCase()]
    if (hit) return hit
  }
  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc --noEmit && npx jest __tests__/utils/boroughs.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add utils/boroughs.ts __tests__/utils/boroughs.test.ts
git commit -m "feat: map reverse-geocode results to NYC boroughs

Handles the county names the OS actually returns (Kings County, Richmond
County) and checks subregion/city/district in order, because which field
carries the borough differs between iOS and Android."
```

---

## Task 3: Borough filter with auto-widen

Owns the rule that the entry screen is never empty. Returning `widened` as data rather than setting state keeps this pure and makes the empty-borough case directly testable.

**Files:**
- Create: `thirdspace-app/utils/locationFilter.ts`
- Create: `thirdspace-app/__tests__/utils/locationFilter.test.ts`

**Interfaces:**
- Consumes: `CommunityEvent`, `Borough` from `types/models`; `CommunityEvent.borough` from Task 1.
- Produces:
  - `export interface BoroughFilterResult { events: CommunityEvent[]; widened: boolean }`
  - `export function filterByBorough(events: CommunityEvent[], borough: Borough | null): BoroughFilterResult`

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/utils/locationFilter.test.ts`:

```ts
import { filterByBorough } from '../../utils/locationFilter'
import { Borough, CommunityEvent } from '../../types/models'

function event(id: string, borough?: Borough): CommunityEvent {
  return { id, title: id, borough } as unknown as CommunityEvent
}

describe('filterByBorough', () => {
  it('returns everything unfiltered when no borough is selected', () => {
    const events = [event('a', 'Brooklyn'), event('b', 'Queens')]
    expect(filterByBorough(events, null)).toEqual({ events, widened: false })
  })

  it('keeps only events in the selected borough', () => {
    const bk = event('a', 'Brooklyn')
    const result = filterByBorough([bk, event('b', 'Queens')], 'Brooklyn')
    expect(result.events).toEqual([bk])
    expect(result.widened).toBe(false)
  })

  it('always includes events that have no borough yet', () => {
    // Events created before this feature shipped must not vanish from the feed.
    const legacy = event('legacy')
    const result = filterByBorough([legacy, event('b', 'Queens')], 'Brooklyn')
    expect(result.events).toEqual([legacy])
    expect(result.widened).toBe(false)
  })

  it('widens to every borough when the selected one has nothing', () => {
    const events = [event('a', 'Queens'), event('b', 'Bronx')]
    const result = filterByBorough(events, 'Staten Island')
    expect(result.events).toEqual(events)
    expect(result.widened).toBe(true)
  })

  it('does not report widening when the feed is genuinely empty', () => {
    // Nothing to widen to — this is the "no events at all" empty state, and the
    // screen must not claim it fell back to all of NYC.
    expect(filterByBorough([], 'Brooklyn')).toEqual({ events: [], widened: false })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/utils/locationFilter.test.ts`
Expected: FAIL — `Cannot find module '../../utils/locationFilter'`.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/utils/locationFilter.ts`:

```ts
import { Borough, CommunityEvent } from '../types/models'

export interface BoroughFilterResult {
  events: CommunityEvent[]
  /** True when the borough had no events and the feed fell back to all boroughs. */
  widened: boolean
}

/**
 * Narrows the feed to one borough, but never to nothing: if the borough has no
 * upcoming events the full list is returned with `widened: true` so the screen can
 * explain itself. Events with no `borough` are always included — they predate the
 * field and must not disappear.
 */
export function filterByBorough(events: CommunityEvent[], borough: Borough | null): BoroughFilterResult {
  if (!borough) return { events, widened: false }

  const matches = events.filter((e) => e.borough === undefined || e.borough === borough)
  if (matches.length === 0 && events.length > 0) return { events, widened: true }
  return { events: matches, widened: false }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc --noEmit && npx jest __tests__/utils/locationFilter.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add utils/locationFilter.ts __tests__/utils/locationFilter.test.ts
git commit -m "feat: add borough feed filter that widens rather than emptying

Returns widened as data so the rule stays pure and directly testable, and
keeps borough-less legacy events visible in every borough."
```

---

## Task 4: expo-location wrapper

The only unit that touches the native module, kept thin so everything above it is testable without it. **This task changes `app.json` and therefore requires a fresh EAS build before it reaches a device outside Expo Go.**

**Files:**
- Create: `thirdspace-app/services/location.ts`
- Create: `thirdspace-app/__tests__/services/location.test.ts`
- Modify: `thirdspace-app/app.json` (`plugins` array)
- Modify: `thirdspace-app/package.json` (dependency, via `npx expo install`)

**Interfaces:**
- Consumes: `boroughFromPlace` (Task 2), `getOnboardingPrefs` from `services/preferences`.
- Produces: `export async function detectBorough(): Promise<Borough | null>` — never rejects.

- [ ] **Step 1: Install the dependency**

Run:
```bash
npx expo install expo-location
```

- [ ] **Step 2: Declare the plugin and permission copy**

In `app.json`, replace the `"plugins"` array with:

```json
    "plugins": [
      "expo-router",
      "expo-apple-authentication",
      "expo-web-browser",
      [
        "expo-location",
        {
          "locationWhenInUsePermission": "Your Third Space uses your location to show events happening in your borough."
        }
      ]
    ],
```

Foreground permission only — there is no background location in this feature.

- [ ] **Step 3: Write the failing test**

Create `thirdspace-app/__tests__/services/location.test.ts`. Note the `mock`-prefix rule from Global Constraints:

```ts
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx jest __tests__/services/location.test.ts`
Expected: FAIL — `Cannot find module '../../services/location'`.

- [ ] **Step 5: Write the implementation**

Create `thirdspace-app/services/location.ts`:

```ts
import * as Location from 'expo-location'
import { Borough } from '../types/models'
import { boroughFromPlace } from '../utils/boroughs'
import { getOnboardingPrefs } from './preferences'

/** A slow or indoor fix must never hold up the entry screen. */
const FIX_TIMEOUT_MS = 5000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
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

    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') return null

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
```

- [ ] **Step 6: Run the full suite**

Run: `npx tsc --noEmit && npx jest`
Expected: green. If jest cannot resolve `expo-location`, confirm the `jest.mock` call is present at the top of the test file — the module is never imported outside this service.

- [ ] **Step 7: Commit**

```bash
git add services/location.ts __tests__/services/location.test.ts app.json package.json package-lock.json
git commit -m "feat: add expo-location wrapper that resolves a borough

Never throws: opt-out, denial, GPS failure, a 5s timeout and non-NYC
locations all resolve to null so callers fall through. Requires a fresh EAS
build for the new native module."
```

---

## Task 5: Persist the manual override

A manual choice is sticky and permanent until changed. "All of NYC" is itself a choice, so the stored shape must distinguish *chose all of NYC* (`{ borough: null }`) from *never chose* (no record).

**Files:**
- Modify: `thirdspace-app/services/preferences.ts` (append)
- Modify: `thirdspace-app/__tests__/services/preferences.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `Borough` from `types/models`, `EVENT_CATEGORIES`-style constant `BOROUGHS` from `constants/categories`.
- Produces:
  - `export interface LocationOverride { borough: Borough | null }`
  - `export async function setLocationOverride(borough: Borough | null): Promise<void>`
  - `export async function getLocationOverride(): Promise<LocationOverride | null>` — `null` means *no override stored*.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/services/preferences.test.ts`:

```ts
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
```

Widen the existing import at the top of the file to:

```ts
import {
  getOnboardingPrefs, setOnboardingPrefs,
  getLocationOverride, setLocationOverride,
} from '../../services/preferences'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/preferences.test.ts`
Expected: FAIL — `getLocationOverride is not a function`.

- [ ] **Step 3: Write the implementation**

Append to `services/preferences.ts` (and add the two imports at the top):

```ts
import { Borough } from '../types/models'
import { BOROUGHS } from '../constants/categories'
```

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc --noEmit && npx jest __tests__/services/preferences.test.ts`
Expected: PASS — the 6 existing onboarding tests plus 7 new ones.

- [ ] **Step 5: Commit**

```bash
git add services/preferences.ts __tests__/services/preferences.test.ts
git commit -m "feat: persist a manual borough override

Stored under its own key so clearing it never disturbs onboardingPrefs, and
shaped so 'All of NYC' is distinguishable from 'never chose'."
```

---

## Task 6: The resolution chain as a shared store

**Why a module store, not `useState`:** the picker is a separate route from Discover. Two `useState` hook instances would not see each other's writes, so choosing a borough in the modal would not update the feed behind it. `hooks/useDiscoverFilters.ts` already solves this with a module-level store plus `useSyncExternalStore`; follow that pattern exactly.

**Files:**
- Create: `thirdspace-app/hooks/useUserLocation.ts`
- Create: `thirdspace-app/__tests__/hooks/useUserLocation.test.tsx`

**Interfaces:**
- Consumes: `detectBorough` (Task 4), `getLocationOverride`/`setLocationOverride` (Task 5).
- Produces:
  - `export type LocationSource = 'manual' | 'gps' | 'profile' | 'default'`
  - `export function setBorough(next: Borough | null): void`
  - `export async function resolveLocation(profileBorough: Borough | null): Promise<void>`
  - `export function useUserLocation(): { borough: Borough | null; source: LocationSource; loading: boolean; setBorough: typeof setBorough }`

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/hooks/useUserLocation.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useUserLocation, resolveLocation, setBorough } from '../../hooks/useUserLocation'
import { detectBorough } from '../../services/location'
import { getLocationOverride, setLocationOverride } from '../../services/preferences'

jest.mock('../../services/location', () => ({ detectBorough: jest.fn() }))
jest.mock('../../services/preferences', () => ({
  getLocationOverride: jest.fn(),
  setLocationOverride: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(getLocationOverride as jest.Mock).mockResolvedValue(null)
  ;(detectBorough as jest.Mock).mockResolvedValue(null)
  ;(setLocationOverride as jest.Mock).mockResolvedValue(undefined)
})

describe('useUserLocation', () => {
  it('uses the GPS borough when there is no manual override', async () => {
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBe('Brooklyn')
    expect(result.current.source).toBe('gps')
  })

  it('prefers a manual override over GPS, and does not even ask for a fix', async () => {
    ;(getLocationOverride as jest.Mock).mockResolvedValue({ borough: 'Manhattan' })
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBe('Manhattan')
    expect(result.current.source).toBe('manual')
    expect(detectBorough).not.toHaveBeenCalled()
  })

  it('treats a stored All of NYC as a manual choice that suppresses GPS', async () => {
    ;(getLocationOverride as jest.Mock).mockResolvedValue({ borough: null })
    ;(detectBorough as jest.Mock).mockResolvedValue('Brooklyn')
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Queens') })
    expect(result.current.borough).toBeNull()
    expect(result.current.source).toBe('manual')
    expect(detectBorough).not.toHaveBeenCalled()
  })

  it('falls back to the signup borough when GPS yields nothing', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation('Bronx') })
    expect(result.current.borough).toBe('Bronx')
    expect(result.current.source).toBe('profile')
  })

  it('falls back to all of NYC when there is no profile borough either', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    expect(result.current.borough).toBeNull()
    expect(result.current.source).toBe('default')
  })

  it('clears loading once resolution finishes', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('shares state across separate hook instances so the picker updates the feed', async () => {
    // The picker is a different route from Discover — this is the whole reason
    // this is a module store rather than useState.
    const feed = renderHook(() => useUserLocation())
    const picker = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    act(() => { picker.result.current.setBorough('Staten Island') })
    expect(feed.result.current.borough).toBe('Staten Island')
    expect(feed.result.current.source).toBe('manual')
  })

  it('persists a manual pick', async () => {
    const { result } = renderHook(() => useUserLocation())
    await act(async () => { await resolveLocation(null) })
    act(() => { result.current.setBorough('Queens') })
    expect(setLocationOverride).toHaveBeenCalledWith('Queens')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/hooks/useUserLocation.test.tsx`
Expected: FAIL — `Cannot find module '../../hooks/useUserLocation'`.

- [ ] **Step 3: Write the implementation**

Create `thirdspace-app/hooks/useUserLocation.ts`:

```ts
import { useSyncExternalStore } from 'react'
import { Borough } from '../types/models'
import { detectBorough } from '../services/location'
import { getLocationOverride, setLocationOverride } from '../services/preferences'

export type LocationSource = 'manual' | 'gps' | 'profile' | 'default'

interface LocationState {
  borough: Borough | null
  source: LocationSource
  loading: boolean
}

// Module-level, not useState: the borough picker is a separate route from Discover,
// so both must read one shared source of truth. Same pattern as useDiscoverFilters.
let state: LocationState = { borough: null, source: 'default', loading: true }
const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function getSnapshot(): LocationState {
  return state
}

/** A deliberate choice. Wins over GPS permanently, until changed again. */
export function setBorough(next: Borough | null): void {
  state = { borough: next, source: 'manual', loading: false }
  emit()
  setLocationOverride(next).catch(() => {
    // A failed write only costs persistence across launches, not this session.
  })
}

/**
 * Runs the resolution chain: manual > gps > profile > default. Safe to call more
 * than once; each call fully overwrites the state.
 */
export async function resolveLocation(profileBorough: Borough | null): Promise<void> {
  state = { ...state, loading: true }
  emit()

  const override = await getLocationOverride()
  if (override) {
    state = { borough: override.borough, source: 'manual', loading: false }
    emit()
    return
  }

  const gps = await detectBorough()
  if (gps) {
    state = { borough: gps, source: 'gps', loading: false }
    emit()
    return
  }

  if (profileBorough) {
    state = { borough: profileBorough, source: 'profile', loading: false }
    emit()
    return
  }

  state = { borough: null, source: 'default', loading: false }
  emit()
}

export function useUserLocation() {
  const snap = useSyncExternalStore(subscribe, getSnapshot)
  return { borough: snap.borough, source: snap.source, loading: snap.loading, setBorough }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsc --noEmit && npx jest __tests__/hooks/useUserLocation.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add hooks/useUserLocation.ts __tests__/hooks/useUserLocation.test.tsx
git commit -m "feat: resolve the active borough through a shared store

manual > gps > profile > default. A module store rather than useState because
the picker is a separate route and must update the feed behind it."
```

---

## Task 7: Pressable chip and the borough picker route

**Files:**
- Modify: `thirdspace-app/components/ui/CityChip.tsx`
- Create: `thirdspace-app/app/(app)/borough-picker.tsx`
- Modify: `thirdspace-app/app/(app)/_layout.tsx`
- Modify: `thirdspace-app/__tests__/components/ui/Chip.test.tsx` (append two cases)

**Interfaces:**
- Consumes: `useUserLocation`, `setBorough` (Task 6); `BOROUGHS` from `constants/categories`.
- Produces: `CityChip` gains `onPress?: () => void`; route `/(app)/borough-picker`.

- [ ] **Step 1: Write the failing test**

Append to `__tests__/components/ui/Chip.test.tsx`:

```tsx
  it('stays a plain view when no press handler is given', () => {
    // The hoster Events screen renders it as a static label.
    const { queryByRole } = render(<CityChip label="NYC + Brooklyn" />)
    expect(queryByRole('button')).toBeNull()
  })

  it('becomes a button that announces what it changes', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(<CityChip label="Brooklyn" onPress={onPress} />)
    fireEvent.press(getByLabelText('Change location, currently Brooklyn'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
```

Widen the file's testing-library import to include `fireEvent`:

```tsx
import { fireEvent, render } from '@testing-library/react-native'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/components/ui/Chip.test.tsx`
Expected: FAIL — `CityChip` does not accept `onPress`, so no accessible button exists.

- [ ] **Step 3: Make the chip optionally pressable**

Replace `components/ui/CityChip.tsx` entirely:

```tsx
import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { palette, radius, space } from '../../constants/design'
import { Meta } from './Text'

interface CityChipProps {
  label: string
  /** Omit for a static label — the hoster Events screen uses it that way. */
  onPress?: () => void
}

export function CityChip({ label, onPress }: CityChipProps) {
  const content = <Meta role="eyebrow" tone="ink">{label}</Meta>

  if (!onPress) return <View style={styles.chip}>{content}</View>

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.chip}
      accessibilityRole="button"
      accessibilityLabel={`Change location, currently ${label}`}
    >
      {content}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: palette.rule,
    borderRadius: radius.chip,
    paddingHorizontal: space.sm + 1,
    paddingVertical: space.xs + 1,
  },
})
```

- [ ] **Step 4: Create the picker route**

Create `thirdspace-app/app/(app)/borough-picker.tsx`:

```tsx
import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { BOROUGHS } from '../../constants/categories'
import { Borough } from '../../types/models'
import { useUserLocation } from '../../hooks/useUserLocation'
import { Screen } from '../../components/ui/Screen'
import { Display, Body, Meta } from '../../components/ui/Text'
import { BackButton } from '../../components/ui/BackButton'
import { palette, radius, space } from '../../constants/design'

/** null is a real option — "All of NYC" — not the absence of one. */
const OPTIONS: { label: string; value: Borough | null }[] = [
  { label: 'All of NYC', value: null },
  ...BOROUGHS.map((b) => ({ label: b, value: b as Borough | null })),
]

export default function BoroughPicker() {
  const router = useRouter()
  const { borough, setBorough } = useUserLocation()

  const choose = (value: Borough | null) => {
    setBorough(value)
    router.back()
  }

  return (
    <Screen tone="cream">
      <StatusBar style="dark" />
      <View style={styles.header}>
        <BackButton />
        <Display role="screenTitle">Location</Display>
      </View>

      <Body role="bodySm" style={styles.hint}>
        Pick a borough to see what&apos;s happening near you. This overrides your location.
      </Body>

      <View style={styles.card}>
        {OPTIONS.map((option, index) => {
          const isSelected = option.value === borough
          const isLast = index === OPTIONS.length - 1
          return (
            <TouchableOpacity
              key={option.label}
              style={[styles.row, isLast && styles.rowLast]}
              onPress={() => choose(option.value)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <Display>{option.label}</Display>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={22} color={palette.clay} />
              ) : (
                <View style={styles.radioEmpty} />
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      <Meta style={styles.footnote}>Change this any time from the chip on Discover.</Meta>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.md },
  hint: { marginHorizontal: space.xl, marginBottom: space.lg },
  card: {
    marginHorizontal: space.xl,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: palette.rule,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: space.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.rule,
  },
  rowLast: { borderBottomWidth: 0 },
  radioEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: palette.rule },
  footnote: { marginHorizontal: space.xl, marginTop: space.md + 2 },
})
```

- [ ] **Step 5: Register it as a modal**

In `app/(app)/_layout.tsx`, add one line inside the `<Stack>`, after the `filters` entry:

```tsx
        <Stack.Screen name="borough-picker" options={{ presentation: 'modal' }} />
```

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: green. If `tokens.test.ts` names `borough-picker.tsx`, a literal hex slipped in — replace it with a `palette` token.

**Note on typed routes:** adding a route file can leave `typedRoutes` stale. If `tsc` reports that `'/(app)/borough-picker'` is not a valid href, run `npx expo start` for ~25 seconds, kill it, and re-run `tsc`.

- [ ] **Step 7: Commit**

```bash
git add components/ui/CityChip.tsx "app/(app)/borough-picker.tsx" "app/(app)/_layout.tsx" __tests__/components/ui/Chip.test.tsx
git commit -m "feat: add a borough picker modal and make CityChip pressable

onPress is optional so the hoster Events screen keeps its static label."
```

---

## Task 8: Wire it into Discover

The payoff task. Keep every existing data hook and handler as-is — this adds a filter stage and a chip target, nothing else.

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/index.tsx`

**Interfaces:**
- Consumes: `useUserLocation`, `resolveLocation` (Task 6); `filterByBorough` (Task 3).
- Produces: nothing importable.

- [ ] **Step 1: Add the imports**

In `app/(app)/(attender)/index.tsx`, after the existing `useDiscoverFilters` import:

```tsx
import { useUserLocation, resolveLocation } from '../../../hooks/useUserLocation'
import { filterByBorough } from '../../../utils/locationFilter'
```

`useEffect` is also needed — widen the React import to `import React, { useEffect, useMemo } from 'react'`.

- [ ] **Step 2: Resolve the location once the profile is known**

Inside the component, after the existing `const { filters, query, ... } = useDiscoverFilters()` line:

```tsx
  // Only `borough` is read here — the picker route owns setBorough.
  const { borough } = useUserLocation()

  // The profile supplies the fallback borough, so wait for it to load before
  // resolving. resolveLocation fully overwrites state, so a re-run is harmless.
  useEffect(() => {
    if (profileLoading) return
    resolveLocation(profile?.borough ?? null)
  }, [profileLoading, profile?.borough])
```

This requires `loading` from the existing profile hook — change that line to:

```tsx
  const { profile, loading: profileLoading } = useProfile(user?.uid)
```

- [ ] **Step 3: Add the borough stage to the feed**

Replace the existing `visible` memo:

```tsx
  const visible = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])
```

with:

```tsx
  const filtered = useMemo(() => applyEventFilters(events, filters, query), [events, filters, query])
  // Location composes around the existing filters rather than being folded into
  // EventFilters, so "Clear filters" never silently resets the user's location.
  const { events: visible, widened } = useMemo(() => filterByBorough(filtered, borough), [filtered, borough])
```

- [ ] **Step 4: Make the chip live**

Replace:

```tsx
            <CityChip label="NYC + Brooklyn" />
```

with:

```tsx
            <CityChip
              label={borough ?? 'All of NYC'}
              onPress={() => router.push('/(app)/borough-picker')}
            />
```

`setBorough` is deliberately not called here — the picker route owns writes, this screen only reads.

- [ ] **Step 5: Explain a widened feed**

Immediately before the `{loading ? (` block that renders the feed, add:

```tsx
        {widened ? (
          <Meta role="eyebrow" tone="clay" style={styles.widenedNotice}>
            No events in {borough} yet — showing all of NYC
          </Meta>
        ) : null}
```

And add to the `StyleSheet.create` block:

```tsx
  widenedNotice: { marginBottom: space.md },
```

- [ ] **Step 6: Run everything**

Run: `npx tsc --noEmit && npx jest`
Expected: green, all suites.

- [ ] **Step 7: Verify on a device**

```bash
npx expo start
```

Check, in order:

1. Grant the permission when prompted — the chip should show your borough (Brooklyn in NYC; outside NYC it falls back to your signup borough).
2. Deny it on a fresh install — the chip should show your signup borough, with **no** error and no repeat prompt.
3. Tap the chip → pick a different borough → the feed behind the modal updates. This is the module-store behaviour; if the feed does not change, the store was implemented as `useState`.
4. Pick a borough with no events → the widened notice appears and the feed shows everything.
5. Force-quit and reopen → the manual pick survives and GPS does **not** override it.

- [ ] **Step 8: Commit**

```bash
git add "app/(app)/(attender)/index.tsx"
git commit -m "feat: default the Discover feed to the user's borough

The chip is now live and opens the picker; the feed widens with an
explanation rather than showing an empty entry screen."
```

---

## Task 9: Documentation and optional backfill

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md`
- Create: `thirdspace-app/scripts/backfillEventBoroughs.ts` (optional)

- [ ] **Step 1: Update the codemap**

In the source tree block, add `useUserLocation.ts` to the hooks list and `location.ts` to the services list, and bump both counts. Add `borough-picker.tsx` to the `(app)` routes.

Add to **Key Invariants & Gotchas**:

```markdown
- **Location resolves through a chain, never blocks** — `hooks/useUserLocation.ts` is a module
  store (like `useDiscoverFilters`, because the picker is a separate route from Discover) that
  resolves `manual > gps > profile > default`. `services/location.ts` never throws: opt-out,
  denial, GPS failure, a 5s timeout and non-NYC locations all resolve to `null` and fall through.
- **`CommunityEvent.borough` is optional and that is load-bearing** — events created before
  location filtering have none, and `filterByBorough` shows those in EVERY borough rather than
  hiding them. Making it required needs a backfill first.
- **The feed widens rather than emptying** — a borough with no events falls back to all of NYC
  with an on-screen explanation, so the entry screen is never blank.
- **A manual borough pick is permanent until changed** — GPS never silently overrides it, and
  "All of NYC" is a real stored choice (`{ borough: null }`), distinct from never having chosen.
```

- [ ] **Step 2: Commit the docs**

```bash
git add docs/CODEMAPS/thirdspace-codemap.md
git commit -m "docs: record the location resolution chain in the codemap"
```

- [ ] **Step 3 (optional): Backfill existing events**

Only worth doing once there are enough legacy events that showing them in every borough is noticeably wrong. Not a prerequisite for anything above.

Create `thirdspace-app/scripts/backfillEventBoroughs.ts`:

```ts
/**
 * One-off: copy each venue's borough onto its events. Events created after the
 * location feature shipped already have it; this only fills the older ones.
 *
 * Run with the Firebase Admin SDK and a service-account key, NOT from the app.
 */
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, applicationDefault } from 'firebase-admin/app'

async function main(): Promise<void> {
  initializeApp({ credential: applicationDefault() })
  const db = getFirestore()

  const events = await db.collection('events').get()
  const venues = new Map<string, string>()
  let updated = 0

  for (const event of events.docs) {
    if (event.get('borough')) continue
    const venueId = event.get('venueId') as string
    if (!venues.has(venueId)) {
      const venue = await db.collection('venues').doc(venueId).get()
      const borough = venue.get('borough') as string | undefined
      if (!borough) continue
      venues.set(venueId, borough)
    }
    await event.ref.update({ borough: venues.get(venueId) })
    updated++
  }

  console.log(`backfilled ${updated} of ${events.size} events`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

---

## Self-review notes

Checked against `docs/superpowers/specs/2026-07-28-location-based-events-design.md`:

- **Every spec section maps to a task.** Resolution chain → Task 6; `utils/boroughs.ts` → Task 2; `utils/locationFilter.ts` → Task 3; `services/location.ts` → Task 4; picker route → Task 7; data model → Task 1; UI (chip, widened line) → Tasks 7–8; error handling → Tasks 4 and 6; testing → the test steps in Tasks 1–7; build impact → Task 4 Steps 1–2; backfill → Task 9 Step 3.
- **Type consistency.** `Borough | null` is the borough type in `filterByBorough`, `detectBorough`, `setBorough`, `resolveLocation`, `LocationOverride.borough` and `CityChip`'s label expression throughout. `LocationSource` values (`manual`/`gps`/`profile`/`default`) match the spec's table exactly. `BoroughFilterResult` is destructured as `{ events, widened }` in Task 8 exactly as defined in Task 3.
- **One spec detail was sharpened during planning.** The spec says `useUserLocation` "persists manual overrides" but does not say how the picker and the feed stay in sync. They are separate routes, so a `useState` hook would not propagate the choice. Task 6 therefore specifies a module store on the existing `useDiscoverFilters` pattern, and Task 6's test and Task 8's device check both assert cross-instance propagation.
- **`resolveLocation` takes the profile borough as a parameter** rather than calling `useProfile` internally, so the store stays free of React-hook dependencies and is testable without mocking auth. Discover owns the profile read it already performs.
