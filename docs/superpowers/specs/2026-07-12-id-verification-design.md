# Simulated ID Verification — Design

_Date: 2026-07-12 · Feature branch: feature/role-dashboards · App: thirdspace-app_

## Problem

The onboarding carousel already promises "ID-verified people" (slide 1), and the
`Profile` model carries a `verified: boolean` flag — but no verification step
exists anywhere, so `verified` is always `false`. This feature adds a verification
step to the onboarding flow that makes good on that promise.

## Decisions (locked)

| Question | Decision |
|----------|----------|
| Verification type | **Simulated** — capture ID + selfie on-device, fake a short review, mark verified. No third-party KYC, no cost, no native SDK. |
| Placement / audience | **New dedicated screen, attenders only.** Inserted after `create-profile`. Hosters are unaffected (they have no `profiles/{uid}` doc, which is where `verified` lives). |
| Required vs skippable | **Skippable** — "Verify now" or "Skip for now"; either way the user enters the app. No change to the auth routing gate; backward-compatible with existing accounts. |
| Image handling | **Capture only, never uploaded.** Photos are shown on-device for preview and discarded. Nothing sensitive persisted. |
| How `verified` is set | **Option A — relax the Firestore rule** so the owner may set `verified` + `verifiedAt`. A server-side trigger was rejected: the review is simulated, so a trigger would flip the flag instantly with zero real checking — infrastructure with no added trust. |

## Flow

```
onboarding → sign-up → role-select
   ↓ (attender)
create-profile
   ↓  (was: router.replace('/(app)'))
verify-identity        ← NEW
   ↓
app (Feed)
```

`verify-identity` lives under `app/(app)/` (not `(auth)/`). By this point the user
already has a profile, so `resolveAuthRoute` considers them set-up-complete and the
routing guard leaves them alone. This lets one screen file serve **two entry points**:

1. **Onboarding** — reached from `create-profile` after the profile is written.
2. **Later** — a "Get verified" row on the Profile screen (shown only when `!verified`),
   for users who skipped.

## Screen: `verify-identity.tsx` (state machine)

- **capture** — two capture slots: *Photo of your ID* and *Selfie*. Each opens
  camera/library and shows a preview thumbnail once captured. Primary button
  "Verify now" is disabled until **both** are captured. A "Skip for now" link is
  always visible.
- **verifying** — spinner + "Verifying your identity…", a simulated delay
  (`VERIFY_DELAY_MS`, ~2000ms).
- **done** — "✓ You're verified" confirmation, then continue into the app.
- **already-verified short-circuit** — if `profile.verified` is already true on
  mount, render the done state directly (relevant when opened from Profile).
- **error** — if `submitVerification` throws, return to capture state with an
  inline error and re-enabled button.

### Exit behavior

The screen accepts a `from` route param:
- default (onboarding): Skip and Done both `router.replace('/(app)')`.
- `from=profile`: Skip and Done both `router.back()`.

### Capture-state helper (unit-testable)

Extract the pure decision logic so it can be tested without rendering RN:

```ts
// utils/verification.ts
export type CaptureState = { idUri: string | null; selfieUri: string | null }
export function canSubmitVerification(s: CaptureState): boolean {
  return s.idUri !== null && s.selfieUri !== null
}
```

## Image capture

Add a **local-only** helper to `services/photos.ts` — capture without upload:

```ts
export type CaptureKind = 'id' | 'selfie'
// Returns a local URI or null (cancel/deny). Offers camera + library.
// Aspect: 'id' → [3,2] rectangle, 'selfie' → [1,1].
export async function captureImage(kind: CaptureKind): Promise<string | null>
```

This mirrors the existing `pickImage` but is separate because the ID kinds,
aspect ratios, and camera affordance differ, and because these images must **not**
flow into the `uploadProfilePhoto` path.

## Data

### Type change (`types/models.ts`)

Add to `Profile`:

```ts
verifiedAt?: Timestamp   // set when simulated verification completes; absent otherwise
```

### Service (`services/profiles.ts`)

```ts
export async function submitVerification(uid: string): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), {
    verified: true,
    verifiedAt: serverTimestamp(),
  })
}
```

### Firestore rules (`firestore.rules`)

The profiles `update` rule currently denies any diff touching `verified`. Relax so
the **owner** may set `verified`/`verifiedAt`, while keeping the existing
points/tier constraints. Concretely, remove `verified` from the forbidden
`affectedKeys` set (the write is still owner-gated by `request.auth.uid == uid`).

> Invariant change: the codemap notes `verified` as protected. Update that note to
> reflect that, post-feature, the owner may self-set it (acceptable because
> verification is simulated). If real KYC is added later, move to a server-set model.

## Profile screen change (`(attender)/profile.tsx`)

In the Account card, add a row shown **only when `!profile?.verified`**:

```
Get verified   →  router.push('/(app)/verify-identity?from=profile')
```

The existing verified checkmark badge (already rendered next to the name) is the
success indicator — no new badge component.

## Files touched

| File | Change |
|------|--------|
| `app/(app)/verify-identity.tsx` | **New** screen (state machine above) |
| `app/(auth)/create-profile.tsx` | On submit, navigate to `verify-identity` instead of `/(app)` |
| `app/(app)/(attender)/profile.tsx` | "Get verified" row when unverified |
| `types/models.ts` | `verifiedAt?: Timestamp` on `Profile` |
| `services/photos.ts` | `captureImage(kind)` local-only helper |
| `services/profiles.ts` | `submitVerification(uid)` |
| `utils/verification.ts` | **New** `canSubmitVerification` pure helper |
| `firestore.rules` | Allow owner to set `verified`/`verifiedAt` |

## Testing

- **Unit** — `submitVerification` (mocked Firestore `updateDoc`); `canSubmitVerification`
  truth table (neither / id-only / selfie-only / both).
- **Rules** — extend `__tests__/rules/firestore.rules.test.ts`: owner **can** now set
  `verified`/`verifiedAt`; a non-owner still cannot; points/tier constraints still hold.
- **Reuse** — verified-badge UI already exists in profile/member views; no new badge.

## Out of scope (YAGNI)

- Real KYC / third-party identity providers.
- Uploading or storing ID/selfie images.
- Host verification (attenders only).
- A blocking gate that requires verification to enter the app.
- Re-verification / expiry of `verifiedAt`.
