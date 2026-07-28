# Location-Based Events — Design

_Wires the Discover entry screen to the user's real location. Closes the loop on the Location
opt-in shipped in `5556ba1` (the permission carousel replacement), which has stored a preference
since then with nothing reading it._

## Problem

Three problems, one pass.

1. **The Location opt-in is a dangling promise.** `app/(auth)/onboarding.tsx` asks the user to
   enable Location and writes `{ location: boolean }` via `setOnboardingPrefs`. Nothing in the app
   has ever read it back. Users grant a permission that does nothing.
2. **Discover is not location-aware.** The header chip is a hardcoded, non-interactive
   `<CityChip label="NYC + Brooklyn" />`. Every user in every borough sees the same feed.
3. **There are no coordinates anywhere.** `Venue` is `{ name, borough, neighborhood, description }`
   — no address, no lat/lng. `CommunityEvent` denormalizes `neighborhood` only, and the model
   comment records that `borough` was *deliberately* not copied.

Problem 3 is why this matches on **borough** rather than distance. True proximity would require
adding addresses to venues, geocoding them, backfilling, and storing coordinates per event — a
data-layer project, not a feed feature.

## Decisions (locked)

- **GPS is used to resolve an area, not a distance.** Reverse-geocode the fix to one of the five
  boroughs. No kilometre figures, no radius, no map.
- **Borough granularity, not neighborhood.** `neighborhood` is free text — `venue-setup` lets a
  host type anything while `FilterSheet` hardcodes six Brooklyn names. GPS returning
  `"Williamsburg"` would not reliably match host input. `Borough` is a closed set of five.
- **`CommunityEvent.borough` is optional.** No migration, no backfill gate. Legacy events without
  it stay visible in every borough view rather than vanishing on deploy.
- **The feed filters, but never to nothing.** If the resolved borough has zero upcoming events,
  widen to all boroughs and say why.
- **The onboarding opt-in is honoured.** If the user declined Location on Get Started, the OS
  prompt is never raised.
- **Attender-only.** Hosters see their own events on Overview; location does not apply there.
- No Firestore rules change and no composite index (both verified — see Constraints).

## Resolution chain

Four sources, first match wins:

| Priority | Source | Condition |
|----------|--------|-----------|
| 1 | `manual` | User picked a borough in the picker. Persisted; always wins. |

| 2 | `gps` | Onboarding opt-in true, OS permission granted, fix maps to a borough. |
| 3 | `profile` | Denied, failed, timed out, or unmappable → `profiles/{uid}.borough` from `create-profile`. |
| 4 | `default` | No profile borough → `null`, meaning All of NYC. |

`source` is exposed alongside `borough` so the UI can explain itself (a `gps` result reads
differently from a `default` one) and so tests can assert *why* a borough was chosen, not just
which.

**A manual choice is sticky and permanent until changed.** GPS never silently overrides it on a
later launch — a user who deliberately selected Manhattan while sitting in Brooklyn keeps
Manhattan. Selecting **All of NYC** in the picker is itself a manual choice: it persists as
`{ source: 'manual', borough: null }` and likewise suppresses GPS. The override is stored under
its own AsyncStorage key, `locationOverride`, separate from `onboardingPrefs` so that clearing one
never disturbs the other.

## Architecture

Four new units and one route. The two pure modules hold everything worth testing; the service is
a thin, mockable boundary around the native module.

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `utils/boroughs.ts` | `boroughFromPlace(place) → Borough \| null`. Pure mapping over a plain `{ subregion?, city?, district? }` shape — deliberately *not* typed as expo-location's `LocationGeocodedAddress`, so the module stays dependency-free and testable with plain objects. | nothing |
| `utils/locationFilter.ts` | `filterByBorough(events, borough) → { events, widened }`. Pure; owns the auto-widen rule. | nothing |
| `services/location.ts` | `detectBorough() → Promise<Borough \| null>`. Wraps expo-location. Never throws. | expo-location, `utils/boroughs` |
| `hooks/useUserLocation.ts` | Runs the resolution chain, exposes `{ borough, source, loading, setBorough }`, persists manual overrides. | the three above, `useProfile`, `preferences` |
| `app/(app)/borough-picker.tsx` | Modal route listing 5 boroughs + All of NYC. | `useUserLocation` |

### `utils/boroughs.ts`

Reverse geocoding does not return "Brooklyn" reliably. On iOS the borough usually lands in
`subregion`; on Android it is often `city` or `district`, and both platforms may return the county
name. The mapping must therefore accept several aliases per borough and check multiple fields:

| Borough | Aliases seen from reverse geocoding |
|---------|--------------------------------------|
| Brooklyn | `Brooklyn`, `Kings County`, `Kings` |
| Manhattan | `Manhattan`, `New York County`, `New York`, `New York City` |
| Queens | `Queens`, `Queens County` |
| Bronx | `Bronx`, `The Bronx`, `Bronx County` |
| Staten Island | `Staten Island`, `Richmond County`, `Richmond` |

