import { resolveAuthRoute } from '../../utils/authRoute'

describe('resolveAuthRoute — signed out', () => {
  it('sends a signed-out user in the app group back to onboarding', () => {
    expect(resolveAuthRoute({ hasUser: false, role: null, hasProfile: false, segment0: '(app)', segment1: 'index' })).toBe('/(auth)/onboarding')
  })

  it('leaves a signed-out user free to move within the auth group', () => {
    expect(resolveAuthRoute({ hasUser: false, role: null, hasProfile: false, segment0: '(auth)', segment1: 'onboarding' })).toBeNull()
    expect(resolveAuthRoute({ hasUser: false, role: null, hasProfile: false, segment0: '(auth)', segment1: 'sign-in' })).toBeNull()
    expect(resolveAuthRoute({ hasUser: false, role: null, hasProfile: false, segment0: '(auth)', segment1: 'sign-up' })).toBeNull()
  })

  it('routes a signed-out user with unsettled segments to onboarding', () => {
    expect(resolveAuthRoute({ hasUser: false, role: null, hasProfile: false, segment0: undefined, segment1: undefined })).toBe('/(auth)/onboarding')
  })
})

describe('resolveAuthRoute — setup complete', () => {
  it('keeps a hoster in the app group', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'hoster', hasProfile: false, segment0: '(app)', segment1: '(hoster)' })).toBeNull()
  })

  it('sends a complete user out of the auth group into the app', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'hoster', hasProfile: false, segment0: '(auth)', segment1: 'onboarding' })).toBe('/(app)')
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: true, segment0: '(auth)', segment1: 'role-select' })).toBe('/(app)')
  })

  it('sends a complete user with unsettled segments into the app', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: true, segment0: undefined, segment1: undefined })).toBe('/(app)')
  })
})

describe('resolveAuthRoute — authenticated, no role', () => {
  it('lets the marketing page show first on cold start (onboarding stays)', () => {
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: '(auth)', segment1: 'onboarding' })).toBeNull()
  })

  it('does not force a route before segments settle (never skips onboarding)', () => {
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: undefined, segment1: undefined })).toBeNull()
  })

  it('forwards to role-select from any other auth screen', () => {
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: '(auth)', segment1: 'sign-in' })).toBe('/(auth)/role-select')
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: '(auth)', segment1: 'sign-up' })).toBe('/(auth)/role-select')
  })

  it('stays put once on role-select', () => {
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: '(auth)', segment1: 'role-select' })).toBeNull()
  })

  it('forwards to role-select if somehow in the app group', () => {
    expect(resolveAuthRoute({ hasUser: true, role: null, hasProfile: false, segment0: '(app)', segment1: 'index' })).toBe('/(auth)/role-select')
  })
})

describe('resolveAuthRoute — attender, no profile', () => {
  it('lets the marketing page show first (onboarding stays)', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: false, segment0: '(auth)', segment1: 'onboarding' })).toBeNull()
  })

  it('stays put once on create-profile', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: false, segment0: '(auth)', segment1: 'create-profile' })).toBeNull()
  })

  it('forwards to create-profile from role-select once the role is set', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: false, segment0: '(auth)', segment1: 'role-select' })).toBe('/(auth)/create-profile')
  })

  it('forwards to create-profile if somehow in the app group', () => {
    expect(resolveAuthRoute({ hasUser: true, role: 'attender', hasProfile: false, segment0: '(app)', segment1: 'index' })).toBe('/(auth)/create-profile')
  })
})
