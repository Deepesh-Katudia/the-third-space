import React from 'react'
import { render, waitFor, fireEvent, act } from '@testing-library/react-native'
import BlockedUsers from '../../app/(app)/blocked-users'
import { subscribeBlockedUsers, unblockUser } from '../../services/blocks'

jest.mock('../../services/blocks', () => ({
  subscribeBlockedUsers: jest.fn(),
  unblockUser: jest.fn(),
}))
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' }, loading: false }) }))

// Each row resolves its own profile, so one failed read leaves a neutral placeholder
// instead of sinking the list — the ConnectionRow pattern.
let mockProfiles: Record<string, { displayName: string; photoURL: string | null } | null>
jest.mock('../../hooks/useProfile', () => ({
  useProfile: (uid?: string) => ({ profile: uid ? mockProfiles[uid] ?? null : null, loading: false, hasError: false }),
}))

let mockEmit: (blocked: { uid: string; createdAt: null }[]) => void = () => {}

beforeEach(() => {
  jest.clearAllMocks()
  mockProfiles = { bad: { displayName: 'Blocked Person', photoURL: null }, worse: { displayName: 'Other Person', photoURL: null } }
  ;(subscribeBlockedUsers as jest.Mock).mockImplementation((_uid, onData) => {
    mockEmit = onData
    return () => {}
  })
  ;(unblockUser as jest.Mock).mockResolvedValue(undefined)
})

it('lists every blocked member by name', async () => {
  const { findByText } = render(<BlockedUsers />)
  act(() => mockEmit([{ uid: 'bad', createdAt: null }, { uid: 'worse', createdAt: null }]))
  expect(await findByText('Blocked Person')).toBeTruthy()
  expect(await findByText('Other Person')).toBeTruthy()
})

it('unblocks the member whose button was pressed', async () => {
  // Apple expects blocking to be reversible, which is the entire reason this screen
  // exists — so the undo path is the one behaviour worth pinning.
  const { findAllByText } = render(<BlockedUsers />)
  act(() => mockEmit([{ uid: 'bad', createdAt: null }, { uid: 'worse', createdAt: null }]))
  const buttons = await findAllByText('Unblock')
  fireEvent.press(buttons[1])
  await waitFor(() => expect(unblockUser).toHaveBeenCalledWith('me', 'worse'))
})

it('renders an empty state when nobody is blocked', async () => {
  const { findByText } = render(<BlockedUsers />)
  act(() => mockEmit([]))
  expect(await findByText('No one is blocked')).toBeTruthy()
})

it('falls back to a neutral name when a blocked profile cannot be read', async () => {
  // A blocked member may have deleted their account. The row must still render, because
  // it is the only way to undo the block.
  mockProfiles = {}
  const { findByText } = render(<BlockedUsers />)
  act(() => mockEmit([{ uid: 'bad', createdAt: null }]))
  expect(await findByText('Member')).toBeTruthy()
})