Fields are checked in the order `subregion`, then `city`, then `district`, and the first field
that yields a match wins. Matching is case-insensitive and trimmed. Anything unrecognised —
including a user physically outside NYC — returns `null`, which falls through to the next source
in the chain. **A user in Boston is not an error state**; they simply get their profile borough or
All of NYC.

### `utils/locationFilter.ts`

```
filterByBorough(events, borough) → { events, widened }
```

- `borough === null` → `{ events, widened: false }` (All of NYC).
- Events whose `borough` is undefined are **always included** — legacy data must not disappear.
- If the filtered result is empty **and** the input was not, return all events with
  `widened: true`. Discover renders the explanatory line only when `widened` is true.

Returning `widened` rather than logging or setting state keeps the module pure and makes the
empty-borough case directly testable.

### `services/location.ts`

`detectBorough()` resolves to `Borough | null` and **never rejects**. It returns `null` on: opt-in
false, permission denied, GPS failure, timeout, or an unmappable place. A **5-second timeout**
races the position request so a slow or indoor GPS fix can never hang the entry screen.

Uses `Location.Accuracy.Low` — city-level accuracy is all a borough lookup needs, and it is
markedly faster and cheaper on battery than a high-accuracy fix.

## Data model

```ts
export interface CommunityEvent {
  // ...
  neighborhood: string
  /** Denormalized from the venue at creation. Optional: events created before
   *  location filtering shipped have none, and are shown in every borough. */
  borough?: Borough
}
```

`createEvent` copies `venue.borough` — venues already carry it, so no new host input is required
and `venue-setup` is untouched.

**Backfill is optional cleanup, not a prerequisite.** Because undefined-borough events are always
visible, the feature is correct on day one with zero migration. A one-off script can set `borough`
on existing events afterwards to tighten filtering.

## UI

The Discover header chip becomes pressable and reflects real state:

- `borough` set → the borough name, e.g. `Brooklyn`
- `borough === null` → `All of NYC`

Tapping opens `borough-picker`, a modal matching the existing `filters` modal pattern registered
in `app/(app)/_layout.tsx`. The picker lists the five boroughs plus All of NYC; choosing one sets
`source: 'manual'` and persists it.

When `widened` is true, a single `Meta` line sits above the feed:
_"No events in Queens yet — showing all of NYC."_

`CityChip` currently renders a static label. It gains an optional `onPress`; when absent it renders
exactly as today, so the hoster Events screen that also uses it is unaffected.

## Error handling

Location is an enhancement, never a blocker. Every failure degrades one step down the resolution
chain and the feed still renders.

| Failure | Behaviour |
|---------|-----------|
| Onboarding opt-in false | OS prompt never raised; fall to `profile` |
| Permission denied | Fall to `profile`; never re-prompt on later launches |
| GPS timeout (>5s) | Fall to `profile` |
| Place unmappable (outside NYC) | Fall to `profile` |
| Profile unavailable or no borough | `null` → All of NYC |

There is no error banner and no "enable location" nag. A user who declined gets a personalised
feed anyway, from the borough they gave at signup.

## Testing

| Target | Cases |
|--------|-------|
| `utils/boroughs.ts` | Each of the 5 boroughs from its aliases; county names; case/whitespace insensitivity; `subregion` vs `city` vs `district` precedence; unknown place → `null`; empty/undefined input → `null` |
| `utils/locationFilter.ts` | Filters to borough; `null` returns all with `widened: false`; empty borough result widens with `widened: true`; genuinely empty input does **not** report widened; undefined-borough events always included |
| `hooks/useUserLocation.ts` | Chain precedence (manual > gps > profile > default); opt-in false skips detection; persisted override survives remount |
| `services/location.ts` | Mocked expo-location: denied → `null`; throw → `null`; timeout → `null`; granted+mappable → borough |

Existing suites must stay green. `applyEventFilters` is untouched — location composes *around* it
rather than being folded into `EventFilters`, so no existing filter test changes.

## Constraints verified

- **Firestore rules need no change.** `match /events/{eventId}` `allow create` asserts only
  `venueId == request.auth.uid` and that the venue exists. It does not whitelist fields, so a new
  `borough` key writes fine. The `update` rule's `hasOnly(['registeredCount'])` branch is for
  non-owner registration counting and is unaffected.
- **No composite index.** Filtering stays client-side over the single existing
  `subscribeUpcomingEvents` subscription, consistent with the rest of the app.
- **Build impact.** `expo-location` is added to `app.json` `plugins` with an iOS
  `NSLocationWhenInUseUsageDescription` string and the Android fine/coarse permissions. It works
  in **Expo Go for development**; production and the `developmentClient` profile in `eas.json`
  both require a fresh EAS build. Accepted by the user on 2026-07-28.
- **Token discipline.** `__tests__/constants/tokens.test.ts` has an empty allowlist, so the picker
  route and any new component must contain no literal hex.

## Out of scope

Deliberately excluded; each is a larger project on its own.

- Distance in kilometres, proximity sorting, maps, radius controls
- Background or continuous location tracking
- Neighborhood-level matching (requires making `neighborhood` a closed set and migrating venues)
- Geocoding venue addresses to lat/lng
- Location for hosters
- Cities beyond NYC — `Borough` is a five-value union and the product is NYC-only today
