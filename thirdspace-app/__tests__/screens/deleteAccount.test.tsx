import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import DeleteAccount from '../../app/(app)/delete-account'
import { deleteMyAccount, isPasswordAccount } from '../../services/account'

jest.mock('../../services/account', () => ({
  deleteMyAccount: jest.fn(),
  isPasswordAccount: jest.fn(),
}))

const mockReplace = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, back: jest.fn(), push: jest.fn() }) }))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'me', email: 'me@example.test' }, loading: false }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  ;(isPasswordAccount as jest.Mock).mockReturnValue(true)
  ;(deleteMyAccount as jest.Mock).mockResolvedValue(undefined)
})

const typeConfirmation = (getByPlaceholderText: (t: string) => { props: unknown }, text: string) =>
  fireEvent.changeText(getByPlaceholderText('DELETE') as never, text)

it('spells out what will and will not be removed', async () => {
  // Apple wants deletion to be unambiguous, and so does anybody about to lose their
  // account. The one non-obvious consequence — past events staying on the record for
  // other people — has to be on this screen, not in a support article.
  const { getByText } = render(<DeleteAccount />)
  expect(getByText(/past events you attended stay/i)).toBeTruthy()
})

it('will not delete until the confirmation is typed exactly', async () => {
  const { getByText, getByPlaceholderText } = render(<DeleteAccount />)
  fireEvent.press(getByText('Delete my account'))
  expect(deleteMyAccount).not.toHaveBeenCalled()

  typeConfirmation(getByPlaceholderText, 'delete')
  fireEvent.press(getByText('Delete my account'))
  expect(deleteMyAccount).not.toHaveBeenCalled()
})

it('deletes once the confirmation and password are given', async () => {
  const { getByText, getByPlaceholderText, getByLabelText } = render(<DeleteAccount />)
  typeConfirmation(getByPlaceholderText, 'DELETE')
  fireEvent.changeText(getByLabelText('Current password'), 'hunter2hunter2')
  fireEvent.press(getByText('Delete my account'))
  await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledWith('hunter2hunter2'))
})

it('requires a password only for password accounts', async () => {
  // Apple and Google accounts have none to re-enter; demanding one would make deletion
  // impossible for them.
  ;(isPasswordAccount as jest.Mock).mockReturnValue(false)
  const { getByText, getByPlaceholderText, queryByLabelText } = render(<DeleteAccount />)
  expect(queryByLabelText('Current password')).toBeNull()
  typeConfirmation(getByPlaceholderText, 'DELETE')
  fireEvent.press(getByText('Delete my account'))
  await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledWith(undefined))
})

it('lands on onboarding after a successful deletion', async () => {
  const { getByText, getByPlaceholderText, getByLabelText } = render(<DeleteAccount />)
  typeConfirmation(getByPlaceholderText, 'DELETE')
  fireEvent.changeText(getByLabelText('Current password'), 'hunter2hunter2')
  fireEvent.press(getByText('Delete my account'))
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(auth)/onboarding'))
})

it('explains a wrong password without deleting anything', async () => {
  ;(deleteMyAccount as jest.Mock).mockRejectedValue({ code: 'auth/wrong-password' })
  const { getByText, getByPlaceholderText, getByLabelText, findByText } = render(<DeleteAccount />)
  typeConfirmation(getByPlaceholderText, 'DELETE')
  fireEvent.changeText(getByLabelText('Current password'), 'wrong')
  fireEvent.press(getByText('Delete my account'))
  expect(await findByText('That password is incorrect.')).toBeTruthy()
  expect(mockReplace).not.toHaveBeenCalled()
})

it('keeps the member signed in when the cascade fails', async () => {
  // The account still exists, so navigating away would strand somebody who believes it is
  // gone while their data is still there.
  ;(deleteMyAccount as jest.Mock).mockRejectedValue(new Error('internal'))
  const { getByText, getByPlaceholderText, getByLabelText, findByText } = render(<DeleteAccount />)
  typeConfirmation(getByPlaceholderText, 'DELETE')
  fireEvent.changeText(getByLabelText('Current password'), 'hunter2hunter2')
  fireEvent.press(getByText('Delete my account'))
  expect(await findByText(/couldn't delete your account/i)).toBeTruthy()
  expect(mockReplace).not.toHaveBeenCalled()
})
