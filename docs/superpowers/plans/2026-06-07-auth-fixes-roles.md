# Auth Fixes, Role System & Post-Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Firebase auth crashes, implement Google Sign-in, add a post-signup role-select screen, and build role-aware routing and home screen for Event Attenders and Hosters.

**Architecture:** All auth state flows through Firebase Auth → Firestore (user profile + role) → `useAuth` hook → `AuthRedirect` in root layout. New users are always sent to role-select after account creation before entering the app. Returning users are routed directly to the app by `AuthRedirect` which reads their saved role from Firestore.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router v6, Firebase v11, Firestore, expo-auth-session, expo-web-browser, TypeScript 5.7

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `thirdspace-app/firebase/config.ts` | Fix double-init crash |
| Modify | `thirdspace-app/app/(auth)/sign-in.tsx` | Fix Apple cancellation, add Google Sign-in |
| Modify | `thirdspace-app/app/(auth)/sign-up.tsx` | Fix Apple cancellation + error codes, add Google Sign-in, navigate to role-select |
| Create | `thirdspace-app/app/(auth)/role-select.tsx` | Role selection screen (attender / hoster) |
| Modify | `thirdspace-app/hooks/useAuth.ts` | Add role from Firestore |
| Modify | `thirdspace-app/__tests__/hooks/useAuth.test.ts` | Update tests for role |
| Modify | `thirdspace-app/app/_layout.tsx` | AuthRedirect handles no-role state |
| Modify | `thirdspace-app/app/(app)/index.tsx` | Role-aware home screen |
| Modify | `thirdspace-app/app.json` | Add expo-web-browser plugin |
| Create | `docs/ARCHITECTURE.md` | Tech stack and architecture documentation |

All commands below assume you are in `E:/Claude/The_Third_Space/thirdspace-app/` unless stated otherwise.

---

### Task 1: Fix Firebase auth double-init crash

**Files:**
- Modify: `firebase/config.ts`

The current code calls `initializeAuth(app, ...)` unconditionally every time the module loads. When Firebase already has an auth instance (fast refresh, re-evaluation), it throws. That error code doesn't match any handled case, producing the "Something went wrong" banner.

- [ ] **Step 1: Replace `firebase/config.ts` with the fixed version**

```ts
import { initializeApp, getApps } from 'firebase/app'
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth'
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

let auth
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
} catch {
  auth = getAuth(app)
}

export { auth }
export const db = getFirestore(app)
export default app
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add firebase/config.ts
git commit -m "fix: resolve Firebase auth double-init crash"
```

---

### Task 2: Handle Apple Sign-in cancellation silently

**Files:**
- Modify: `app/(auth)/sign-in.tsx`
- Modify: `app/(auth)/sign-up.tsx`

When a user taps "Cancel" on the Apple auth sheet, `signInAsync` throws with `code: 'ERR_CANCELED'`. The current catch block shows "Apple sign-in failed. Try again." — incorrect for a cancellation.

- [ ] **Step 1: Update `handleAppleSignIn` in `sign-in.tsx`**

Find and replace the entire `handleAppleSignIn` function:

```ts
const handleAppleSignIn = async () => {
  setLoading(true)
  try {
    const { raw, hashed } = await generateNonce()
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
      nonce: hashed,
    })
    const provider = new OAuthProvider('apple.com')
    await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
    router.replace('/(app)/')
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'ERR_CANCELED') return
    setBanner('Apple sign-in failed. Try again.')
  } finally { setLoading(false) }
}
```

- [ ] **Step 2: Update `handleAppleSignUp` in `sign-up.tsx`**

Find and replace the entire `handleAppleSignUp` function:

