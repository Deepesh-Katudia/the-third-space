# ID Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a simulated, skippable ID-verification step to the attender onboarding flow that sets the profile's `verified` badge.

**Architecture:** A new `app/(app)/verify-identity.tsx` screen captures an ID photo + selfie on-device (never uploaded), shows a simulated review, then calls `submitVerification(uid)` which sets `profiles/{uid}.verified` + `verifiedAt`. The screen is reached after `create-profile` (onboarding) and from a "Get verified" row on the Profile screen (later). Firestore rules are relaxed so the owner may set `verified`.

**Tech Stack:** Expo SDK 54 / React Native, expo-router, Firebase v11 (Firestore), expo-image-picker, Jest + @firebase/rules-unit-testing.

## Global Constraints

- App display name in UI copy is exactly `Your Third Space` (never "The Third Space").
- No new runtime dependencies — use expo-image-picker, firebase, expo-router already installed.
- Images captured for verification are **never uploaded** and never persisted.
- Verification applies to **attenders only** (hosters have no `profiles/{uid}` doc).
- Verification is **skippable** — it must never block entry to the app; no change to `resolveAuthRoute`.
- Palette: background `#FBF7F2`, ink `#2C1810`, terracotta `#C4614A`, sage `#7A8C6E`, muted `#8C7B70`, border `rgba(242,197,160,0.5)`. Fonts: `DMSerifDisplay_400Regular` (headings), `DMSans_400Regular`/`DMSans_500Medium` (body).
- Commit messages: conventional commits (`feat:`, `test:`, `docs:`), no attribution trailer.

---

### Task 1: `verifiedAt` type + `submitVerification` service

**Files:**
- Modify: `thirdspace-app/types/models.ts` (add field to `Profile`)
- Modify: `thirdspace-app/services/profiles.ts` (add `submitVerification`)
- Test: `thirdspace-app/__tests__/services/profiles.test.ts` (add describe block)

**Interfaces:**
- Produces: `submitVerification(uid: string): Promise<void>` — calls `updateDoc(doc(db,'profiles',uid), { verified: true, verifiedAt: serverTimestamp() })`.
- Produces: `Profile.verifiedAt?: Timestamp`.

- [ ] **Step 1: Write the failing test**

Add to the end of `thirdspace-app/__tests__/services/profiles.test.ts`, and add `submitVerification` to the import on line 2 (`import { createProfile, updateProfile, getProfile, subscribeProfile, redeemReward, submitVerification } from '../../services/profiles'`):

```ts
describe('submitVerification', () => {
  it('marks the profile verified with a server timestamp', async () => {
    ;(updateDoc as jest.Mock).mockResolvedValue(undefined)
    await submitVerification('u1')
    expect(updateDoc).toHaveBeenCalledWith(
      { path: 'profiles/u1' },
      { verified: true, verifiedAt: '__serverTimestamp' }
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/services/profiles.test.ts -t submitVerification`
Expected: FAIL — `submitVerification is not a function` (not exported yet).

- [ ] **Step 3: Add the `verifiedAt` field to `Profile`**

In `thirdspace-app/types/models.ts`, inside `interface Profile`, add the field right after `verified: boolean`:

```ts
  verified: boolean
  verifiedAt?: Timestamp   // set when simulated ID verification completes; absent otherwise
  joinedAt: Timestamp
```

- [ ] **Step 4: Implement `submitVerification`**

In `thirdspace-app/services/profiles.ts`, append after `updateProfile` (the existing imports already include `doc`, `updateDoc`, `serverTimestamp`):

