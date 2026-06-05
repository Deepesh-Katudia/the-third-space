# The Third Space Mobile App — Phase 1: Auth & Onboarding

**Date:** 2026-06-04
**Project:** Your Third Space LLC — React Native + Expo mobile app
**Phase:** 1 of 4 — Auth & Onboarding
**Depends on:** Firebase project (already created for marketing site)

---

## 1. Purpose

Build the real React Native + Expo mobile app for The Third Space. Phase 1 delivers:
1. 3-slide swipeable onboarding flow (in-app portfolio/welcome)
2. Sign up — email/password + Google + Apple
3. Sign in — email/password + Google + Apple
4. Forgot password (email reset)
5. Auth state persistence (stay logged in across app restarts)
6. Stub home screen as the authenticated destination (Phase 2 builds the real home)

This is a **real working app**, not a prototype or mockup.

---

## 2. Tech Stack

| Concern | Tool |
|---|---|
| Framework | Expo SDK 52 (managed workflow) |
| Navigation | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind for React Native) |
| Auth backend | Firebase Auth (same project as marketing site) |
| Google Sign-In | `@react-native-google-signin/google-signin` |
| Apple Sign-In | `expo-apple-authentication` |
| Fonts | `@expo-google-fonts/dm-serif-display` + `@expo-google-fonts/dm-sans` |
| Language | TypeScript |

**Scaffold command:**
```bash
npx create-expo-app thirdspace-app --template blank-typescript
```

---

## 3. Brand Design System

Same palette as the marketing site, defined in `constants/theme.ts`:

```ts
export const colors = {
  cream:       '#FBF7F2',
  warmWhite:   '#FFF9F4',
  terracotta:  '#C4614A',
  softOrange:  '#E8855F',
  deepBrown:   '#2C1810',
  midBrown:    '#6B3F2A',
  lightBrown:  '#A0673A',
  sage:        '#7A8C6E',
  blush:       '#F2C5A0',
  warmGray:    '#8C7B70',
}

export const gradients = {
  primary: ['#C4614A', '#E8855F'] as const,
  dark:    ['#2C1810', '#3a1e12'] as const,
}
```

**NativeWind config:** Register all colors as Tailwind tokens in `tailwind.config.js` (same pattern as marketing site). Fonts: `font-serif` → DM Serif Display, `font-sans` → DM Sans.

---

## 4. File Structure

```
thirdspace-app/
├── app/
│   ├── _layout.tsx              # Root layout — auth listener, redirect logic
│   ├── index.tsx                # Entry — redirects to (auth) or (app)
│   ├── (auth)/
│   │   ├── _layout.tsx          # Auth stack, no header
│   │   ├── onboarding.tsx       # 3 swipeable slides
│   │   ├── sign-up.tsx          # Sign up screen
│   │   ├── sign-in.tsx          # Sign in screen
│   │   └── forgot-password.tsx  # Password reset
│   └── (app)/
│       ├── _layout.tsx          # Authenticated tab layout (stub)
│       └── index.tsx            # Home stub screen
├── components/
│   ├── OnboardingSlide.tsx      # Single slide: icon + title + body
│   ├── AuthButton.tsx           # Primary gradient / Google / Apple buttons
│   └── FormInput.tsx            # Styled text input with label + error state
├── firebase/
│   └── config.ts                # Firebase init from env vars
├── hooks/
│   └── useAuth.ts               # onAuthStateChanged listener, returns user
├── constants/
│   └── theme.ts                 # Brand colors + gradient arrays
├── .env                         # Firebase keys (never commit)
├── .env.example                 # Empty template
├── app.json                     # Expo config
├── tailwind.config.js
└── tsconfig.json
```

---

## 5. Navigation & Auth Flow

### Root Layout (`app/_layout.tsx`)
- Loads fonts (`useFonts`) before rendering
- Listens to Firebase auth state (`onAuthStateChanged`)
- **Unauthenticated** → redirects to `/(auth)/onboarding`
- **Authenticated** → redirects to `/(app)/`
- Shows a splash/loading screen while auth state resolves (prevents flash)

### Entry Point (`app/index.tsx`)
- Renders nothing — just triggers the redirect in the root layout

