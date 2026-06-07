# The Third Space — Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo | SDK 54.0.0 |
| Mobile runtime | React Native | 0.81.5 |
| Navigation | expo-router | v6.0.24 (file-based) |
| Language | TypeScript | 5.7.x |
| Backend / Auth | Firebase | v11.10.0 |
| Database | Cloud Firestore | via Firebase |
| Auth providers | Firebase Auth | Email, Apple, Google |
| Apple Sign In | expo-apple-authentication | ~8.0.8 |
| Google OAuth | expo-auth-session + expo-web-browser | v7.0.11 + v15.0.11 |
| Fonts | Google Fonts (DM Serif Display, DM Sans) | via expo-google-fonts ~0.4.2 |
| Styling | React Native StyleSheet + expo-linear-gradient | mixed, native |
| State & Navigation | React 19 + expo-router context | standard patterns |
| Storage | AsyncStorage | v2.2.0 |

---

## Project Structure

```
The_Third_Space/
├── thirdspace-app/          # Expo / React Native app (primary focus)
│   ├── app/
│   │   ├── (auth)/          # Auth route group (no tab bar)
│   │   │   ├── _layout.tsx
│   │   │   ├── onboarding.tsx
│   │   │   ├── sign-in.tsx
│   │   │   ├── sign-up.tsx
│   │   │   ├── forgot-password.tsx
│   │   │   └── role-select.tsx
│   │   ├── (app)/           # Authenticated app route group
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx    # Home screen
│   │   ├── index.tsx        # Root redirect
│   │   └── _layout.tsx      # Root layout + AuthRedirect
│   ├── firebase/
│   │   └── config.ts        # Firebase init (auth, firestore exports)
│   ├── hooks/
│   │   └── useAuth.ts       # Auth state, role, loading
│   ├── __tests__/
│   │   └── hooks/
│   │       └── useAuth.test.ts
│   ├── assets/
│   │   ├── icon.png
│   │   ├── splash-icon.png
│   │   ├── android-icon-foreground.png
│   │   └── (other images)
│   ├── app.json             # Expo config (iOS/Android plugins)
│   ├── package.json         # Dependencies & scripts
│   ├── tsconfig.json        # TypeScript config
│   └── babel.config.js      # Babel preset (expo)
├── thirdspace-web/          # Vite / React web app (separate, not covered here)
└── docs/
    ├── ARCHITECTURE.md      # This file
    └── (other guides)
```

---

## Screens (Route Map)

| Screen | Route | Auth state | Description |
|--------|-------|-----------|-------------|
| Onboarding | `/(auth)/onboarding` | unauthenticated | 3-slide carousel with value props |
| Sign Up | `/(auth)/sign-up` | unauthenticated | email/password + Apple + Google |
| Sign In | `/(auth)/sign-in` | unauthenticated | email/password + Apple + Google |
| Forgot Password | `/(auth)/forgot-password` | unauthenticated | email reset link flow |
| Role Select | `/(auth)/role-select` | authenticated, no role | choose attender or hoster |
| Home | `/(app)/` | authenticated + role | role-specific placeholder |

All screens are TypeScript + React Native with file-based routing (expo-router v6).

---

## Auth Flow

```
App startup
  └── Root _layout checks AuthRedirect
        ├── user = null → /(auth)/onboarding
        ├── user exists, role = null → /(auth)/role-select
        └── user exists, role set → /(app)/

User Sign Up (new account)
  email/Apple/Google → Firebase Auth
                    → /(auth)/role-select
                    → Firestore write (users/{uid})
                    → /(app)/

User Sign In (existing account)
  email/Apple/Google → Firebase Auth
                    → AuthRedirect checks Firestore
                    → /(app)/
```

---

## Data Model

### Firestore `users` Collection

| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Auth UID (document ID) |
| displayName | string | User's full name |
| email | string | User's email address |
| role | 'attender' \| 'hoster' | Chosen role (required for app access) |
| createdAt | Timestamp | Server timestamp at role selection |

**Notes:**
- Written once when user completes `/(auth)/role-select`
- Never overwritten on subsequent sign-ins
- Required to grant access to `/(app)/` routes

---

## User Roles

