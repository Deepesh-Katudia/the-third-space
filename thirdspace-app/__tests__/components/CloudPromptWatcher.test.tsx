import React from 'react'
import { render, waitFor, fireEvent } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { CloudPromptWatcher } from '../../components/CloudPromptWatcher'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../../services/cloudPromptsSeen'
import { getMyRegisteredEvents } from '../../services/events'
import type { SeenPrompts } from '../../services/cloudPromptsSeen'

// jest.mock rather than jest.spyOn on the module object: spying on ES module exports
// throws "not declared configurable" under some interop settings, and rewardsSeen.test.ts
// already establishes jest.mock as this codebase's convention.
jest.mock('../../services/cloudPromptsSeen', () => ({
  getSeenPrompts: jest.fn(),
  markCoachingSeen: jest.fn(),
  markNudgeFired: jest.fn(),
}))

// Everything the mock factories close over is named with the `mock` prefix, because
// babel-plugin-jest-hoist disallows references to out-of-scope variables during hoisting
// UNLESS the name starts with "mock" (case-insensitive).
let mockPathname = '/'
let mockSeen: SeenPrompts = { coaching: [], nudges: {} }

// Each hook's return is settable per test so the LOADING window is reachable — that
// window is where the stale-snapshot bug lives, and a fixture that is always settled
// cannot see it.
let mockProfile: { photoURL: string | null } | null = { photoURL: null }
let mockProfileLoading = false
let mockThreads: { id: string; kind: string; unread: number }[] = []
let mockThreadsLoading = false
let mockAttended: unknown[] = []
let mockAttendedLoading = false
let mockConnectionUids: string[] = []
let mockConnectionsLoading = false

// Which uid each hook was handed, so "a hoster opens no attender subscriptions" is
// checked against the actual argument rather than assumed.
const mockHookUids: Record<string, (string | undefined)[]> = {
  profile: [],
  chatList: [],
  attendance: [],
  connections: [],
}

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1' }, role: 'attender', loading: false }) }))
jest.mock('../../hooks/useProfile', () => ({
  useProfile: (uid?: string) => {
    mockHookUids.profile.push(uid)
    return { profile: mockProfile, loading: mockProfileLoading }
  },
}))
jest.mock('../../hooks/useChatList', () => ({
  useChatList: (uid?: string) => {
    mockHookUids.chatList.push(uid)
    return { threads: mockThreads, loading: mockThreadsLoading }
  },
}))
jest.mock('../../hooks/useAttendanceStats', () => ({
  useAttendanceStats: (uid?: string) => {
    mockHookUids.attendance.push(uid)
    return { attendedEvents: mockAttended, loading: mockAttendedLoading }
  },
}))
jest.mock('../../hooks/useConnections', () => ({
  useConnections: (uid?: string) => {
    mockHookUids.connections.push(uid)
    return { connectionUids: mockConnectionUids, loading: mockConnectionsLoading }
  },
}))
jest.mock('../../services/events', () => ({ getMyRegisteredEvents: jest.fn() }))

describe('CloudPromptWatcher', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockSeen = { coaching: [], nudges: {} }
    mockProfile = { photoURL: null }
    mockProfileLoading = false
    mockThreads = []
    mockThreadsLoading = false
    mockAttended = []
    mockAttendedLoading = false
    mockConnectionUids = []
    mockConnectionsLoading = false
    for (const key of Object.keys(mockHookUids)) mockHookUids[key].length = 0

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    ;(getMyRegisteredEvents as jest.Mock).mockReset().mockResolvedValue([])
    ;(getSeenPrompts as jest.Mock).mockReset().mockImplementation(() => Promise.resolve(mockSeen))
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

  it('holds a nudge back while the account state is still loading', async () => {
    // Every subscription starts empty and settles later, and AsyncStorage answers far
    // sooner than Firestore. Judging a nudge on that first snapshot tells a member with
    // a photo, forty events and twenty connections that they have none of them — and
    // burns the 3-day cooldown doing it, which silences the real nudge too.
    mockPathname = '/profile'
    mockSeen = { coaching: ['coach-profile'], nudges: {} } // coaching done, so a nudge is next
    mockProfileLoading = true

    const { queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    await waitFor(() => expect(getMyRegisteredEvents).toHaveBeenCalled())

    expect(queryByTestId('cloud-prompt')).toBeNull()
    expect(markNudgeFired).not.toHaveBeenCalled()
  })

  it('raises that same nudge once the account state has settled', async () => {
    // The paired half of the test above: proves the gate delays a nudge rather than
    // silencing it, so "hold back while loading" cannot be satisfied by never firing.
    mockPathname = '/profile'
    mockSeen = { coaching: ['coach-profile'], nudges: {} }
    mockProfile = { photoURL: null }

    const { findByText } = render(<CloudPromptWatcher role="attender" />)
    expect(await findByText('Put a face to the name.')).toBeTruthy()
    await waitFor(() => expect(markNudgeFired).toHaveBeenCalledWith('u1', 'no-photo', expect.any(Date)))
  })

  it('judges the nudge on settled state rather than the empty first snapshot', async () => {
    // The regression proper: a member who HAS a photo must never be told to add one.
    mockPathname = '/profile'
    mockSeen = { coaching: ['coach-profile'], nudges: {} }
    mockProfile = { photoURL: 'https://example.test/a.jpg' }

    const { queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    await waitFor(() => expect(getSeenPrompts).toHaveBeenCalled())

    expect(queryByTestId('cloud-prompt')).toBeNull()
    expect(markNudgeFired).not.toHaveBeenCalled()
  })

  it('opens none of the attender subscriptions for a hoster', async () => {
    // Every hoster entry is coaching with no condition, so none of this state is read
    // for them. Four live subscriptions and a fetch that nothing consults is the same
    // waste that keeps RewardWatcher off the hoster layout entirely.
    const { findByTestId } = render(<CloudPromptWatcher role="hoster" />)
    await findByTestId('cloud-prompt')

    expect(mockHookUids.profile.every((uid) => uid === undefined)).toBe(true)
    expect(mockHookUids.chatList.every((uid) => uid === undefined)).toBe(true)
    expect(mockHookUids.attendance.every((uid) => uid === undefined)).toBe(true)
    expect(mockHookUids.connections.every((uid) => uid === undefined)).toBe(true)
    expect(getMyRegisteredEvents).not.toHaveBeenCalled()
  })

  it('still opens them for an attender', async () => {
    // Guards the check above from passing by simply never subscribing at all.
    const { findByTestId } = render(<CloudPromptWatcher role="attender" />)
    await findByTestId('cloud-prompt')

    expect(mockHookUids.profile).toContain('u1')
    expect(mockHookUids.connections).toContain('u1')
    expect(getMyRegisteredEvents).toHaveBeenCalledWith('u1')
  })
})
