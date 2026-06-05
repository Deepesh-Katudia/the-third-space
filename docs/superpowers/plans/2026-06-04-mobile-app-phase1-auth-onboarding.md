# Mobile App Phase 1 — Auth & Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the React Native + Expo mobile app for The Third Space with 3-slide onboarding, email/password + Google + Apple auth, and a stub home screen.

**Architecture:** Expo Router for file-based navigation with two route groups — `(auth)` for unauthenticated screens and `(app)` for authenticated screens. The root layout listens to Firebase auth state and redirects accordingly. NativeWind provides Tailwind-style styling with the same brand tokens as the marketing site.

**Tech Stack:** Expo SDK 52, Expo Router v4, NativeWind v4, Firebase Auth + AsyncStorage persistence, @react-native-google-signin, expo-apple-authentication, TypeScript, Jest + React Native Testing Library.

---

## Prerequisites (do these manually before Task 1)

1. **Firebase Console** → Authentication → Sign-in method → Enable: Email/Password, Google, Apple
2. **Firebase Console** → Authentication → Sign-in method → Google → copy the **Web client ID** (needed for `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)
3. **Apple Developer account** (free tier) → Certificates, Identifiers & Profiles → enable "Sign In with Apple" capability for your App ID
4. Install Expo CLI globally: `npm install -g expo-cli`
5. Install Expo Go on your physical device (iOS or Android) from the App Store / Play Store

---

## Task 1: Project Scaffold

**Files:**
- Create: `thirdspace-app/` (entire project)
- Create: `thirdspace-app/app.json`
- Create: `thirdspace-app/.gitignore`
- Create: `thirdspace-app/.env`
- Create: `thirdspace-app/.env.example`

- [ ] **Step 1: Create the Expo project**

Run from `E:\Claude\The_Third_Space`:
```bash
npx create-expo-app thirdspace-app --template blank-typescript
cd thirdspace-app
```

Expected: project created with `app/`, `assets/`, `package.json`, `tsconfig.json`.

- [ ] **Step 2: Install all dependencies**

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
npx expo install firebase @react-native-async-storage/async-storage
npx expo install @react-native-google-signin/google-signin
npx expo install expo-apple-authentication
npx expo install @expo-google-fonts/dm-serif-display @expo-google-fonts/dm-sans expo-font
npx expo install react-native-safe-area-context react-native-screens
npx expo install react-native-linear-gradient
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Configure app.json**

Replace the generated `app.json` entirely:
```json
{
  "expo": {
    "name": "The Third Space",
    "slug": "thirdspace-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#2C1810"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.thirdspace.app",
      "usesAppleSignIn": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#2C1810"
      },
      "package": "com.thirdspace.app"
    },
    "plugins": [
      "expo-router",
      "expo-apple-authentication",
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_REVERSED_CLIENT_ID"
        }
      ]
    ],
    "scheme": "thirdspace",
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

Note: replace `YOUR_REVERSED_CLIENT_ID` with the reversed iOS client ID from your Google OAuth credentials (looks like `com.googleusercontent.apps.12345-abc`).

- [ ] **Step 4: Configure Jest in package.json**

Add to `package.json`:
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ]
  },
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
.expo/
dist/
.env
.env.local
*.log
ios/
android/
```

- [ ] **Step 6: Create .env and .env.example**

`.env` (fill in your real values):
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

`.env.example` (safe to commit — empty values):
```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

- [ ] **Step 7: Verify the project starts**

```bash
npx expo start
```