```ts
const handleAppleSignUp = async () => {
  setLoading(true)
  try {
    const { raw, hashed } = await generateNonce()
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    })
    const provider = new OAuthProvider('apple.com')
    await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
    router.replace('/(app)/')
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code === 'ERR_CANCELED') return
    setBanner('Apple sign-in failed. Try again.')
  } finally { setLoading(false) }
}
```

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/sign-in.tsx" "app/(auth)/sign-up.tsx"
git commit -m "fix: handle Apple Sign-in cancellation silently"
```

---

### Task 3: Surface specific Firebase error codes on sign-up

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

The `handleEmailSignUp` catch block only handles `auth/email-already-in-use`. All other codes fall through to "Something went wrong."

- [ ] **Step 1: Replace the catch block inside `handleEmailSignUp` in `sign-up.tsx`**

Find this in the file:
```ts
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      setBanner(code === 'auth/email-already-in-use' ? 'An account with this email already exists. Sign in instead.' : 'Something went wrong. Check your connection and try again.')
    } finally { setLoading(false) }
```

Replace with:
```ts
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
        'auth/network-request-failed': 'No connection. Check your internet and try again.',
        'auth/operation-not-allowed': 'Email sign-up is not enabled. Contact support.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setBanner(messages[code] ?? 'Something went wrong. Try again.')
    } finally { setLoading(false) }
```

- [ ] **Step 2: Commit**

```bash
git add "app/(auth)/sign-up.tsx"
git commit -m "fix: surface specific Firebase error codes on sign-up"
```

---

### Task 4: Implement Google Sign-in via expo-auth-session

**Files:**
- Modify: `app.json`
- Modify: `app/(auth)/sign-up.tsx` (full replacement — incorporates all prior changes to this file)
- Modify: `app/(auth)/sign-in.tsx` (full replacement — incorporates all prior changes to this file)

- [ ] **Step 1: Install packages**

```bash
npx expo install expo-auth-session expo-web-browser
```

Expected: `expo-auth-session` and `expo-web-browser` appear in `package.json` dependencies.

- [ ] **Step 2: Add `expo-web-browser` to plugins in `app.json`**

Replace the `"plugins"` array:
```json
"plugins": [
  "expo-router",
  "expo-apple-authentication",
  "expo-web-browser"
]
```

- [ ] **Step 3: Replace `app/(auth)/sign-up.tsx` with the Google-enabled version**

This version incorporates Tasks 2 and 3 changes plus the Google auth request. Note: email and Apple navigation still go to `/(app)/` — that changes in Task 7.

```tsx
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, OAuthProvider, GoogleAuthProvider } from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateSignUpForm, SignUpFormErrors } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { StatusBar } from 'expo-status-bar'

WebBrowser.maybeCompleteAuthSession()

