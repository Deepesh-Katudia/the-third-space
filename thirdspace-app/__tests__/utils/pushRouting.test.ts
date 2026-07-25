import { routeForNotification } from '../../utils/pushRouting'

describe('routeForNotification', () => {
  it('routes a dm to the chat screen', () => {
    expect(routeForNotification({ type: 'dm', convId: 'c1' })).toEqual({
      pathname: '/(app)/chat/[id]', params: { id: 'c1', kind: 'dm' },
    })
  })
  it('routes an announcement to the event screen', () => {
    expect(routeForNotification({ type: 'announcement', eventId: 'e1' })).toEqual({
      pathname: '/(app)/event/[id]', params: { id: 'e1' },
    })
  })
  it('routes a follow to the member screen', () => {
    expect(routeForNotification({ type: 'follow', uid: 'u1' })).toEqual({
      pathname: '/(app)/member/[uid]', params: { uid: 'u1' },
    })
  })
  it('returns null for an unknown type', () => {
    expect(routeForNotification({ type: 'mystery' })).toBeNull()
  })
  it('returns null when the required id is missing', () => {
    expect(routeForNotification({ type: 'dm' })).toBeNull()
  })
})