```ts
// Simulated ID verification: sets the verified badge. No real KYC — see the
// verify-identity screen. Firestore rules permit the owner to write `verified`.
export async function submitVerification(uid: string): Promise<void> {
  await updateDoc(doc(db, 'profiles', uid), {
    verified: true,
    verifiedAt: serverTimestamp(),
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/services/profiles.test.ts -t submitVerification`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add thirdspace-app/types/models.ts thirdspace-app/services/profiles.ts thirdspace-app/__tests__/services/profiles.test.ts
git commit -m "feat: add submitVerification service and verifiedAt profile field"
```

---

### Task 2: Relax Firestore rules to allow owner-set `verified`

**Files:**
- Modify: `thirdspace-app/firestore.rules` (profiles `update` rule)
- Test: `thirdspace-app/__tests__/rules/firestore.rules.test.ts`

**Interfaces:**
- Produces: the owner may set `verified`/`verifiedAt` on their own profile; non-owners and points/tier tampering still fail.

- [ ] **Step 1: Update the rules tests (failing first)**

In `thirdspace-app/__tests__/rules/firestore.rules.test.ts`, find the test named `owner cannot set points to an arbitrary value, mismatch tier, or escalate verified`. Rename it and **remove** the `verified` assertion so it reads:

```ts
test('owner cannot set points to an arbitrary value or mismatch tier', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 9999, tier: 'Insider' }))
  await assertFails(updateDoc(doc(me, 'profiles/me'), { points: 50, tier: 'Insider' }))
})
```

Then add a new test directly after it:

```ts
test('owner can set verified + verifiedAt; a stranger cannot', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'profiles/me'), { displayName: 'Me', points: 0, tier: 'Newcomer', verified: false })
  })
  const me = env.authenticatedContext('me').firestore()
  const stranger = env.authenticatedContext('stranger').firestore()
  await assertSucceeds(updateDoc(doc(me, 'profiles/me'), { verified: true, verifiedAt: new Date() }))
  await assertFails(updateDoc(doc(stranger, 'profiles/me'), { verified: true }))
})
```

- [ ] **Step 2: Run the rules tests to verify the new one fails**

Run: `cd thirdspace-app && npm run test:rules`
Expected: FAIL on `owner can set verified + verifiedAt` — the current rule denies the owner writing `verified` (the `assertSucceeds` throws). Other tests still pass.

- [ ] **Step 3: Relax the rule**

In `thirdspace-app/firestore.rules`, inside `match /profiles/{uid}`, **delete** this single line from the `allow update` condition:

```
        && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['verified'])
```

The rule becomes:

```
      allow update: if signedIn() && request.auth.uid == uid
        && (
          !request.resource.data.diff(resource.data).affectedKeys().hasAny(['points', 'tier'])
          || (
            isValidPointsDelta(request.resource.data.points - resource.data.points)
            && request.resource.data.tier == tierFor(request.resource.data.points)
          )
        );
```

- [ ] **Step 4: Run the rules tests to verify they pass**

Run: `cd thirdspace-app && npm run test:rules`
Expected: PASS — all rules tests green, including the new verified test.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/firestore.rules thirdspace-app/__tests__/rules/firestore.rules.test.ts
git commit -m "feat: allow profile owner to set verified flag"
```

---

### Task 3: `canSubmitVerification` pure helper

**Files:**
- Create: `thirdspace-app/utils/verification.ts`
- Test: `thirdspace-app/__tests__/utils/verification.test.ts`

**Interfaces:**
- Produces: `type CaptureState = { idUri: string | null; selfieUri: string | null }`
- Produces: `canSubmitVerification(s: CaptureState): boolean` — true only when both URIs are non-null.

- [ ] **Step 1: Write the failing test**

Create `thirdspace-app/__tests__/utils/verification.test.ts`:

```ts
import { canSubmitVerification } from '../../utils/verification'

describe('canSubmitVerification', () => {
  it('is false when neither image is captured', () => {
    expect(canSubmitVerification({ idUri: null, selfieUri: null })).toBe(false)
  })
  it('is false when only the ID is captured', () => {
    expect(canSubmitVerification({ idUri: 'file://id', selfieUri: null })).toBe(false)
  })
  it('is false when only the selfie is captured', () => {
    expect(canSubmitVerification({ idUri: null, selfieUri: 'file://selfie' })).toBe(false)
  })
  it('is true when both images are captured', () => {
    expect(canSubmitVerification({ idUri: 'file://id', selfieUri: 'file://selfie' })).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/utils/verification.test.ts`
Expected: FAIL — cannot find module `../../utils/verification`.

- [ ] **Step 3: Implement the helper**

Create `thirdspace-app/utils/verification.ts`:

