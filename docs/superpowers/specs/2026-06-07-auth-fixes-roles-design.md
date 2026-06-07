# Auth Fixes, Role System & Post-Auth Design

**Date:** 2026-06-07
**Project:** The Third Space — `thirdspace-app` (Expo / React Native)
**Status:** Approved

---

## Overview

Three parallel goals:

1. Fix broken auth (Firebase init crash, Apple cancellation, unhandled error codes)
2. Implement Google Sign-in properly via `expo-auth-session`
3. Add a two-role system (Event Attender / Event Hoster) with role-select after sign-up and role-aware home screen

Each fix or feature ships as its own git commit, pushed to GitHub.

---

## Current Screens (5)

| Screen | Route | Notes |
|--------|-------|-------|
| Onboarding | `/(auth)/onboarding` | 3-slide carousel, value props |
| Sign Up | `/(auth)/sign-up` | name, email, password, confirm |
| Sign In | `/(auth)/sign-in` | email, password, Apple, Google |
| Forgot Password | `/(auth)/forgot-password` | email reset |
| Home (placeholder) | `/(app)/` | placeholder, sign-out only |

---

## Section 1 — Bug Fixes

### 1a. Firebase Auth Double-Init Crash

**File:** `firebase/config.ts`

**Problem:** `initializeAuth(app, ...)` is called unconditionally every time the module loads. If Firebase already has an auth instance for this app (fast refresh in development, or any scenario where the module re-evaluates), it throws. That error code doesn't match any handled case in the sign-up/sign-in screens, so the user sees "Something went wrong."

**Fix:**
```ts
let auth
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
} catch {
  auth = getAuth(app)
}
export { auth }
```

Also import `getAuth` from `firebase/auth`.

**Commit:** `fix: resolve Firebase auth double-init crash`

---

### 1b. Apple Sign-In Cancellation

**Files:** `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`

**Problem:** When the user taps "Cancel" on the Apple auth sheet, `signInAsync` throws with `code: 'ERR_CANCELED'`. The current catch block treats this the same as a real failure, showing "Apple sign-in failed. Try again." — confusing and incorrect.

**Fix:** Check the error code before setting the banner:
```ts
} catch (err: unknown) {
  const code = (err as { code?: string }).code
  if (code === 'ERR_CANCELED') return // user cancelled, do nothing
  setBanner('Apple sign-in failed. Try again.')
}
```

**Commit:** `fix: handle Apple Sign-in cancellation silently`

---

### 1c. Unhandled Firebase Error Codes on Sign-Up

**File:** `app/(auth)/sign-up.tsx`

**Problem:** Only `auth/email-already-in-use` is handled. All other Firebase errors — `auth/network-request-failed`, `auth/operation-not-allowed`, `auth/weak-password`, `auth/too-many-requests` — fall through to "Something went wrong."

**Fix:** Expand the error map:
```ts
const messages: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/operation-not-allowed': 'Email sign-up is not enabled. Contact support.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
}
setBanner(messages[code ?? ''] ?? 'Something went wrong. Try again.')
```

**Commit:** `fix: surface specific Firebase error codes on sign-up`

---

## Section 2 — Google Sign-In

**Packages to install:**
```
expo install expo-auth-session expo-web-browser
```

**`app.json` change:** Add `"expo-web-browser"` to the `plugins` array.

**Env var used:** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (already in `.env.example`)

**Implementation pattern:**

```ts
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'

WebBrowser.maybeCompleteAuthSession()

// Inside the component:
const [request, response, promptAsync] = Google.useAuthRequest({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
})

useEffect(() => {
  if (response?.type === 'success') {
    const { id_token } = response.params
    const credential = GoogleAuthProvider.credential(id_token)
    signInWithCredential(auth, credential)
      .then(() => router.replace('/(auth)/role-select'))
      .catch(() => setBanner('Google sign-in failed. Try again.'))
  }
}, [response])

const handleGoogleSignIn = () => promptAsync()
```

Both `sign-in.tsx` and `sign-up.tsx` use this same pattern. New users land on role-select; returning users are redirected by `AuthRedirect` to `/(app)/`.

