import AsyncStorage from '@react-native-async-storage/async-storage'
import { beginFirstRun, closeFirstRun, getSeenPrompts, markCoachingSeen } from '../../services/cloudPromptsSeen'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const getItem = AsyncStorage.getItem as jest.Mock
const setItem = AsyncStorage.setItem as jest.Mock

/** The record actually handed to AsyncStorage, parsed — key order is not the contract. */
const written = () => JSON.parse(setItem.mock.calls[setItem.mock.calls.length - 1][1])

describe('cloudPromptsSeen', () => {
  beforeEach(() => {
    getItem.mockReset()
    setItem.mockReset()
    setItem.mockResolvedValue(undefined)
  })

  it('returns an empty record for an account that has seen nothing', async () => {
    getItem.mockResolvedValue(null)
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], firstRunDone: false })
  })

  it('keys storage per uid, so two accounts on one phone do not collide', async () => {
    getItem.mockResolvedValue(null)
    await markCoachingSeen('u1', 'coach-discover')
    expect(setItem.mock.calls[0][0]).toBe('cloudPrompts:u1')
    expect(written()).toEqual({ coaching: ['coach-discover'], firstRunDone: false })
  })

  it('unions coaching ids rather than appending, so repeat calls stay idempotent', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['coach-discover'], firstRunDone: false }))
    await markCoachingSeen('u1', 'coach-discover')
    expect(written()).toEqual({ coaching: ['coach-discover'], firstRunDone: false })
  })

  it('stamps the start of the first run', async () => {
    getItem.mockResolvedValue(null)
    await beginFirstRun('u1', new Date('2026-09-03T12:00:00.000Z'))
    expect(written()).toEqual({ coaching: [], firstRunStartedAt: '2026-09-03T12:00:00.000Z', firstRunDone: false })
  })

  it('never restamps a first run that is already under way', async () => {
    // Restamping on every screen of the tour would roll the window forward and make the
    // first session last as long as the user kept navigating.
    getItem.mockResolvedValue(
      JSON.stringify({ coaching: [], firstRunStartedAt: '2026-09-03T12:00:00.000Z', firstRunDone: false }),
    )
    await beginFirstRun('u1', new Date('2026-09-03T12:05:00.000Z'))
    expect(written().firstRunStartedAt).toBe('2026-09-03T12:00:00.000Z')
  })

  it('closes the first run without forgetting which hints were shown', async () => {
    getItem.mockResolvedValue(
      JSON.stringify({ coaching: ['coach-discover'], firstRunStartedAt: '2026-09-03T12:00:00.000Z', firstRunDone: false }),
    )
    await closeFirstRun('u1')
    expect(written()).toEqual({
      coaching: ['coach-discover'],
      firstRunStartedAt: '2026-09-03T12:00:00.000Z',
      firstRunDone: true,
    })
  })

  it('reads a record written by the old build, keeping its coaching history', async () => {
    // The upgrade path: `nudges` is gone from the shape, but the coaching list is what
    // marks this account as one that has already used the app, so it must survive.
    getItem.mockResolvedValue(
      JSON.stringify({ coaching: ['coach-discover'], nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' } }),
    )
    expect(await getSeenPrompts('u1')).toEqual({ coaching: ['coach-discover'], firstRunDone: false })
  })

  it('degrades unreadable JSON to empty rather than throwing', async () => {
    // An unreadable record must never block a screen.
    getItem.mockResolvedValue('{ not json')
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], firstRunDone: false })
  })

  it('degrades a record of the wrong shape to empty', async () => {
    getItem.mockResolvedValue(JSON.stringify(['coach-discover']))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], firstRunDone: false })
  })

  it('drops non-string members rather than trusting the record wholesale', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['ok', 7, null], firstRunStartedAt: 5, firstRunDone: 'yes' }))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: ['ok'], firstRunDone: false })
  })

  it('swallows a failed write', async () => {
    // A throw here would surface as a crash immediately after a friendly moment.
    getItem.mockResolvedValue(null)
    setItem.mockRejectedValue(new Error('disk full'))
    await expect(closeFirstRun('u1')).resolves.toBeUndefined()
  })

  it('reads through a failed read as empty', async () => {
    getItem.mockRejectedValue(new Error('unavailable'))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], firstRunDone: false })
  })
})
