import React from 'react'
import { render as rtlRender, waitFor, fireEvent } from '@testing-library/react-native'
import { AccessibilityInfo, Dimensions, StyleSheet } from 'react-native'
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context'
import { CloudPromptWatcher } from '../../components/CloudPromptWatcher'
import { beginFirstRun, closeFirstRun, getSeenPrompts, markCoachingSeen } from '../../services/cloudPromptsSeen'
import type { SeenPrompts } from '../../services/cloudPromptsSeen'

// jest.mock rather than jest.spyOn on the module object: spying on ES module exports
// throws "not declared configurable" under some interop settings, and rewardsSeen.test.ts
// already establishes jest.mock as this codebase's convention.
jest.mock('../../services/cloudPromptsSeen', () => ({
  getSeenPrompts: jest.fn(),
  markCoachingSeen: jest.fn(),
  beginFirstRun: jest.fn(),
  closeFirstRun: jest.fn(),
}))

// Everything the mock factories close over is named with the `mock` prefix, because
// babel-plugin-jest-hoist disallows references to out-of-scope variables during hoisting
// UNLESS the name starts with "mock" (case-insensitive).
let mockPathname = '/'
let mockSeen: SeenPrompts = { coaching: [], firstRunDone: false }

jest.mock('expo-router', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, role: 'attender', loading: false }),
}))

/** A marker written by this very process — i.e. the tour is still under way. */
const thisSession = () => new Date().toISOString()
/** A marker from a launch that has already ended. */
const aPreviousLaunch = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

// expo-router's ExpoRoot wraps the real app in this, so the cloud's useSafeAreaInsets()
// resolves in production; rendering the watcher in isolation has to supply it.
const METRICS: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
}
const SafeArea = ({ children }: { children: React.ReactNode }) => (
  <SafeAreaProvider initialMetrics={METRICS}>{children}</SafeAreaProvider>
)
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: SafeArea })

describe('CloudPromptWatcher', () => {
  beforeEach(() => {
    mockPathname = '/'
    mockSeen = { coaching: [], firstRunDone: false }

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<typeof AccessibilityInfo.addEventListener>)
    ;(getSeenPrompts as jest.Mock).mockReset().mockImplementation(() => Promise.resolve(mockSeen))
    ;(markCoachingSeen as jest.Mock).mockReset().mockResolvedValue(undefined)
    ;(beginFirstRun as jest.Mock).mockReset().mockResolvedValue(undefined)
    ;(closeFirstRun as jest.Mock).mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => jest.restoreAllMocks())

  it('raises the hint for the current route on a first run', async () => {
    const { findByText } = render(<CloudPromptWatcher role="attender" />)
    expect(await findByText('This is the whole point.')).toBeTruthy()
  })

  it('stamps the start of the first run when it raises the first hint', async () => {
    const { findByTestId } = render(<CloudPromptWatcher role="attender" />)
    await findByTestId('cloud-prompt')
    await waitFor(() => expect(beginFirstRun).toHaveBeenCalledWith('u1', expect.any(Date)))
    expect(closeFirstRun).not.toHaveBeenCalled()
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

  it('keeps explaining new screens for the rest of the first session', async () => {
    // The tour is a session, not one screen. A hint already marked seen must not read as
    // the first run being over.
    mockPathname = '/chats'
    mockSeen = { coaching: ['coach-discover'], firstRunStartedAt: thisSession(), firstRunDone: false }

    const { findByText } = render(<CloudPromptWatcher role="attender" />)
    expect(await findByText('The room before the room.')).toBeTruthy()
  })

  it('raises nothing on a later launch, and closes the first run for good', async () => {
    // The feature: popups belong to the first session only.
    mockSeen = { coaching: ['coach-discover'], firstRunStartedAt: aPreviousLaunch(), firstRunDone: false }

    const { queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    await waitFor(() => expect(closeFirstRun).toHaveBeenCalledWith('u1'))

    expect(queryByTestId('cloud-prompt')).toBeNull()
    expect(markCoachingSeen).not.toHaveBeenCalled()
  })

  it('raises nothing for an account that used the app before first runs were tracked', async () => {
    // Upgrade path: a record with history but no marker came from the old build, so this
    // account is not new and must not be handed the tour.
    mockSeen = { coaching: ['coach-discover', 'coach-profile'], firstRunDone: false }

    const { queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    await waitFor(() => expect(closeFirstRun).toHaveBeenCalledWith('u1'))
    expect(queryByTestId('cloud-prompt')).toBeNull()
  })

  it('does not rewrite a first run that is already closed', async () => {
    // Every route change asks the same question. Re-closing a closed first run would be
    // an AsyncStorage write per navigation, forever.
    mockSeen = { coaching: [], firstRunDone: true }

    const { queryByTestId } = render(<CloudPromptWatcher role="attender" />)
    await waitFor(() => expect(getSeenPrompts).toHaveBeenCalled())

    expect(closeFirstRun).not.toHaveBeenCalled()
    expect(queryByTestId('cloud-prompt')).toBeNull()
  })

  it('points the cloud at the tab the raised prompt is about', async () => {
    // End to end: pathname -> catalogue entry -> tabAnchor -> a real x position. The
    // My Events hint has to land over the My Events tab, which is the whole ask.
    mockPathname = '/my-events'
    const { width } = Dimensions.get('window')

    const { findByTestId, getAllByTestId } = render(<CloudPromptWatcher role="attender" />)
    const layer = StyleSheet.flatten((await findByTestId('cloud-prompt-anchor')).props.style) as Record<string, number>
    const dot = StyleSheet.flatten(getAllByTestId('cloud-prompt-tail-dot')[0].props.style) as Record<string, number>

    // Tab index 1 of the attender bar's 4.
    expect(layer.left + dot.left + dot.width / 2).toBeCloseTo((1.5 / 4) * width)
  })

  it('divides the hoster bar into three, not four', async () => {
    mockPathname = '/venue'
    const { width } = Dimensions.get('window')

    const { findByTestId, getAllByTestId } = render(<CloudPromptWatcher role="hoster" />)
    const layer = StyleSheet.flatten((await findByTestId('cloud-prompt-anchor')).props.style) as Record<string, number>
    const dot = StyleSheet.flatten(getAllByTestId('cloud-prompt-tail-dot')[0].props.style) as Record<string, number>

    expect(layer.left + dot.left + dot.width / 2).toBeCloseTo((2.5 / 3) * width)
  })
})