```ts
// Local capture state for the verify-identity screen. Kept as a pure helper so
// the submit-enabled logic can be unit-tested without rendering the screen.
export type CaptureState = { idUri: string | null; selfieUri: string | null }

export function canSubmitVerification(state: CaptureState): boolean {
  return state.idUri !== null && state.selfieUri !== null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/utils/verification.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/utils/verification.ts thirdspace-app/__tests__/utils/verification.test.ts
git commit -m "feat: add canSubmitVerification helper"
```

---

### Task 4: `captureImage` local-only photo helper

**Files:**
- Modify: `thirdspace-app/services/photos.ts` (add `CaptureKind` + `captureImage`)
- Test: `thirdspace-app/__tests__/services/photos.test.ts` (enrich mock + add describe)

**Interfaces:**
- Produces: `type CaptureKind = 'id' | 'selfie'`
- Produces: `captureImage(kind: CaptureKind): Promise<string | null>` — camera if granted, else library if granted, else null; returns the local asset URI or null on cancel/deny. Never uploads.

- [ ] **Step 1: Write the failing test**

In `thirdspace-app/__tests__/services/photos.test.ts`, replace the existing `jest.mock('expo-image-picker', () => ({}))` line with a richer mock, and add `captureImage` to the import on line 1 (`import { photoPath, captureImage } from '../../services/photos'`):

```ts
jest.mock('expo-image-picker', () => ({
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}))
```

Then append this describe block to the file:

```ts
import * as ImagePicker from 'expo-image-picker'

describe('captureImage', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the camera URI when the camera is granted', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://cam' }] })
    expect(await captureImage('id')).toBe('file://cam')
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled()
  })

  it('falls back to the library when the camera is denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [{ uri: 'file://lib' }] })
    expect(await captureImage('selfie')).toBe('file://lib')
  })

  it('returns null when both camera and library are denied', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    ;(ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: false })
    expect(await captureImage('id')).toBeNull()
  })

  it('returns null when the user cancels', async () => {
    ;(ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true })
    ;(ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true })
    expect(await captureImage('id')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd thirdspace-app && npx jest __tests__/services/photos.test.ts -t captureImage`
Expected: FAIL — `captureImage is not a function`.

- [ ] **Step 3: Implement `captureImage`**

In `thirdspace-app/services/photos.ts`, append:

```ts
export type CaptureKind = 'id' | 'selfie'

// Local-only capture for ID verification: camera when granted, otherwise the
// photo library, otherwise null. The returned URI is NEVER uploaded.
export async function captureImage(kind: CaptureKind): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: kind === 'selfie' ? [1, 1] : [3, 2],
    quality: 0.7,
  }
  const cam = await ImagePicker.requestCameraPermissionsAsync()
  if (cam.granted) {
    const result = await ImagePicker.launchCameraAsync(options)
    return result.canceled ? null : result.assets[0].uri
  }
  const lib = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!lib.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync(options)
  return result.canceled ? null : result.assets[0].uri
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd thirdspace-app && npx jest __tests__/services/photos.test.ts`
Expected: PASS — `photoPath` test plus 4 `captureImage` tests.

- [ ] **Step 5: Commit**

```bash
git add thirdspace-app/services/photos.ts thirdspace-app/__tests__/services/photos.test.ts
git commit -m "feat: add local-only captureImage helper for verification"
```

---

### Task 5: `verify-identity` screen

**Files:**
- Create: `thirdspace-app/app/(app)/verify-identity.tsx`

**Interfaces:**
- Consumes: `captureImage` (Task 4), `submitVerification` (Task 1), `canSubmitVerification`/`CaptureState` (Task 3), `useAuth`, `useProfile`, `LoadingView`, `AuthButton`.
- Route: `/(app)/verify-identity`, optional query param `from` (`'profile'` changes exit to `router.back()`).

- [ ] **Step 1: Create the screen**

Create `thirdspace-app/app/(app)/verify-identity.tsx`:

```tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { LoadingView } from '../../components/LoadingView'
import { AuthButton } from '../../components/AuthButton'
import { captureImage } from '../../services/photos'
import { submitVerification } from '../../services/profiles'
import { canSubmitVerification } from '../../utils/verification'

const VERIFY_DELAY_MS = 2000

type Phase = 'capture' | 'verifying' | 'done'

export default function VerifyIdentity() {
  const router = useRouter()
  const { from } = useLocalSearchParams<{ from?: string }>()
  const { user } = useAuth()
  const { profile, loading } = useProfile(user?.uid)

  const [idUri, setIdUri] = useState<string | null>(null)
  const [selfieUri, setSelfieUri] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('capture')
  const [error, setError] = useState('')

  const exit = () => {
    if (from === 'profile') router.back()
    else (router.replace as (href: string) => void)('/(app)')
  }

  const capture = async (kind: 'id' | 'selfie') => {
    try {
      const uri = await captureImage(kind)
      if (!uri) return
      if (kind === 'id') setIdUri(uri)
      else setSelfieUri(uri)
    } catch {
      // cancelled / denied — ignore
    }
  }

  const handleVerify = async () => {
    if (!user || !canSubmitVerification({ idUri, selfieUri })) return
    setPhase('verifying')
    setError('')
    await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS)) // simulated review
    try {
      await submitVerification(user.uid)
      setPhase('done')
    } catch {
      setPhase('capture')
      setError("Couldn't complete verification. Try again.")
    }
  }

  if (loading) return <LoadingView />

  const alreadyVerified = profile?.verified === true
  if (phase === 'done' || alreadyVerified) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <Ionicons name="checkmark-circle" size={72} color="#7A8C6E" />
          <Text style={styles.doneTitle}>You're verified</Text>
          <Text style={styles.doneBody}>Your identity is confirmed. The verified badge now shows on your profile.</Text>
          <View style={styles.doneBtn}>
            <AuthButton label="Continue" onPress={exit} variant="primary" />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  if (phase === 'verifying') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#C4614A" />
          <Text style={styles.verifyingText}>Verifying your identity…</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Verify your identity</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Your Third Space is for real, verified people. Add a photo of your ID and a selfie — we only use them to confirm it's you, and they're never stored.
        </Text>

        <CaptureSlot label="Photo of your ID" uri={idUri} onPress={() => capture('id')} />
        <CaptureSlot label="Selfie" uri={selfieUri} onPress={() => capture('selfie')} />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        <AuthButton
          label="Verify now"
          onPress={handleVerify}
          variant="primary"
          disabled={!canSubmitVerification({ idUri, selfieUri })}
        />
        <TouchableOpacity onPress={exit} style={styles.skip} hitSlop={8}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function CaptureSlot({ label, uri, onPress }: { label: string; uri: string | null; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.slot} onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      {uri ? (
        <Image source={{ uri }} style={styles.slotImg} />
      ) : (
        <View style={styles.slotEmpty}>
          <Ionicons name="camera-outline" size={24} color="#8C7B70" />
        </View>
      )}
      <View style={styles.slotText}>
        <Text style={styles.slotLabel}>{label}</Text>
        <Text style={styles.slotHint}>{uri ? 'Captured · tap to retake' : 'Tap to capture'}</Text>
      </View>
      {uri ? <Ionicons name="checkmark-circle" size={22} color="#7A8C6E" /> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', letterSpacing: -0.5 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  subtitle: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#8C7B70', lineHeight: 22, marginBottom: 24 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(242,197,160,0.5)' },
  slotImg: { width: 56, height: 56, borderRadius: 10 },
  slotEmpty: { width: 56, height: 56, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5EDE3' },
  slotText: { flex: 1 },
  slotLabel: { fontFamily: 'DMSans_500Medium', fontSize: 15, color: '#2C1810' },
  slotHint: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#8C7B70', marginTop: 3 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  skip: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontFamily: 'DMSans_500Medium', fontSize: 14, color: '#8C7B70' },
  error: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: '#dc2626', marginTop: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  verifyingText: { fontFamily: 'DMSans_500Medium', fontSize: 16, color: '#2C1810', marginTop: 20 },
  doneTitle: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', marginTop: 16, letterSpacing: -0.5 },
  doneBody: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#8C7B70', textAlign: 'center', lineHeight: 22, marginTop: 10 },
  doneBtn: { alignSelf: 'stretch', marginTop: 28 },
})
```

- [ ] **Step 2: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: exit 0, no errors.

- [ ] **Step 3: Run the full test suite (nothing regressed)**

