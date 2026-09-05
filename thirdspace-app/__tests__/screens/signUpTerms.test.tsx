import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import * as WebBrowser from 'expo-web-browser'
import SignUp from '../../app/(auth)/sign-up'
import { stampTermsAcceptance } from '../../services/account'
import { TERMS_URL, PRIVACY_POLICY_URL } from '../../constants/legal'

// Only the terms gate is under test here, so everything that would reach Firebase or a
// browser is mocked. `mock`-prefixed names because babel-plugin-jest-hoist rejects any
// other out-of-scope reference inside a factory.
const mockCreateUser = jest.fn()
const mockCallable = jest.fn()

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  updateProfile: jest.fn().mockResolvedValue(undefined),
  signInWithCredential: jest.fn(),
  OAuthProvider: class {
    credential() {
      return {}
    }
  },
}))
jest.mock('firebase/functions', () => ({ httpsCallable: () => mockCallable }))
jest.mock('../../firebase/config', () => ({ auth: { currentUser: null }, functions: {}, db: {} }))
jest.mock('../../services/account', () => ({ stampTermsAcceptance: jest.fn() }))
jest.mock('../../hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({ promptGoogleSignIn: jest.fn(), isGoogleLoading: false }),
}))
// The module is also called at import time for the OAuth redirect, so the mock has to
// carry maybeCompleteAuthSession as well as the one function under test.
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(), maybeCompleteAuthSession: jest.fn() }))
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn() }) }))

const fill = (r: ReturnType<typeof render>) => {
  fireEvent.changeText(r.getByPlaceholderText('Samantha Aleman'), 'Samantha')
  fireEvent.changeText(r.getByPlaceholderText('you@example.com'), 'sam@example.com')
  fireEvent.changeText(r.getByPlaceholderText('2125551234'), '2125551234')
  fireEvent.changeText(r.getByPlaceholderText('8+ characters, mixed types'), 'Abcd1234!')
  fireEvent.changeText(r.getByPlaceholderText('Re-enter password'), 'Abcd1234!')
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCreateUser.mockResolvedValue({ user: { uid: 'new-uid', email: 'sam@example.com' } })
  mockCallable.mockResolvedValue({ data: { ok: true } })
  ;(stampTermsAcceptance as jest.Mock).mockResolvedValue(undefined)
})

it('will not create an account while the terms box is unchecked', async () => {
  // The button is inert rather than erroring: "not yet" before a tap beats an error after.
  const r = render(<SignUp />)
  fill(r)
  fireEvent.press(r.getByText('Create account'))
  await waitFor(() => expect(mockCreateUser).not.toHaveBeenCalled())
})

it('creates the account and stamps the acceptance once the box is checked', async () => {
  const r = render(<SignUp />)
  fill(r)
  fireEvent.press(r.getByLabelText('Accept the Terms of use and Privacy policy'))
  fireEvent.press(r.getByText('Create account'))
  await waitFor(() => expect(mockCreateUser).toHaveBeenCalled())
  await waitFor(() => expect(stampTermsAcceptance).toHaveBeenCalledWith('new-uid'))
})

it('opens the terms and the policy from inside the label', async () => {
  // Reading them must not cost the form: openBrowserAsync returns to this screen.
  const r = render(<SignUp />)
  fireEvent.press(r.getByText('Terms of use'))
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(TERMS_URL)
  fireEvent.press(r.getByText('Privacy policy'))
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(PRIVACY_POLICY_URL)
})

it('keeps what was typed after the terms have been read', () => {
  const r = render(<SignUp />)
  fill(r)
  fireEvent.press(r.getByText('Terms of use'))
  expect(r.getByPlaceholderText('you@example.com').props.value).toBe('sam@example.com')
})