**Commit:** `feat: implement Google Sign-in via expo-auth-session`

---

## Section 3 — Role Select Screen

**New file:** `app/(auth)/role-select.tsx`

**Shown:** Only after a new user creates an account (email, Google, or Apple). Never shown to returning users who already have a role in Firestore.

**UI:** Two full-width cards on a warm beige (`#FBF7F2`) background, matching existing style:

| Card | Icon | Title | Body |
|------|------|-------|------|
| Attender | 👥 | I'm here to attend | Join events, see who's going, connect with people before you arrive |
| Hoster | 🛡️ | I'm here to host | Create events, manage your guest list, build your community |

Tapping a card:
1. Writes the Firestore document (see data model below)
2. Shows a loading state on the tapped card
3. Navigates to `/(app)/` on success
4. Shows an inline error banner on Firestore failure

**Commit:** `feat: add role-select screen for attender vs hoster`

---

## Section 4 — Firestore Data Model

**Collection:** `users`
**Document ID:** Firebase Auth `uid`

```ts
interface UserProfile {
  uid: string
  displayName: string
  email: string
  role: 'attender' | 'hoster'
  createdAt: Timestamp
}
```

Written once when the user completes role-select. Never overwritten by sign-in.

---

## Section 5 — useAuth Extension

**File:** `hooks/useAuth.ts`

Extended to also fetch the user's role from Firestore after auth state changes.

```ts
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'attender' | 'hoster' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setRole(snap.exists() ? snap.data().role : null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

  return { user, role, loading }
}
```

**Commit:** `feat: extend useAuth with Firestore role`

---

## Section 6 — Auth Routing Update

**File:** `app/_layout.tsx` — `AuthRedirect` component

Updated routing logic:

| State | Destination |
|-------|-------------|
| No user, not in auth group | `/(auth)/onboarding` |
| User + no role, not on role-select | `/(auth)/role-select` |
| User + role, not in app group | `/(app)/` |

The `role-select` screen is part of the `(auth)` group so the layout wraps it correctly.

Sign-up screens (email, Google, Apple) all navigate to `/(auth)/role-select` after account creation. Sign-in screens do not — returning users already have a role and `AuthRedirect` handles routing them to `/(app)/`.

**Commit:** `feat: update auth routing for new-user role-select flow`

---

## Section 7 — Role-Aware Home Screen

**File:** `app/(app)/index.tsx`

Reads `role` from the extended `useAuth`. Shows role-specific placeholder content:

**Attender view:**
- Greeting with first name
- "Browse upcoming events" — Phase 2 teaser
- Avatar/profile placeholder

**Hoster view:**
- Greeting with first name
- "Create your first event" — Phase 2 teaser
- Role badge ("Host")

Both share the same visual shell — warm beige background, DM Serif Display heading, sign-out button. The role badge distinguishes the two.

**Commit:** `feat: role-aware home screen for attender and hoster`

---

## Section 8 — Architecture Documentation

**New file:** `docs/ARCHITECTURE.md`

Covers:
- Tech stack (Expo SDK 54, React Native, Expo Router, Firebase v11, Firestore, NativeWind)
- Screen inventory with routes
- Auth flow diagram (onboarding → sign-up → role-select → home)
- Data model
- File structure overview
- Environment variables

**Commit:** `docs: add architecture and tech stack documentation`

---

## Commit Order

```
1. fix: resolve Firebase auth double-init crash
2. fix: handle Apple Sign-in cancellation silently
3. fix: surface specific Firebase error codes on sign-up
4. feat: implement Google Sign-in via expo-auth-session
5. feat: add role-select screen for attender vs hoster
6. feat: extend useAuth with Firestore role
7. feat: update auth routing for new-user role-select flow
8. feat: role-aware home screen for attender and hoster
9. docs: add architecture and tech stack documentation
```

---

## Out of Scope (Phase 2)

- Event browsing / creation UI
- Attendee profile pages
- In-app messaging
- ID verification flow
- Push notifications