### Auth Group (`app/(auth)/`)
- Stack navigator, no visible header
- Accessible only when unauthenticated
- Onboarding → Sign Up / Sign In (user's choice at end of slides)

### App Group (`app/(app)/`)
- Accessible only when authenticated
- Tab navigator (single tab for Phase 1, more in Phase 2)

---

## 6. Screen Specifications

### 6.1 Onboarding (`(auth)/onboarding.tsx`)

3 horizontally swipeable slides using `FlatList` with `pagingEnabled` + dot indicators.

| Slide | Icon | Title | Body |
|---|---|---|---|
| 1 | 🛡️ | "Real people only." | "Every profile is ID-verified. No anonymous accounts, no fake photos. Everyone you meet is exactly who they say they are." |
| 2 | 👥 | "See who's going first." | "Browse events and see blurred profile previews of who's attending — before you even register. Register to unlock the full list." |
| 3 | 💬 | "Connect before the event." | "Message attendees before you arrive. Join group chats. Show up already knowing someone." |

**Layout per slide:**
- Dark background (`deepBrown`) full-screen
- Large emoji icon centered, top third
- Title: DM Serif Display, large, cream color, tight tracking
- Body: DM Sans light, warm-gray, centered, max-width constrained
- Dot indicators: active dot = terracotta, inactive = white/30

**Controls:**
- **Skip** button (top right): text button, goes directly to Sign Up
- **Next** button (bottom): ghost pill → advances slide
- **Last slide only:** "Get Started" replaces Next (terracotta gradient pill) → goes to Sign Up
- "Already have an account? Sign in" link below Get Started on last slide

### 6.2 Sign Up (`(auth)/sign-up.tsx`)

**Fields:**
- Full name (text input)
- Email (email input, keyboard type email)
- Password (secure text, show/hide toggle)
- Confirm password (secure text)

**Validation (before submit):**
- All fields required
- Valid email format
- Password ≥ 8 characters
- Passwords match

**Auth methods (in order on screen):**
1. "Create account" primary button → `createUserWithEmailAndPassword`
   - On success → `updateProfile` to set `displayName`
   - Then → navigate to `/(app)/`
2. Divider: "or continue with"
3. "Continue with Google" button → Google OAuth flow
4. "Continue with Apple" button → Apple Sign-In (iOS only, hidden on Android)

**Error handling:**
- `auth/email-already-in-use` → "An account with this email already exists. Sign in instead."
- `auth/weak-password` → "Password must be at least 8 characters."
- Network errors → "Something went wrong. Check your connection and try again."
- Show errors inline below the relevant field or as a banner above the form

**Footer:** "Already have an account? Sign in" → navigates to Sign In

### 6.3 Sign In (`(auth)/sign-in.tsx`)

**Fields:**
- Email
- Password (show/hide toggle)

**Auth methods:**
1. "Sign in" primary button → `signInWithEmailAndPassword`
2. "Continue with Google"
3. "Continue with Apple" (iOS only)

**Links:**
- "Forgot password?" → navigates to Forgot Password
- "New here? Create account" → navigates to Sign Up

**Error handling:**
- `auth/user-not-found` + `auth/wrong-password` → show same message for both: "Incorrect email or password." (do not reveal which is wrong)
- `auth/too-many-requests` → "Too many attempts. Try again later or reset your password."

### 6.4 Forgot Password (`(auth)/forgot-password.tsx`)

**Field:** Email input

**Action:** "Send reset link" → `sendPasswordResetEmail`

**States:**
- Default: form
- Success: "Check your inbox. We sent a reset link to [email]." — form replaced with message + "Back to sign in" link
- Error: "No account found with that email." or generic network error

### 6.5 Home Stub (`(app)/index.tsx`)

A placeholder screen shown to authenticated users. Displays:
- "Welcome, [user.displayName]! 👋"
- Terracotta background with The Third Space logo
- "Events coming in Phase 2" message
- Sign out button (calls `signOut`, returns to onboarding)

This stub is replaced entirely in Phase 2.

---

## 7. Reusable Components

### `FormInput.tsx`
Props: `label`, `value`, `onChangeText`, `error`, `secureTextEntry`, `keyboardType`, `autoCapitalize`
- Cream background input, rounded-pill (or rounded-xl for inputs — pill looks odd for text fields)
- Use `rounded-xl` (12px) for inputs, `rounded-pill` for buttons
- Shows red error text below field when `error` is set
- Label above field in small warm-gray text

### `AuthButton.tsx`
Variants:
- `primary` — terracotta gradient, white text, full width
- `google` — white background, border, Google "G" logo, dark text
- `apple` — black background, white text, Apple  logo (iOS only)
- `ghost` — transparent, terracotta border + text

### `OnboardingSlide.tsx`
Props: `icon`, `title`, `body`
Pure display component — no state, no side effects.

---

## 8. Firebase Auth Integration

### `firebase/config.ts`
```ts
import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
```

**Note:** Expo uses `EXPO_PUBLIC_` prefix (not `VITE_`) for client-side env vars.

**Firebase Auth persistence:** React Native requires `AsyncStorage` for auth session persistence across app restarts. Install `@react-native-async-storage/async-storage` and initialize auth with:
```ts
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
})
```
Without this, users are logged out every time the app restarts.

### `hooks/useAuth.ts`
```ts
import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '../firebase/config'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { user, loading }
}
```

### Google Sign-In setup
Requires:
- SHA-1 fingerprint added to Firebase console (for Android)
- Google OAuth client ID added to `app.json`
- `@react-native-google-signin/google-signin` configured in `app.json` plugins

### Apple Sign-In setup
Requires:
- Apple Developer account (free tier works for testing on device)
- `expo-apple-authentication` plugin in `app.json`
- Sign in with Apple capability enabled in Apple Developer portal
- Hidden on Android (`Platform.OS === 'android'` check)

---

## 9. Environment Variables

Expo uses `EXPO_PUBLIC_` prefix — different from the marketing site's `VITE_` prefix.

`.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

---

## 10. Design Rules

| Rule | Value |
|---|---|
| Input border-radius | 12px (`rounded-xl`) |
| Button border-radius | 100px (`rounded-pill`) |
| Onboarding background | `deepBrown` (#2C1810) |
| Auth screens background | `cream` (#FBF7F2) |
| Primary font | DM Serif Display (headings) |
| Body font | DM Sans (inputs, body, buttons) |
| Min touch target | 44×44pt (iOS HIG) |
| Safe area | All screens use `SafeAreaView` |

---

## 11. Out of Scope for Phase 1

- ID photo verification upload
- Interest tag selection (moved to Phase 2 profile setup)
- Push notifications
- Profile photo upload
- Event browsing (Phase 2)
- Messaging (Phase 3)
- Venue partner dashboard (Phase 4)

---

## 12. Prerequisites Before Building

1. Apple Developer account (for Apple Sign-In + iOS testing)
2. Google OAuth Web Client ID from Firebase Console → Authentication → Sign-in method → Google
3. SHA-1 fingerprint for Android (generated from keystore)
4. Expo account (free) for running on physical device via Expo Go
