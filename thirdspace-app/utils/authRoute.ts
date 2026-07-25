export type Role = 'attender' | 'hoster' | null

export interface AuthRouteState {
  hasUser: boolean
  role: Role
  hasProfile: boolean
  segment0: string | undefined
  segment1: string | undefined
}

// Decides where the AuthRedirect guard should send the user, or null to stay put.
// Principle: the marketing/onboarding page is the home base for any account that
// isn't fully set up. Setup steps (role-select, then create-profile for attenders)
// are reached by forward navigation — never dumped on the user at cold start.
export function resolveAuthRoute(state: AuthRouteState): string | null {
  const { hasUser, role, hasProfile, segment0, segment1 } = state
  const setupComplete = hasUser && !!role && (role !== 'attender' || hasProfile)
  const inAuthGroup = segment0 === '(auth)'
  const inAppGroup = segment0 === '(app)'

  if (setupComplete) {
    return inAppGroup ? null : '/(app)'
  }

  // Signed out: onboarding is home, but let them move freely within the auth group
  // (onboarding -> sign-in / sign-up).
  if (!hasUser) {
    return inAuthGroup ? null : '/(auth)/onboarding'
  }

  // Signed in but setup incomplete. Onboarding is allowed as a resting place so the
  // marketing screen still shows first on cold start; anywhere else, move forward to
  // the next unfinished step.
  const nextStep = !role ? 'role-select' : 'create-profile'
  if (inAppGroup) return `/(auth)/${nextStep}`
  if (inAuthGroup) {
    return segment1 === 'onboarding' || segment1 === nextStep ? null : `/(auth)/${nextStep}`
  }
  // Segments not settled yet (root/index) — let index redirect to onboarding first.
  return null
}
