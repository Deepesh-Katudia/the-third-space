import React from 'react'
import { Text } from 'react-native'
import { render, waitFor } from '@testing-library/react-native'
import { syncBlocks, useBlocks } from '../../hooks/useBlocks'
import { subscribeBlocks } from '../../services/blocks'

jest.mock('../../services/blocks', () => ({ subscribeBlocks: jest.fn() }))

let mockEmit: (uids: string[]) => void = () => {}
let mockFail: () => void = () => {}
const mockUnsub = jest.fn()

function Probe() {
  const { blocked, loading } = useBlocks()
  return <Text>{loading ? 'loading' : [...blocked].join(',') || 'none'}</Text>
}

beforeEach(() => {
  ;(subscribeBlocks as jest.Mock).mockReset().mockImplementation((_uid, onData, onError) => {
    mockEmit = onData
    mockFail = onError
    return mockUnsub
  })
  // Reset the module-level store between tests — it outlives a render by design. This
  // detaches the PREVIOUS test's subscription, which calls mockUnsub, so the counters are
  // cleared after it rather than before: otherwise every test starts one unsub in debt.
  syncBlocks(undefined)
  mockUnsub.mockClear()
  ;(subscribeBlocks as jest.Mock).mockClear()
})

it('starts loading and publishes the set once the snapshot arrives', async () => {
  const { getByText } = render(<Probe />)
  syncBlocks('me')
  expect(getByText('loading')).toBeTruthy()
  mockEmit(['bad', 'worse'])
  await waitFor(() => expect(getByText('bad,worse')).toBeTruthy())
})

it('clears the set and unsubscribes on sign-out', async () => {
  syncBlocks('me')
  mockEmit(['bad'])
  const { getByText } = render(<Probe />)
  syncBlocks(undefined)
  await waitFor(() => expect(getByText('none')).toBeTruthy())
  expect(mockUnsub).toHaveBeenCalled()
})

it('does not resubscribe for the same uid', () => {
  // The attach point is an effect in the app layout, which re-runs on every render of a
  // stable uid. Resubscribing there would open a Firestore listener per render.
  syncBlocks('me')
  syncBlocks('me')
  expect(subscribeBlocks).toHaveBeenCalledTimes(1)
})

it('swaps subscriptions when the account changes', () => {
  syncBlocks('me')
  syncBlocks('other')
  expect(mockUnsub).toHaveBeenCalledTimes(1)
  expect(subscribeBlocks).toHaveBeenCalledTimes(2)
})

it('fails OPEN on a read error rather than hiding the app behind a spinner', async () => {
  // The write gates in firestore.rules are the enforcement; this set is presentation.
  // A permanent loading state would take out the chat list, Discover and the guest list.
  syncBlocks('me')
  const { getByText } = render(<Probe />)
  mockFail()
  await waitFor(() => expect(getByText('none')).toBeTruthy())
})
