import AsyncStorage from '@react-native-async-storage/async-storage'
import { getSeenRewards, markRewardsSeen } from '../../services/rewardsSeen'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const getItem = AsyncStorage.getItem as jest.Mock
const setItem = AsyncStorage.setItem as jest.Mock

describe('rewardsSeen', () => {
  beforeEach(() => {
    getItem.mockReset()
    setItem.mockReset()
    setItem.mockResolvedValue(undefined)
  })

  it('returns nothing for an account that has never earned anything', async () => {
    getItem.mockResolvedValue(null)
    expect(await getSeenRewards('u1')).toEqual([])
  })

  it('keys storage per uid, so two accounts on one phone do not collide', async () => {
    getItem.mockResolvedValue(null)
    await markRewardsSeen('u1', ['first-event'])
    expect(setItem).toHaveBeenCalledWith('rewardsSeen:u1', JSON.stringify(['first-event']))
  })

  it('unions rather than appends, so repeat calls stay idempotent', async () => {
    getItem.mockResolvedValue(JSON.stringify(['first-event']))
    await markRewardsSeen('u1', ['first-event', 'new-friend'])
    expect(setItem).toHaveBeenCalledWith('rewardsSeen:u1', JSON.stringify(['first-event', 'new-friend']))
  })

  it('writes nothing when there is nothing to mark', async () => {
    await markRewardsSeen('u1', [])
    expect(setItem).not.toHaveBeenCalled()
  })

  it('treats unreadable storage as empty rather than throwing', async () => {
    // A corrupt record must not make the rewards screen unrenderable. Replaying one
    // ceremony is the acceptable failure here; a crash is not.
    getItem.mockResolvedValue('{not json')
    expect(await getSeenRewards('u1')).toEqual([])
  })

  it('ignores non-array and non-string junk in the record', async () => {
    getItem.mockResolvedValue(JSON.stringify({ nope: true }))
    expect(await getSeenRewards('u1')).toEqual([])
    getItem.mockResolvedValue(JSON.stringify(['first-event', 42, null]))
    expect(await getSeenRewards('u1')).toEqual(['first-event'])
  })

  it('swallows a failed write, since it happens right after a celebration', async () => {
    getItem.mockResolvedValue(null)
    setItem.mockRejectedValue(new Error('disk full'))
    await expect(markRewardsSeen('u1', ['first-event'])).resolves.toBeUndefined()
  })
})