| Role | Value | Purpose | Phase |
|------|-------|---------|-------|
| Event Attender | `'attender'` | Browse and join events | Phase 2 |
| Event Hoster | `'hoster'` | Create and manage events | Phase 2 |

Both roles are selected during onboarding (Phase 1). Event-specific functionality deferred to Phase 2.

---

## Environment Variables

Defined in `.env` at project root (see `.env.example`). All Firebase public keys use the `EXPO_PUBLIC_` prefix for Expo to inline them into the app.

| Variable | Source | Purpose |
|----------|--------|---------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Console | SDK authentication |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Console | Auth domain for OAuth |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Console | Firestore database |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Console | Cloud Storage (future) |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console | FCM (future notifications) |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase Console | Firebase app ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google Cloud Console | Google OAuth web client |

All are required for auth and database functionality.

---

## Running the App

### Development

```bash
cd thirdspace-app

# Expo dev server (Expo Go or custom dev build)
npx expo start

# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Web (if supported)
npx expo start --web
```

### Testing

```bash
cd thirdspace-app

# Run Jest tests
npm test

# Watch mode
npm run test:watch
```

### Production Build

```bash
# EAS build (requires EAS CLI and project setup)
eas build --platform ios
eas build --platform android
```

---

## Key Dependencies

### Firebase (`^11.10.0`)

- `firebase/auth` — Email, Apple, Google authentication
- `firebase/firestore` — Real-time database for users, events (Phase 2)
- `firebase/storage` — Image/media storage (future)

### Expo Ecosystem

- `expo-router@~6.0.24` — File-based routing, deep links
- `expo-apple-authentication@~8.0.8` — Apple Sign In on iOS
- `expo-auth-session@~7.0.11` — OAuth flow for Google
- `expo-web-browser@~15.0.11` — Browser authentication flow
- `expo-font@~14.0.12` — Custom font loading
- `expo-linear-gradient@~15.0.8` — Gradient backgrounds
- `@react-native-async-storage/async-storage@2.2.0` — Local key-value storage

### React & React Native

- `react@19.1.0` — Latest React with hooks
- `react-native@0.81.5` — Mobile runtime
- `react-native-screens@~4.16.0` — Native screen management
- `react-native-safe-area-context@~5.6.0` — Safe area layout

### Fonts

- `@expo-google-fonts/dm-serif-display@^0.4.2` — Display font
- `@expo-google-fonts/dm-sans@^0.4.2` — Body font

---

## Architecture Decisions

### Route Structure with expo-router

Routes are organized by authentication state:
- `(auth)` group: sign-up, sign-in, role selection (no bottom navigation)
- `(app)` group: authenticated screens (future navigation patterns)

This matches Expo Router v6 conventions and keeps auth flows isolated from app flows.

### Firestore as Source of Truth

User role is stored in Firestore, not just in Firebase Auth. This allows:
- Role-based access control (RBAC) on backend
- Extensibility for future user fields (profile, preferences)
- Clear separation of auth state (Firebase Auth) from app state (Firestore)

### useAuth Hook

Centralized auth state via custom hook, consumed by:
- Root `_layout.tsx` for conditional rendering
- Individual screens for role-specific UI
- Reduces prop drilling and keeps state logic testable

### TypeScript & Strict Types

- `tsconfig.json` enforces strict mode
- All screens and components typed
- Enables IDE autocomplete and catch errors at compile time

---

## Testing Strategy

- **Unit tests**: `useAuth` hook and auth utilities (Jest + React Testing Library)
- **Integration tests**: Auth flows, Firestore reads/writes (future)
- **E2E tests**: Critical user journeys (future, Detox or similar)

See `__tests__/` directory for examples.

---

## Future Phases

### Phase 2: Events & Discovery
- Event creation and management
- Event feed & discovery
- Firestore schema for events, attendances
- Messaging & notifications

### Phase 3: Advanced Features
- Profile customization
- Social networking (following, likes)
- Push notifications (FCM)
- Search & filtering

---

## Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **Firebase Docs**: https://firebase.google.com/docs
- **expo-router Docs**: https://expo.dev/router
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/

---

**Last Updated**: 2026-06-07  
**Maintainers**: The Third Space team
