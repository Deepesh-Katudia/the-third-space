const mockSend = jest.fn()
jest.mock('expo-server-sdk', () => ({
  Expo: class {
    chunkPushNotifications(msgs: unknown[]) { return [msgs] }
    sendPushNotificationsAsync(chunk: unknown[]) { return mockSend(chunk) }
    static isExpoPushToken() { return true }
  },
}))

import { sendPush, truncateBody } from './sendPush'

beforeEach(() => jest.clearAllMocks())

describe('truncateBody', () => {
  it('leaves short text untouched', () => {
    expect(truncateBody('hello')).toBe('hello')
  })
  it('truncates long text with an ellipsis', () => {
    const out = truncateBody('a'.repeat(200))
    expect(out.length).toBeLessThanOrEqual(140)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('sendPush', () => {
  it('is a no-op for empty input', async () => {
    const dead = await sendPush([])
    expect(mockSend).not.toHaveBeenCalled()
    expect(dead).toEqual([])
  })

  it('returns tokens whose ticket is DeviceNotRegistered', async () => {
    mockSend.mockResolvedValue([
      { status: 'ok' },
      { status: 'error', details: { error: 'DeviceNotRegistered' } },
    ])
    const dead = await sendPush([
      { to: 'tok_ok', title: 'A', body: 'x', data: {} },
      { to: 'tok_dead', title: 'B', body: 'y', data: {} },
    ])
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(dead).toEqual(['tok_dead'])
  })
})
