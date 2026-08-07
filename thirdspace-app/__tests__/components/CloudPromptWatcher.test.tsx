import React from 'react'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { CloudPromptWatcher } from '../../components/CloudPromptWatcher'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../../services/cloudPromptsSeen'

// jest.mock rather than jest.spyOn on the module object: spying on ES module exports
// throws "not declared configurable" under some interop settings, and rewardsSeen.test.ts
// already establishes jest.mock as this codebase's convention.
jest.mock('../../services/cloudPromptsSeen', () => ({
  getSeenPrompts: jest.fn(),
  markCoachingSeen: jest.fn(),
  markNudgeFired: jest.fn(),
}))

// Named with the `mock` prefix so babel-plugin-jest-hoist permits the jest.mock()
// factory below to close over it — it disallows references to out-of-scope variables
// during hoisting UNLESS the name starts with "mock" (case-insensitive).
let mockPathname = '/'
jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1' }, role: 'attender', loading: false }) }))
jest.mock('../../hooks/useProfile', () => ({ useProfile: () => ({ profile: { photoURL: null }, loading: false }) }))
jest.mock('../../hooks/useChatList', () => ({ useChatList: () => ({ threads: [], loading: false }) }))
jest.mock('../../hooks/useAttendanceStats', () => ({ useAttendanceStats: () => ({ attendedEvents: [], loading: false }) }))
jest.mock('../../hooks/useConnections', () => ({ useConnections: () => ({ connectionUids: [], loading: false }) }))
jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn().mockResolvedValue([]) }))

describe('CloudPromptWatcher', () => {
  beforeEach(() => {
    mockPathname = '/'
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    ;(getSeenPrompts as jest.Mock).mockReset().mockResolvedValue({ coaching: [], nudges: {} })
    ;(markCoachingSeen as jest.Mock).mockReset().mockResolvedValue(undefined)
    ;(markNudgeFired as jest.Mock).mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it('raises the coaching hint for the current route', async () => {
    const { findByText } = render(<CloudPromptWatcher role="attender" />)
    expect(await findByText('This is the whole point.')).toBeTruthy()
  })

  it('marks the hint seen when it is QUEUED, not when it is dismissed', async () => {
    // A force-quit mid-animation must not mean the same cloud every launch — the same
    // lesson RewardWatcher already encodes.
    const { findByTestId } = render(<CloudPromptWatcher role="attender" />)
    await findByTestId('cloud-prompt')
    await waitFor(() => expect(markCoachingSeen).toHaveBeenCalledWith('u1', 'coach-discover'))
  })

  it('closes on dismiss and does not immediately re-raise', async () => {
    const { findByTestId, queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    fireEvent.press(await findByTestId('cloud-prompt-scrim'))
    await waitFor(() => expect(queryByTestId('cloud-prompt')).toBeNull())
  })

  it('shows the hoster hint on the same "/" pathname when mounted as a hoster', async () => {
    const { findByText } = render(<CloudPromptWatcher role="hoster" />)
    expect(await findByText('Your nights, at a glance.')).toBeTruthy()
  })
})