Expected: QR code appears in terminal. Scan with Expo Go on your phone. App should show the default Expo screen.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Expo app with all Phase 1 dependencies"
```

---

## Task 2: NativeWind + Tailwind Setup

**Files:**
- Create: `thirdspace-app/tailwind.config.js`
- Create: `thirdspace-app/babel.config.js`
- Modify: `thirdspace-app/app/_layout.tsx` (add css import later)
- Create: `thirdspace-app/global.css`

- [ ] **Step 1: Install NativeWind v4**

```bash
npm install nativewind
npm install --save-dev tailwindcss@3
npx tailwindcss init
```

- [ ] **Step 2: Create tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream:        '#FBF7F2',
        'warm-white': '#FFF9F4',
        terracotta:   '#C4614A',
        'soft-orange':'#E8855F',
        'deep-brown': '#2C1810',
        'mid-brown':  '#6B3F2A',
        'light-brown':'#A0673A',
        sage:         '#7A8C6E',
        blush:        '#F2C5A0',
        'warm-gray':  '#8C7B70',
      },
      fontFamily: {
        serif: ['DMSerifDisplay_400Regular'],
        'serif-italic': ['DMSerifDisplay_400Regular_Italic'],
        sans:  ['DMSans_400Regular'],
        'sans-light': ['DMSans_300Light'],
        'sans-medium': ['DMSans_500Medium'],
      },
      borderRadius: {
        pill: '100px',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Create global.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Update babel.config.js**

```js
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
```

- [ ] **Step 5: Create nativewind-env.d.ts for TypeScript support**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 6: Verify NativeWind works**

Open `app/index.tsx` and temporarily add:
```tsx
import { View, Text } from 'react-native'

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <Text className="text-terracotta font-sans-medium text-2xl">NativeWind works!</Text>
    </View>
  )
}
```

Run `npx expo start` and verify the cream background and terracotta text appear.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: configure NativeWind v4 with brand color palette"
```

---

## Task 3: Constants, Theme, and Fonts

**Files:**
- Create: `thirdspace-app/constants/theme.ts`
- Modify: `thirdspace-app/app/_layout.tsx` (font loading)

- [ ] **Step 1: Create constants/theme.ts**

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
} as const

export const gradients = {
  primary: ['#C4614A', '#E8855F'] as const,
  dark:    ['#2C1810', '#3a1e12'] as const,
}

export type ColorKey = keyof typeof colors
```

- [ ] **Step 2: Commit**

```bash
git add constants/
git commit -m "feat: add brand theme constants"
```

---

## Task 4: Firebase Config + useAuth Hook

**Files:**
- Create: `thirdspace-app/firebase/config.ts`
- Create: `thirdspace-app/hooks/useAuth.ts`
- Create: `thirdspace-app/__tests__/hooks/useAuth.test.ts`

- [ ] **Step 1: Create firebase/config.ts**

```ts
import { initializeApp, getApps } from 'firebase/app'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
})

export const db = getFirestore(app)
export default app
```

- [ ] **Step 2: Create hooks/useAuth.ts**

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

- [ ] **Step 3: Write test for useAuth**

Create `__tests__/hooks/useAuth.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react-native'
import { useAuth } from '../../hooks/useAuth'

// Mock firebase
jest.mock('../../firebase/config', () => ({
  auth: {},
}))

let authCallback: ((user: any) => void) | null = null

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((auth, callback) => {
    authCallback = callback
    return jest.fn() // unsubscribe
  }),
}))