export default function SignUp() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<SignUpFormErrors>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params
      const credential = GoogleAuthProvider.credential(id_token)
      setLoading(true)
      signInWithCredential(auth, credential)
        .then(() => router.replace('/(auth)/role-select'))
        .catch(() => setBanner('Google sign-in failed. Try again.'))
        .finally(() => setLoading(false))
    } else if (googleResponse?.type === 'error') {
      setBanner('Google sign-in failed. Try again.')
    }
  }, [googleResponse])

  const handleEmailSignUp = async () => {
    const formErrors = validateSignUpForm({ name, email, password, confirmPassword })
    if (Object.keys(formErrors).length > 0) { setErrors(formErrors); return }
    setErrors({})
    setLoading(true)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: name.trim() })
      router.replace('/(app)/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
        'auth/network-request-failed': 'No connection. Check your internet and try again.',
        'auth/operation-not-allowed': 'Email sign-up is not enabled. Contact support.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }
      setBanner(messages[code] ?? 'Something went wrong. Try again.')
    } finally { setLoading(false) }
  }

  const handleGoogleSignUp = () => promptGoogleAsync()

  const handleAppleSignUp = async () => {
    setLoading(true)
    try {
      const { raw, hashed } = await generateNonce()
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
        nonce: hashed,
      })
      const provider = new OAuthProvider('apple.com')
      await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
      router.replace('/(app)/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_CANCELED') return
      setBanner('Apple sign-in failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Join The Third Space — NYC's community app.</Text>
          </View>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput label="Full name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" placeholder="Samantha Aleman" />
          <FormInput label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" placeholder="you@example.com" />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="8+ characters" />
          <FormInput label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry placeholder="Re-enter password" />

          <View style={styles.buttons}>
            <AuthButton label="Create account" onPress={handleEmailSignUp} variant="primary" loading={loading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={handleGoogleSignUp} variant="google" loading={loading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignUp} variant="apple" loading={loading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? <Text style={styles.footerLink}>Sign in</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 32 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  buttons: { marginTop: 8, gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(242,197,160,0.4)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footerLink: { color: '#C4614A', fontFamily: 'DMSans_500Medium' },
})
```

- [ ] **Step 4: Replace `app/(auth)/sign-in.tsx` with the Google-enabled version**

This version incorporates the Task 2 Apple cancellation fix plus the Google auth request.

```tsx
import React, { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { signInWithEmailAndPassword, OAuthProvider, signInWithCredential, GoogleAuthProvider } from 'firebase/auth'
import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as WebBrowser from 'expo-web-browser'
import { auth } from '../../firebase/config'
import { FormInput } from '../../components/FormInput'
import { AuthButton } from '../../components/AuthButton'
import { validateEmail } from '../../utils/validation'
import { generateNonce } from '../../utils/crypto'
import { StatusBar } from 'expo-status-bar'

WebBrowser.maybeCompleteAuthSession()

export default function SignIn() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [banner, setBanner] = useState('')
  const [loading, setLoading] = useState(false)

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  })

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params
      const credential = GoogleAuthProvider.credential(id_token)
      setLoading(true)
      signInWithCredential(auth, credential)
        .then(() => router.replace('/(app)/'))
        .catch(() => setBanner('Google sign-in failed. Try again.'))
        .finally(() => setLoading(false))
    } else if (googleResponse?.type === 'error') {
      setBanner('Google sign-in failed. Try again.')
    }
  }, [googleResponse])

  const handleEmailSignIn = async () => {
    const newErrors: { email?: string; password?: string } = {}
    if (!validateEmail(email)) newErrors.email = 'Please enter a valid email address.'
    if (!password) newErrors.password = 'Password is required.'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.replace('/(app)/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setBanner('Incorrect email or password.')
      } else if (code === 'auth/too-many-requests') {
        setBanner('Too many attempts. Try again later or reset your password.')
      } else {
        setBanner('Something went wrong. Check your connection and try again.')
      }
    } finally { setLoading(false) }
  }

  const handleGoogleSignIn = () => promptGoogleAsync()

  const handleAppleSignIn = async () => {
    setLoading(true)
    try {
      const { raw, hashed } = await generateNonce()
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
        nonce: hashed,
      })
      const provider = new OAuthProvider('apple.com')
      await signInWithCredential(auth, provider.credential({ idToken: credential.identityToken!, rawNonce: raw }))
      router.replace('/(app)/')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'ERR_CANCELED') return
      setBanner('Apple sign-in failed. Try again.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to your Third Space account.</Text>
          </View>

          {banner ? <View style={styles.banner}><Text style={styles.bannerText}>{banner}</Text></View> : null}

          <FormInput label="Email" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" placeholder="you@example.com" />
          <FormInput label="Password" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry placeholder="Your password" />

          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.buttons}>
            <AuthButton label="Sign in" onPress={handleEmailSignIn} variant="primary" loading={loading} />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
            <AuthButton label="Continue with Google" onPress={handleGoogleSignIn} variant="google" loading={loading} />
            <AuthButton label="Continue with Apple" onPress={handleAppleSignIn} variant="apple" loading={loading} />
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.footer}>
            <Text style={styles.footerText}>New here? <Text style={styles.footerLink}>Create account</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flex: 1, paddingHorizontal: 24 },
  content: { paddingTop: 40, paddingBottom: 40 },
  back: { marginBottom: 32 },
  backText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  header: { marginBottom: 32 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70' },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  forgot: { alignItems: 'flex-end', marginBottom: 16, marginTop: -8 },
  forgotText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4614A' },
  buttons: { gap: 12 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(242,197,160,0.4)' },
  dividerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footer: { alignItems: 'center', marginTop: 24 },
  footerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  footerLink: { color: '#C4614A', fontFamily: 'DMSans_500Medium' },
})
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app.json "app/(auth)/sign-up.tsx" "app/(auth)/sign-in.tsx" package.json
git commit -m "feat: implement Google Sign-in via expo-auth-session"
```

---

### Task 5: Add role-select screen

**Files:**
- Create: `app/(auth)/role-select.tsx`

This screen is shown after any new account creation. It writes `users/{uid}` to Firestore and then navigates to the app.

- [ ] **Step 1: Create `app/(auth)/role-select.tsx`**

```tsx
import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../../firebase/config'
import { StatusBar } from 'expo-status-bar'