Run: `cd thirdspace-app && npx jest`
Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/app/\(app\)/verify-identity.tsx
git commit -m "feat: add verify-identity screen"
```

---

### Task 6: Route create-profile into verify-identity

**Files:**
- Modify: `thirdspace-app/app/(auth)/create-profile.tsx` (`handleSubmit`, ~line 67)

**Interfaces:**
- Consumes: route `/(app)/verify-identity` (Task 5).

- [ ] **Step 1: Change the post-create navigation**

In `thirdspace-app/app/(auth)/create-profile.tsx`, inside `handleSubmit`, replace:

```tsx
      router.replace('/(app)')
```

with:

```tsx
      ;(router.replace as (href: string) => void)('/(app)/verify-identity')
```

- [ ] **Step 2: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add thirdspace-app/app/\(auth\)/create-profile.tsx
git commit -m "feat: send new attenders to verify-identity after profile creation"
```

---

### Task 7: "Get verified" row on the Profile screen

**Files:**
- Modify: `thirdspace-app/app/(app)/(attender)/profile.tsx` (Account card)

**Interfaces:**
- Consumes: route `/(app)/verify-identity?from=profile` (Task 5); existing `Row` component and `profile` from `useProfile`.

- [ ] **Step 1: Add the conditional row**

In `thirdspace-app/app/(app)/(attender)/profile.tsx`, in the Account card `<View style={styles.card}>` block, add a "Get verified" row shown only when the profile is not verified. Place it as the first child of the card:

```tsx
        <View style={styles.card}>
          {!profile?.verified ? (
            <Row
              label="Get verified"
              badge="ID"
              onPress={() => (router.push as (href: string) => void)('/(app)/verify-identity?from=profile')}
            />
          ) : null}
          <Row label="Points & badges" onPress={() => router.push('/(app)/badges')} />
```

(Leave the remaining rows — Interests & preferences, Neighborhoods, Become a host — unchanged.)

- [ ] **Step 2: Typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Run the full test suite**

Run: `cd thirdspace-app && npx jest`
Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add thirdspace-app/app/\(app\)/\(attender\)/profile.tsx
git commit -m "feat: add Get verified entry to profile for unverified users"
```

---

### Task 8: Update codemap note + full verification

**Files:**
- Modify: `docs/CODEMAPS/thirdspace-codemap.md` (Key Invariants section)

- [ ] **Step 1: Document the invariant change**

In `docs/CODEMAPS/thirdspace-codemap.md`, in the `## Key Invariants & Gotchas` list, append a new bullet after the `**Env vars**` bullet:

```markdown
- **`verified` is owner-set (simulated)** — the ID-verification flow (`app/(app)/verify-identity.tsx`) captures an ID + selfie on-device (never uploaded) and, after a simulated review, calls `submitVerification` to set `profiles/{uid}.verified` + `verifiedAt` directly from the client. Firestore rules allow the owner to write `verified` because there is no real KYC. Verification is skippable and attenders-only. If real verification is added later, move `verified` back to a server-set model.
```

- [ ] **Step 2: Full typecheck**

Run: `cd thirdspace-app && npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Full unit/integration suite**

Run: `cd thirdspace-app && npx jest`
Expected: all suites pass.

- [ ] **Step 4: Rules suite (emulator)**

Run: `cd thirdspace-app && npm run test:rules`
Expected: all rules tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/CODEMAPS/thirdspace-codemap.md
git commit -m "docs: note simulated owner-set verified invariant in codemap"
```

---

## Manual verification checklist (device/emulator)

After all tasks, run the app (`cd thirdspace-app && npx expo start`) and confirm:

1. New attender: onboarding → sign-up → role-select (attender) → create-profile → **verify-identity** appears.
2. "Verify now" is disabled until both ID and selfie are captured.
3. Tapping "Verify now" shows the "Verifying…" spinner, then "You're verified", then Continue → Feed. The ✓ badge shows next to the name on Profile.
4. Fresh attender who taps "Skip for now" lands in the Feed with no badge, and Profile shows a **Get verified** row.
5. Tapping "Get verified" opens verify-identity; completing it returns to Profile (back), badge now present, and the Get verified row is gone.
6. Hoster onboarding is unchanged (no verify step).