describe('useAuth', () => {
  it('starts with loading true and no user', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it('sets user when auth state resolves with a user', () => {
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: '123', email: 'test@test.com' }

    act(() => {
      authCallback?.(mockUser)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it('sets user to null when signed out', () => {
    const { result } = renderHook(() => useAuth())

    act(() => {
      authCallback?.(null)
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })
})
```

- [ ] **Step 4: Run test — expect it to pass**

```bash
npm test -- --testPathPattern=useAuth
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add firebase/ hooks/ __tests__/
git commit -m "feat: add Firebase config with AsyncStorage persistence and useAuth hook"
```

---

## Task 5: Input Validation Utilities

**Files:**
- Create: `thirdspace-app/utils/validation.ts`
- Create: `thirdspace-app/__tests__/utils/validation.test.ts`

- [ ] **Step 1: Write failing tests first**

Create `__tests__/utils/validation.test.ts`:
```ts
import { validateEmail, validatePassword, validateSignUpForm } from '../../utils/validation'

describe('validateEmail', () => {
  it('returns true for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('user+tag@domain.co')).toBe(true)
  })

  it('returns false for invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('missing@')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('returns true for passwords 8+ characters', () => {
    expect(validatePassword('password123')).toBe(true)
    expect(validatePassword('12345678')).toBe(true)
  })

  it('returns false for passwords under 8 characters', () => {
    expect(validatePassword('1234567')).toBe(false)
    expect(validatePassword('')).toBe(false)
  })
})

describe('validateSignUpForm', () => {
  const valid = {
    name: 'Samantha',
    email: 'sam@example.com',
    password: 'password123',
    confirmPassword: 'password123',
  }

  it('returns no errors for valid form', () => {
    expect(validateSignUpForm(valid)).toEqual({})
  })

  it('returns error when name is empty', () => {
    const result = validateSignUpForm({ ...valid, name: '' })
    expect(result.name).toBeDefined()
  })

  it('returns error when passwords do not match', () => {
    const result = validateSignUpForm({ ...valid, confirmPassword: 'different' })
    expect(result.confirmPassword).toBeDefined()
  })

  it('returns error for invalid email', () => {
    const result = validateSignUpForm({ ...valid, email: 'bademail' })
    expect(result.email).toBeDefined()
  })

  it('returns error for short password', () => {
    const result = validateSignUpForm({ ...valid, password: '123', confirmPassword: '123' })
    expect(result.password).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
npm test -- --testPathPattern=validation
```

Expected: FAIL — `validateEmail` not found.

- [ ] **Step 3: Create utils/validation.ts**

```ts
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= 8
}

export interface SignUpFormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export function validateSignUpForm(fields: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): SignUpFormErrors {
  const errors: SignUpFormErrors = {}

  if (!fields.name.trim()) {
    errors.name = 'Full name is required.'
  }
  if (!validateEmail(fields.email)) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!validatePassword(fields.password)) {
    errors.password = 'Password must be at least 8 characters.'
  }
  if (fields.password !== fields.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
npm test -- --testPathPattern=validation
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add utils/ __tests__/utils/
git commit -m "feat: add form validation utilities with tests"
```

---

## Task 6: Reusable Components

**Files:**
- Create: `thirdspace-app/components/FormInput.tsx`
- Create: `thirdspace-app/components/AuthButton.tsx`
- Create: `thirdspace-app/components/OnboardingSlide.tsx`
- Create: `thirdspace-app/__tests__/components/FormInput.test.tsx`

- [ ] **Step 1: Write FormInput test first**

Create `__tests__/components/FormInput.test.tsx`:
```tsx
import React from 'react'
import { render, screen } from '@testing-library/react-native'
import { FormInput } from '../../components/FormInput'

describe('FormInput', () => {
  it('renders the label', () => {
    render(
      <FormInput label="Email" value="" onChangeText={() => {}} />
    )
    expect(screen.getByText('Email')).toBeTruthy()
  })

  it('renders error text when error prop is set', () => {
    render(
      <FormInput label="Email" value="" onChangeText={() => {}} error="Invalid email" />
    )
    expect(screen.getByText('Invalid email')).toBeTruthy()
  })

  it('does not render error text when no error', () => {
    render(
      <FormInput label="Email" value="" onChangeText={() => {}} />
    )
    expect(screen.queryByText('Invalid email')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect it to fail**

```bash
npm test -- --testPathPattern=FormInput
```

Expected: FAIL — `FormInput` not found.

- [ ] **Step 3: Create components/FormInput.tsx**

```tsx
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native'

interface FormInputProps extends TextInputProps {
  label: string
  error?: string
}

export function FormInput({ label, error, secureTextEntry, style, ...props }: FormInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  return (
    <View className="mb-4">
      <Text className="font-sans text-sm text-warm-gray mb-1.5">{label}</Text>
      <View className="relative">
        <TextInput
          className={`bg-warm-white rounded-xl px-4 py-3.5 font-sans text-deep-brown text-base ${
            error ? 'border border-red-400' : 'border border-blush/40'
          }`}
          secureTextEntry={hidden}
          placeholderTextColor="#8C7B70"
          autoCapitalize="none"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            className="absolute right-4 top-3.5"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-warm-gray text-sm">{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text className="text-red-500 text-xs mt-1 font-sans">{error}</Text>
      ) : null}
    </View>
  )
}
```

- [ ] **Step 4: Run test — expect it to pass**

```bash
npm test -- --testPathPattern=FormInput
```

Expected: 3 tests pass.

- [ ] **Step 5: Create components/AuthButton.tsx**

```tsx
import React from 'react'
import { TouchableOpacity, Text, View, Platform, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type Variant = 'primary' | 'google' | 'apple' | 'ghost'

interface AuthButtonProps {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
}

export function AuthButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: AuthButtonProps) {
  if (variant === 'apple' && Platform.OS !== 'ios') return null

  const isDisabled = disabled || loading

  if (variant === 'primary') {
    return (
      <LinearGradient
        colors={['#C4614A', '#E8855F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="rounded-pill overflow-hidden"
      >
        <TouchableOpacity
          onPress={onPress}
          disabled={isDisabled}
          className="py-4 items-center"
          style={{ opacity: isDisabled ? 0.7 : 1 }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-sans-medium text-base">{label}</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    )
  }

  if (variant === 'google') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className="border border-blush/60 bg-warm-white rounded-pill py-4 items-center flex-row justify-center gap-2"
        style={{ opacity: isDisabled ? 0.7 : 1 }}
      >
        <Text className="text-lg">G</Text>
        <Text className="text-deep-brown font-sans-medium text-base">{label}</Text>
      </TouchableOpacity>
    )
  }

  if (variant === 'apple') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className="bg-black rounded-pill py-4 items-center flex-row justify-center gap-2"
        style={{ opacity: isDisabled ? 0.7 : 1 }}
      >
        <Text className="text-white text-lg"></Text>
        <Text className="text-white font-sans-medium text-base">{label}</Text>
      </TouchableOpacity>
    )
  }

  // ghost
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className="border border-terracotta rounded-pill py-4 items-center"
      style={{ opacity: isDisabled ? 0.7 : 1 }}
    >
      <Text className="text-terracotta font-sans-medium text-base">{label}</Text>
    </TouchableOpacity>
  )
}
```

- [ ] **Step 6: Create components/OnboardingSlide.tsx**

```tsx
import React from 'react'
import { View, Text, Dimensions } from 'react-native'

const { width } = Dimensions.get('window')

interface OnboardingSlideProps {
  icon: string
  title: string
  body: string
}

export function OnboardingSlide({ icon, title, body }: OnboardingSlideProps) {
  return (
    <View
      className="flex-1 items-center justify-center px-8"
      style={{ width }}
    >
      <Text style={{ fontSize: 80, marginBottom: 32 }}>{icon}</Text>
      <Text
        className="font-serif text-cream text-center mb-4"
        style={{ fontSize: 28, letterSpacing: -0.5 }}
      >
        {title}
      </Text>
      <Text
        className="font-sans-light text-warm-gray text-center leading-relaxed"
        style={{ fontSize: 16, maxWidth: 300 }}
      >
        {body}
      </Text>
    </View>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add components/ __tests__/components/
git commit -m "feat: add FormInput, AuthButton, OnboardingSlide components"
```

---

## Task 7: Root Layout + Auth Redirect

**Files:**
- Create: `thirdspace-app/app/_layout.tsx`
- Create: `thirdspace-app/app/index.tsx`
- Create: `thirdspace-app/app/(auth)/_layout.tsx`
- Create: `thirdspace-app/app/(app)/_layout.tsx`

- [ ] **Step 1: Create app/_layout.tsx**

```tsx
import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import {
  useFonts,
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display'
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans'
import { useAuth } from '../hooks/useAuth'
import '../global.css'

function AuthRedirect() {
  const { user, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (user && !inAppGroup) {
      router.replace('/(app)/')
    }
  }, [user, loading, segments])

  return null
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  })

  const { loading } = useAuth()

  if (!fontsLoaded || loading) {
    return (
      <View className="flex-1 items-center justify-center bg-deep-brown">
        <ActivityIndicator color="#C4614A" size="large" />
      </View>
    )
  }

  return (
    <>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
```

- [ ] **Step 2: Create app/index.tsx**

```tsx
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/(auth)/onboarding" />
}
```

- [ ] **Step 3: Create app/(auth)/_layout.tsx**

```tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
}
```

- [ ] **Step 4: Create app/(app)/_layout.tsx**

```tsx
import { Stack } from 'expo-router'

export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
```

- [ ] **Step 5: Verify redirect works**

Run `npx expo start`. App should show the loading indicator briefly, then redirect to the onboarding route (which doesn't exist yet — you'll see a "not found" screen, which is correct at this point).

- [ ] **Step 6: Commit**

```bash
git add app/
git commit -m "feat: add root layout with auth redirect and font loading"
```

---

## Task 8: Onboarding Screen

**Files:**
- Create: `thirdspace-app/app/(auth)/onboarding.tsx`

- [ ] **Step 1: Create app/(auth)/onboarding.tsx**

```tsx
import React, { useRef, useState } from 'react'
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Dimensions,
  ListRenderItem,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { OnboardingSlide } from '../../components/OnboardingSlide'
import { StatusBar } from 'expo-status-bar'

const { width } = Dimensions.get('window')

const slides = [
  {
    id: '1',
    icon: '🛡️',
    title: 'Real people only.',
    body: 'Every profile is ID-verified. No anonymous accounts, no fake photos. Everyone you meet is exactly who they say they are.',
  },
  {
    id: '2',
    icon: '👥',
    title: "See who's going first.",
    body: "Browse events and see blurred profile previews of who's attending — before you even register. Register to unlock the full list.",
  },
  {
    id: '3',
    icon: '💬',
    title: 'Connect before the event.',
    body: 'Message attendees before you arrive. Join group chats. Show up already knowing someone.',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const isLast = currentIndex === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      router.push('/(auth)/sign-up')
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
      setCurrentIndex((i) => i + 1)
    }
  }

  const renderSlide: ListRenderItem<typeof slides[0]> = ({ item }) => (
    <OnboardingSlide icon={item.icon} title={item.title} body={item.body} />
  )

  return (
    <SafeAreaView className="flex-1 bg-deep-brown">
      <StatusBar style="light" />

      {/* Skip button */}
      <TouchableOpacity
        onPress={() => router.push('/(auth)/sign-up')}
        className="absolute top-14 right-6 z-10"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className="text-warm-gray font-sans text-sm">Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width)
          setCurrentIndex(index)
        }}
        className="flex-1"
      />

      {/* Bottom controls */}
      <View className="px-6 pb-8">
        {/* Dot indicators */}
        <View className="flex-row justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <View
              key={i}
              className="rounded-full"
              style={{
                width: i === currentIndex ? 20 : 8,
                height: 8,
                backgroundColor: i === currentIndex ? '#C4614A' : 'rgba(255,255,255,0.3)',
              }}
            />
          ))}
        </View>

        {/* Next / Get Started */}
        {isLast ? (
          <>
            <TouchableOpacity
              onPress={handleNext}
              className="bg-terracotta rounded-pill py-4 items-center mb-4"
              style={{ backgroundColor: '#C4614A' }}
            >
              <Text className="text-white font-sans-medium text-base">Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/sign-in')}
              className="items-center"
            >
              <Text className="text-warm-gray font-sans text-sm">
                Already have an account?{' '}
                <Text className="text-blush">Sign in</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            className="border border-terracotta/40 rounded-pill py-4 items-center"
          >
            <Text className="text-terracotta font-sans-medium text-base">Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Test on device**

Run `npx expo start`, open in Expo Go. You should see:
- Dark brown background
- 🛡️ emoji, "Real people only." title, body text
- Skip button top right
- Dot indicators at bottom
- "Next" ghost button
- Swipe to slide 2 and 3
- Last slide shows "Get Started" + "Already have an account?"

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/onboarding.tsx
git commit -m "feat: add 3-slide onboarding screen with dot indicators and navigation"
```

---

## Task 9: Sign Up Screen

**Files:**
- Create: `thirdspace-app/app/(auth)/sign-up.tsx`

- [ ] **Step 1: Create app/(auth)/sign-up.tsx**

```tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential,
} from 'firebase/auth'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import { OAuthProvider } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateSignUpForm, SignUpFormErrors } from '../../utils/validation'
import { StatusBar } from 'expo-status-bar'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
})

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignUp = async () => {
    const formErrors = validateSignUpForm({ name, email, password, confirmPassword })
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name.trim() })
      router.replace('/(app)/')
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setBanner('An account with this email already exists. Sign in instead.')
      } else {
        setBanner('Something went wrong. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const { idToken } = await GoogleSignin.signIn()
      const credential = GoogleAuthProvider.credential(idToken)
      await signInWithCredential(auth, credential)
      router.replace('/(app)/')
    } catch {
      setBanner('Google sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAppleSignUp = async () => {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      const provider = new OAuthProvider('apple.com')
      const oauthCredential = provider.credential({
        idToken: credential.identityToken!,
        rawNonce: credential.authorizationCode!,
      })
      await signInWithCredential(auth, oauthCredential)
      router.replace('/(app)/')
    } catch {
      setBanner('Apple sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text
              className="font-serif text-deep-brown mb-2"
              style={{ fontSize: 32, letterSpacing: -0.5 }}
            >
              Create your account
            </Text>
            <Text className="font-sans-light text-warm-gray text-base">
              Join The Third Space — NYC's community app.
            </Text>
          </View>

          {/* Banner error */}
          {banner ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <Text className="text-red-600 font-sans text-sm">{banner}</Text>
            </View>
          ) : null}

          {/* Form */}
          <FormInput
            label="Full name"
            value={name}
            onChangeText={setName}
            error={errors.name}
            autoCapitalize="words"
            placeholder="Samantha Aleman"
          />
          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            placeholder="8+ characters"
          />
          <FormInput
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            placeholder="Re-enter password"
          />

          <View className="mt-2 gap-3">
            <AuthButton
              label="Create account"
              onPress={handleEmailSignUp}
              variant="primary"
              loading={loading}
            />

            {/* Divider */}
            <View className="flex-row items-center gap-3 my-1">
              <View className="flex-1 h-px bg-blush/40" />
              <Text className="text-warm-gray font-sans text-sm">or continue with</Text>
              <View className="flex-1 h-px bg-blush/40" />
            </View>

            <AuthButton
              label="Continue with Google"
              onPress={handleGoogleSignUp}
              variant="google"
              loading={loading}
            />
            <AuthButton
              label="Continue with Apple"
              onPress={handleAppleSignUp}
              variant="apple"
              loading={loading}
            />
          </View>

          {/* Footer */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-in')}
            className="items-center mt-6"
          >
            <Text className="text-warm-gray font-sans text-sm">
              Already have an account?{' '}
              <Text className="text-terracotta font-sans-medium">Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Test on device**

Run `npx expo start`. Navigate to Sign Up (tap "Get Started" on onboarding). Verify:
- All 4 form fields render
- Submitting empty form shows validation errors under each field
- Mismatched passwords shows error under confirm password field
- Google and Apple buttons appear (Apple hidden on Android)

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/sign-up.tsx
git commit -m "feat: add sign-up screen with email, Google, and Apple auth"
```

---

## Task 10: Sign In Screen

**Files:**
- Create: `thirdspace-app/app/(auth)/sign-in.tsx`

- [ ] **Step 1: Create app/(auth)/sign-in.tsx**

```tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  OAuthProvider,
} from 'firebase/auth'
import { GoogleSignin } from '@react-native-google-signin/google-signin'
import * as AppleAuthentication from 'expo-apple-authentication'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail } from '../../utils/validation'
import { StatusBar } from 'expo-status-bar'

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address.'
    if (!password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/(app)/')
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential'
      ) {
        setBanner('Incorrect email or password.')
      } else if (err.code === 'auth/too-many-requests') {
        setBanner('Too many attempts. Try again later or reset your password.')
      } else {
        setBanner('Something went wrong. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const { idToken } = await GoogleSignin.signIn()
      const credential = GoogleAuthProvider.credential(idToken)
      await signInWithCredential(auth, credential)
      router.replace('/(app)/')
    } catch {
      setBanner('Google sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      })
      const provider = new OAuthProvider('apple.com')
      const oauthCredential = provider.credential({
        idToken: credential.identityToken!,
        rawNonce: credential.authorizationCode!,
      })
      await signInWithCredential(auth, oauthCredential)
      router.replace('/(app)/')
    } catch {
      setBanner('Apple sign-in failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingTop: 40, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} className="mb-8">
            <Text className="text-warm-gray font-sans text-sm">← Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text
              className="font-serif text-deep-brown mb-2"
              style={{ fontSize: 32, letterSpacing: -0.5 }}
            >
              Welcome back
            </Text>
            <Text className="font-sans-light text-warm-gray text-base">
              Sign in to your Third Space account.
            </Text>
          </View>

          {/* Banner */}
          {banner ? (
            <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <Text className="text-red-600 font-sans text-sm">{banner}</Text>
            </View>
          ) : null}

          {/* Form */}
          <FormInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            secureTextEntry
            placeholder="Your password"
          />

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password')}
            className="items-end mb-4 -mt-2"
          >
            <Text className="text-terracotta font-sans text-sm">Forgot password?</Text>
          </TouchableOpacity>

          <View className="gap-3">
            <AuthButton
              label="Sign in"
              onPress={handleEmailSignIn}
              variant="primary"
              loading={loading}
            />

            <View className="flex-row items-center gap-3 my-1">
              <View className="flex-1 h-px bg-blush/40" />
              <Text className="text-warm-gray font-sans text-sm">or continue with</Text>
              <View className="flex-1 h-px bg-blush/40" />
            </View>

            <AuthButton
              label="Continue with Google"
              onPress={handleGoogleSignIn}
              variant="google"
              loading={loading}
            />
            <AuthButton
              label="Continue with Apple"
              onPress={handleAppleSignIn}
              variant="apple"
              loading={loading}
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/sign-up')}
            className="items-center mt-6"
          >
            <Text className="text-warm-gray font-sans text-sm">
              New here?{' '}
              <Text className="text-terracotta font-sans-medium">Create account</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Test on device**

Verify: wrong credentials shows "Incorrect email or password." (same message for both cases). Correct credentials navigate to home stub.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/sign-in.tsx
git commit -m "feat: add sign-in screen with email, Google, and Apple auth"
```

---

## Task 11: Forgot Password Screen

**Files:**
- Create: `thirdspace-app/app/(auth)/forgot-password.tsx`

- [ ] **Step 1: Create app/(auth)/forgot-password.tsx**

```tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail } from '../../utils/validation'
import { StatusBar } from 'expo-status-bar'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorBanner, setErrorBanner] = useState('')

  const handleReset = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
      setSent(true)
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setErrorBanner('No account found with that email address.')
      } else {
        setErrorBanner('Something went wrong. Check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 px-6 pt-10"
      >
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-warm-gray font-sans text-sm">← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View className="flex-1 justify-center">
            <Text className="text-5xl text-center mb-6">📬</Text>
            <Text
              className="font-serif text-deep-brown text-center mb-3"
              style={{ fontSize: 28, letterSpacing: -0.5 }}
            >
              Check your inbox
            </Text>
            <Text className="font-sans-light text-warm-gray text-center text-base leading-relaxed mb-8">
              We sent a reset link to{' '}
              <Text className="text-mid-brown font-sans-medium">{email}</Text>.
              {'\n'}It may take a minute to arrive.
            </Text>
            <AuthButton
              label="Back to sign in"
              onPress={() => router.replace('/(auth)/sign-in')}
              variant="ghost"
            />
          </View>
        ) : (
          <>
            <View className="mb-8">
              <Text
                className="font-serif text-deep-brown mb-2"
                style={{ fontSize: 32, letterSpacing: -0.5 }}
              >
                Reset password
              </Text>
              <Text className="font-sans-light text-warm-gray text-base">
                Enter your email and we'll send you a reset link.
              </Text>
            </View>

            {errorBanner ? (
              <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <Text className="text-red-600 font-sans text-sm">{errorBanner}</Text>
              </View>
            ) : null}

            <FormInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              keyboardType="email-address"
              placeholder="you@example.com"
            />

            <View className="mt-2">
              <AuthButton
                label="Send reset link"
                onPress={handleReset}
                variant="primary"
                loading={loading}
              />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Test on device**

Navigate to Forgot Password from Sign In. Verify success state replaces form with inbox message. Test with unknown email shows "No account found" error.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/forgot-password.tsx
git commit -m "feat: add forgot password screen with email reset flow"
```

---

## Task 12: Home Stub Screen

**Files:**
- Create: `thirdspace-app/app/(app)/index.tsx`

- [ ] **Step 1: Create app/(app)/index.tsx**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { StatusBar } from 'expo-status-bar'

export default function Home() {
  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut(auth)
  }

  return (
    <SafeAreaView className="flex-1 bg-cream items-center justify-center px-6">
      <StatusBar style="dark" />

      {/* Logo circle */}
      <View className="w-20 h-20 rounded-full bg-terracotta items-center justify-center mb-6">
        <Text className="text-white font-serif text-4xl">T</Text>
      </View>

      <Text
        className="font-serif text-deep-brown text-center mb-2"
        style={{ fontSize: 28, letterSpacing: -0.5 }}
      >
        Welcome, {user?.displayName?.split(' ')[0] ?? 'friend'}! 👋
      </Text>

      <Text className="font-sans-light text-warm-gray text-center text-base mb-2">
        You're in. The Third Space is almost ready.
      </Text>

      <Text
        className="font-sans text-center text-sm mb-10"
        style={{ color: '#C4614A' }}
      >
        Events and community features coming in Phase 2.
      </Text>

      <TouchableOpacity
        onPress={handleSignOut}
        className="border border-warm-gray/40 rounded-pill px-6 py-3"
      >
        <Text className="text-warm-gray font-sans text-sm">Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
```

- [ ] **Step 2: Test the full auth flow end to end**

1. Fresh install / clear app data
2. See onboarding slides (swipe through all 3)
3. Tap "Get Started" → Sign Up screen
4. Sign up with a real email → lands on Home stub
5. Force-close app and reopen → still on Home stub (auth persisted via AsyncStorage)
6. Tap "Sign out" → back to onboarding
7. Tap "Sign in" → sign in with the same credentials → back to Home stub

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/
git commit -m "feat: add home stub screen with user greeting and sign out"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: all tests pass (useAuth hook tests + validation tests + FormInput tests).

- [ ] **Step 2: Test all three auth methods on device**

Email/password:
- Sign up with new email ✓
- Sign out ✓
- Sign in with same email ✓
- Wrong password shows correct error ✓
- Forgot password sends email ✓

Google:
- Tap "Continue with Google" → Google account picker appears → signs in ✓

Apple (iOS only):
- Tap "Continue with Apple" → Face ID / Touch ID prompt → signs in ✓

- [ ] **Step 3: Test auth persistence**

Sign in, force-close app, reopen → lands directly on home stub without re-authenticating ✓

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Phase 1 — auth and onboarding with email, Google, and Apple sign-in"
```

---

## Known Limitations / Phase 2 Notes

- Home screen is a stub — replaced entirely in Phase 2 with event feed
- Interest tag selection deferred to Phase 2 profile setup
- No profile photo upload yet
- Apple Sign-In requires a physical iOS device or a paid Apple Developer account for Simulator testing
- Google Sign-In on Android requires SHA-1 fingerprint registered in Firebase console