type Role = 'attender' | 'hoster'

const ROLES: { role: Role; icon: string; title: string; body: string }[] = [
  {
    role: 'attender',
    icon: '👥',
    title: "I'm here to attend",
    body: "Join events, see who's going, connect with people before you arrive.",
  },
  {
    role: 'hoster',
    icon: '🛡️',
    title: "I'm here to host",
    body: 'Create events, manage your guest list, build your community.',
  },
]

export default function RoleSelect() {
  const router = useRouter()
  const [loading, setLoading] = useState<Role | null>(null)
  const [banner, setBanner] = useState('')

  const handleSelectRole = async (role: Role) => {
    const user = auth.currentUser
    if (!user) return
    setLoading(role)
    setBanner('')
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        role,
        createdAt: serverTimestamp(),
      })
      router.replace('/(app)/')
    } catch {
      setBanner('Something went wrong. Try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>What brings you here?</Text>
        <Text style={styles.subtitle}>Choose how you'll use The Third Space.</Text>

        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {ROLES.map(({ role, icon, title, body }) => (
          <TouchableOpacity
            key={role}
            style={[styles.card, loading !== null && styles.cardDisabled]}
            onPress={() => handleSelectRole(role)}
            disabled={loading !== null}
          >
            <Text style={styles.cardIcon}>{icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardBody}>{body}</Text>
            </View>
            {loading === role && <ActivityIndicator color="#C4614A" />}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 32, color: '#2C1810', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', marginBottom: 40 },
  banner: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 12, padding: 16, marginBottom: 16 },
  bannerText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#dc2626' },
  card: { backgroundColor: '#FFF9F4', borderWidth: 1.5, borderColor: 'rgba(242,197,160,0.6)', borderRadius: 20, padding: 24, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardDisabled: { opacity: 0.6 },
  cardIcon: { fontSize: 32 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: 'DMSans_500Medium', fontSize: 18, color: '#2C1810', marginBottom: 4 },
  cardBody: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#8C7B70', lineHeight: 20 },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/role-select.tsx"
git commit -m "feat: add role-select screen for attender vs hoster"
```

---

### Task 6: Extend useAuth with Firestore role

**Files:**
- Modify: `hooks/useAuth.ts`
- Modify: `__tests__/hooks/useAuth.test.ts`

- [ ] **Step 1: Write the failing tests — replace `__tests__/hooks/useAuth.test.ts`**

```ts
import { renderHook, act } from '@testing-library/react-native'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../firebase/config', () => ({
  auth: {},
  db: {},
}))

let authCallback: ((user: unknown) => void) | null = null
let mockDocData: Record<string, unknown> | null = null

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn((_auth: unknown, callback: (user: unknown) => void) => {
    authCallback = callback
    return jest.fn()
  }),
}))

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(async () => ({
    exists: () => mockDocData !== null,
    data: () => mockDocData,
  })),
}))

