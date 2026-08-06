import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSeenPrompts, markCoachingSeen, markNudgeFired } from '../../services/cloudPromptsSeen'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const getItem = AsyncStorage.getItem as jest.Mock
const setItem = AsyncStorage.setItem as jest.Mock

describe('cloudPromptsSeen', () => {
  beforeEach(() => {
    getItem.mockReset()
    setItem.mockReset()
    setItem.mockResolvedValue(undefined)
  })

  it('returns an empty record for an account that has seen nothing', async () => {
    getItem.mockResolvedValue(null)
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('keys storage per uid, so two accounts on one phone do not collide', async () => {
    getItem.mockResolvedValue(null)
    await markCoachingSeen('u1', 'coach-discover')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: ['coach-discover'], nudges: {} }),
    )
  })

  it('unions coaching ids rather than appending, so repeat calls stay idempotent', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['coach-discover'], nudges: {} }))
    await markCoachingSeen('u1', 'coach-discover')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: ['coach-discover'], nudges: {} }),
    )
  })

  it('overwrites a nudge timestamp rather than accumulating them', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: [], nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' } }))
    await markNudgeFired('u1', 'no-photo', new Date('2026-08-06T12:00:00.000Z'))
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({ coaching: [], nudges: { 'no-photo': '2026-08-06T12:00:00.000Z' } }),
    )
  })

  it('keeps the two halves independent', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['coach-chats'], nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' } }))
    await markCoachingSeen('u1', 'coach-profile')
    expect(setItem).toHaveBeenCalledWith(
      'cloudPrompts:u1',
      JSON.stringify({
        coaching: ['coach-chats', 'coach-profile'],
        nudges: { 'no-photo': '2026-08-01T00:00:00.000Z' },
      }),
    )
  })

  it('degrades unreadable JSON to empty rather than throwing', async () => {
    // An unreadable record must never block a screen. Worst case is one replayed cloud.
    getItem.mockResolvedValue('{ not json')
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('degrades a record of the wrong shape to empty', async () => {
    getItem.mockResolvedValue(JSON.stringify(['coach-discover']))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })

  it('drops non-string members rather than trusting the record wholesale', async () => {
    getItem.mockResolvedValue(JSON.stringify({ coaching: ['ok', 7, null], nudges: { a: 3, b: '2026-08-01T00:00:00.000Z' } }))
    expect(await getSeenPrompts('u1')).toEqual({
      coaching: ['ok'],
      nudges: { b: '2026-08-01T00:00:00.000Z' },
    })
  })

  it('swallows a failed write', async () => {
    // A throw here would surface as a crash immediately after a friendly moment.
    getItem.mockResolvedValue(null)
    setItem.mockRejectedValue(new Error('disk full'))
    await expect(markNudgeFired('u1', 'no-photo', new Date())).resolves.toBeUndefined()
  })

  it('reads through a failed read as empty', async () => {
    getItem.mockRejectedValue(new Error('unavailable'))
    expect(await getSeenPrompts('u1')).toEqual({ coaching: [], nudges: {} })
  })
})
