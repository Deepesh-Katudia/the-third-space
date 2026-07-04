import { followDocId, mutualConnections } from '../../utils/follows'

describe('followDocId', () => {
  it('joins follower and target with an underscore, in that order', () => {
    expect(followDocId('alice', 'bob')).toBe('alice_bob')
    expect(followDocId('bob', 'alice')).toBe('bob_alice')
  })
})

describe('mutualConnections', () => {
  it('returns only uids present in both lists', () => {
    expect(mutualConnections(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c'])
  })

  it('returns empty for disjoint lists', () => {
    expect(mutualConnections(['a', 'b'], ['c', 'd'])).toEqual([])
  })

  it('returns empty when either list is empty', () => {
    expect(mutualConnections([], ['a'])).toEqual([])
    expect(mutualConnections(['a'], [])).toEqual([])
  })

  it('preserves the order of the following list', () => {
    expect(mutualConnections(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b'])
  })
})