describe('useAuth', () => {
  beforeEach(() => {
    authCallback = null
    mockDocData = null
  })

  it('starts with loading true, no user, and no role', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
  })

  it('sets user and role when auth resolves with a user who has a Firestore profile', async () => {
    mockDocData = { role: 'attender' }
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: '123', email: 'test@test.com' }
    await act(async () => { authCallback?.(mockUser) })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.role).toBe('attender')
  })

  it('sets role to null when user has no Firestore profile yet', async () => {
    mockDocData = null
    const { result } = renderHook(() => useAuth())
    const mockUser = { uid: '456', email: 'new@test.com' }
    await act(async () => { authCallback?.(mockUser) })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
    expect(result.current.role).toBeNull()
  })

  it('clears user and role when signed out', async () => {
    const { result } = renderHook(() => useAuth())
    await act(async () => { authCallback?.(null) })
    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx jest __tests__/hooks/useAuth.test.ts --no-coverage
```

Expected: Tests fail — `role` is undefined on the result.

- [ ] **Step 3: Replace `hooks/useAuth.ts` with the role-aware version**

```ts
import { useEffect, useState } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

type Role = 'attender' | 'hoster' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setRole(snap.exists() ? (snap.data().role as 'attender' | 'hoster') : null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

  return { user, role, loading }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest __tests__/hooks/useAuth.test.ts --no-coverage
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add hooks/useAuth.ts "__tests__/hooks/useAuth.test.ts"
git commit -m "feat: extend useAuth with Firestore role"
```

---

### Task 7: Update auth routing for new-user role-select flow

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(auth)/sign-up.tsx`

- [ ] **Step 1: Replace `app/_layout.tsx` with the role-aware routing version**

```tsx
import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useFonts, DMSerifDisplay_400Regular, DMSerifDisplay_400Regular_Italic } from '@expo-google-fonts/dm-serif-display'
import { DMSans_300Light, DMSans_400Regular, DMSans_500Medium } from '@expo-google-fonts/dm-sans'
import { useAuth } from '../hooks/useAuth'

interface AuthRedirectProps {
  user: import('firebase/auth').User | null
  role: 'attender' | 'hoster' | null
  loading: boolean
}

function AuthRedirect({ user, role, loading }: AuthRedirectProps) {
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    const inAppGroup = segments[0] === '(app)'
    const onRoleSelect = segments[1] === 'role-select'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding')
    } else if (user && !role && !onRoleSelect) {
      router.replace('/(auth)/role-select')
    } else if (user && role && !inAppGroup) {
      router.replace('/(app)/')
    }
  }, [user, role, loading, segments])

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
  const { user, role, loading } = useAuth()

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C1810' }}>
        <ActivityIndicator color="#C4614A" size="large" />
      </View>
    )
  }

  return (
    <>
      <AuthRedirect user={user} role={role} loading={loading} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
```

- [ ] **Step 2: Update `sign-up.tsx` — change email and Apple navigation to `/(auth)/role-select`**

In `sign-up.tsx`, inside `handleEmailSignUp`, change:
```ts
router.replace('/(app)/')
```
to:
```ts
router.replace('/(auth)/role-select')
```

Inside `handleAppleSignUp`, change:
```ts
router.replace('/(app)/')
```
to:
```ts
router.replace('/(auth)/role-select')
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx "app/(auth)/sign-up.tsx"
git commit -m "feat: update auth routing for new-user role-select flow"
```

---

### Task 8: Role-aware home screen

**Files:**
- Modify: `app/(app)/index.tsx`

- [ ] **Step 1: Replace `app/(app)/index.tsx` with the role-aware version**

```tsx
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { StatusBar } from 'expo-status-bar'

export default function Home() {
  const { user, role } = useAuth()
  const isHoster = role === 'hoster'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{isHoster ? 'Host' : 'Attender'}</Text>
      </View>
      <View style={styles.logoCircle}>
        <Text style={styles.logoLetter}>T</Text>
      </View>
      <Text style={styles.welcome}>
        Welcome, {user?.displayName?.split(' ')[0] ?? 'friend'}!
      </Text>
      <Text style={styles.subtitle}>You're in. The Third Space is almost ready.</Text>
      <Text style={styles.phase2}>
        {isHoster
          ? 'Create your first event — coming in Phase 2.'
          : 'Browse upcoming events — coming in Phase 2.'}
      </Text>
      <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  roleBadge: { position: 'absolute', top: 56, right: 24, backgroundColor: 'rgba(196,97,74,0.12)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontFamily: 'DMSans_500Medium', fontSize: 12, color: '#C4614A' },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoLetter: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, color: 'white' },
  welcome: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', textAlign: 'center', marginBottom: 8 },
  phase2: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4614A', textAlign: 'center', marginBottom: 40 },
  signOutButton: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/index.tsx"
git commit -m "feat: role-aware home screen for attender and hoster"
```

---

### Task 9: Add architecture and tech stack documentation

**Files:**
- Create: `docs/ARCHITECTURE.md` (in repo root, one level above `thirdspace-app/`)

- [ ] **Step 1: Create `docs/ARCHITECTURE.md`**

Run from `E:/Claude/The_Third_Space/` (repo root):

```markdown
# The Third Space — Architecture

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Mobile framework | Expo (React Native) | SDK 54 |
| Navigation | expo-router | v6 |
| Language | TypeScript | ~5.7 |
| Auth backend | Firebase Auth | v11 |
| Database | Cloud Firestore | v11 |
| Auth persistence | AsyncStorage | 2.2.0 |
| OAuth (Google) | expo-auth-session + expo-web-browser | latest |
| OAuth (Apple) | expo-apple-authentication | ~8.0 |
| Fonts | @expo-google-fonts/dm-serif-display, dm-sans | ^0.4 |
| Styling | React Native StyleSheet | — |
| Testing | Jest + jest-expo + @testing-library/react-native | — |

## Project Structure

```
thirdspace-app/
├── app/                         # expo-router file-based routes
│   ├── _layout.tsx              # Root layout — fonts, auth redirect
│   ├── index.tsx                # Entry — redirects to /(auth)/onboarding
│   ├── (auth)/                  # Unauthenticated screens
│   │   ├── _layout.tsx          # Auth group stack (slide_from_right animation)
│   │   ├── onboarding.tsx       # 3-slide value prop carousel
│   │   ├── sign-up.tsx          # Account creation (email, Google, Apple)
│   │   ├── sign-in.tsx          # Sign in (email, Google, Apple)
│   │   ├── forgot-password.tsx  # Password reset via email
│   │   └── role-select.tsx      # Attender vs Hoster selection (new users only)
│   └── (app)/                   # Authenticated screens
│       ├── _layout.tsx          # App group stack
│       └── index.tsx            # Home screen (role-aware)
├── components/
│   ├── AuthButton.tsx           # Primary / Google / Apple / Ghost button variants
│   ├── FormInput.tsx            # Labelled text input with inline error state
│   └── OnboardingSlide.tsx      # Single onboarding carousel slide
├── firebase/
│   └── config.ts                # Firebase app init, auth export, Firestore export
├── hooks/
│   └── useAuth.ts               # Auth state + Firestore role listener
├── utils/
│   ├── validation.ts            # Email and sign-up form validation helpers
│   └── crypto.ts                # SHA-256 nonce generation for Apple Sign-in
├── constants/
│   └── theme.ts                 # Design tokens
└── __tests__/
    ├── hooks/useAuth.test.ts
    ├── utils/validation.test.ts
    └── components/FormInput.test.tsx
```

## Screens

| Screen | Route | Auth state |
|--------|-------|------------|
| Onboarding | `/(auth)/onboarding` | Unauthenticated |
| Sign Up | `/(auth)/sign-up` | Unauthenticated |
| Sign In | `/(auth)/sign-in` | Unauthenticated |
| Forgot Password | `/(auth)/forgot-password` | Unauthenticated |
| Role Select | `/(auth)/role-select` | Authenticated, no role yet |
| Home | `/(app)/` | Authenticated + role |

## Auth Flow

```
App launch
  │
  ├─ No user ──────────────────► Onboarding ──► Sign Up / Sign In
  │                                                    │
  │                               New account created (email / Google / Apple)
  │                                                    │
  │                                             Role Select screen
  │                                          (attender or hoster card)
  │                                                    │
  │                                       Writes users/{uid} to Firestore
  │                                                    │
  └─ User + role ──────────────────────────────────────► Home (role-aware)
  │
  └─ User + no role ───────────────────────────────────► Role Select
     (edge case: account exists but role doc missing)
```

## Auth State Management

`useAuth` (`hooks/useAuth.ts`) is the single source of truth:

- Listens to `onAuthStateChanged` from Firebase Auth
- On user sign-in, fetches `users/{uid}` from Firestore to load the role
- Exposes `{ user, role, loading }`
- `loading: true` while Firebase auth or Firestore is resolving
- `role: null` means signed in but role not yet selected

`AuthRedirect` in `app/_layout.tsx` reads from `useAuth` and routes:

| State | Destination |
|-------|-------------|
| No user, not in auth group | `/(auth)/onboarding` |
| User + no role, not on role-select | `/(auth)/role-select` |
| User + role, not in app group | `/(app)/` |

## Firestore Data Model

### Collection: `users`

Document ID = Firebase Auth `uid`

| Field | Type | Description |
|-------|------|-------------|
| uid | string | Firebase Auth UID |
| displayName | string | From Firebase Auth profile |
| email | string | From Firebase Auth profile |
| role | `'attender'` \| `'hoster'` | Set once on role-select screen |
| createdAt | Timestamp | Server timestamp, written once |

## Auth Methods

| Method | Screens | Notes |
|--------|---------|-------|
| Email + Password | sign-up, sign-in | Firebase Auth |
| Google OAuth | sign-up, sign-in | expo-auth-session + expo-web-browser |
| Apple Sign-In | sign-up, sign-in | iOS only — expo-apple-authentication |
| Password Reset | forgot-password | Firebase `sendPasswordResetEmail` |

## User Roles

| Role | Firestore value | Description |
|------|----------------|-------------|
| Event Attender | `'attender'` | Joins and browses events |
| Event Hoster | `'hoster'` | Creates and manages events |

Role is chosen once on role-select and stored permanently in Firestore. The home screen displays role-specific content based on this value.

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background (light) | `#FBF7F2` | App screens |
| Background (dark) | `#2C1810` | Onboarding, splash |
| Brand / CTA | `#C4614A` | Buttons, accents |
| Text primary | `#2C1810` | Headings |
| Text secondary | `#8C7B70` | Body, labels |
| Brand light | `#F2C5A0` | Links, highlights |

Fonts: **DM Serif Display** (headings) + **DM Sans** (body — 300 Light, 400 Regular, 500 Medium)

## Environment Variables

Defined in `.env` (copy from `.env.example`, never commit `.env`):

```
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
```

`EXPO_PUBLIC_` prefix makes variables available in the app bundle at build time.

## Running the App

```bash
cd thirdspace-app
npm install
cp .env.example .env   # fill in your Firebase + Google credentials
npx expo start         # starts Expo dev server
```

## Running Tests

```bash
cd thirdspace-app
npm test               # run all tests once
npm run test:watch     # watch mode
```
```

- [ ] **Step 2: Commit from repo root**

```bash
cd E:/Claude/The_Third_Space
git add docs/ARCHITECTURE.md
git commit -m "docs: add architecture and tech stack documentation"
```

- [ ] **Step 3: Push all commits to GitHub**

```bash
git push origin main
```

Expected: All 9 commits pushed successfully.

---

## Self-Review

**Spec coverage:**
- ✓ 1a Firebase double-init → Task 1
- ✓ 1b Apple cancellation → Tasks 2 & 4 (baked into full file replacements)
- ✓ 1c Error codes → Tasks 3 & 4 (baked into sign-up.tsx replacement)
- ✓ Google Sign-in → Task 4
- ✓ Role-select screen → Task 5
- ✓ useAuth + Firestore role → Task 6
- ✓ Auth routing update → Task 7
- ✓ Role-aware home → Task 8
- ✓ Architecture doc → Task 9

**Placeholder scan:** All code blocks are complete. No TBDs or "implement later" stubs.

**Type consistency:**
- `Role` type is `'attender' | 'hoster' | null` — used in `useAuth.ts` (line: `type Role`), `_layout.tsx` (`AuthRedirectProps.role`), `(app)/index.tsx` (inferred from `useAuth()`)
- `auth` and `db` exported from `firebase/config.ts`, imported in `role-select.tsx`, `useAuth.ts`, `(app)/index.tsx`
- `useAuth()` returns `{ user, role, loading }` — all consumers destructure these exact names
- `AuthRedirectProps` includes `role` — `RootLayout` passes `role` from `useAuth()`
- Task 4 sign-up.tsx still has `router.replace('/(app)/')` for email/Apple — intentional, changed in Task 7
