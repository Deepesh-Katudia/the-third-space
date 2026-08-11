import { mediaLabel } from '../../shared/mediaLabel'

describe('mediaLabel', () => {
  it('labels a photo and a clip in uppercase, matching every type role in the app', () => {
    expect(mediaLabel({ type: 'image' })).toBe('PHOTO')
    expect(mediaLabel({ type: 'video' })).toBe('VIDEO')
  })

  it('returns an empty string when there is no media', () => {
    expect(mediaLabel(undefined)).toBe('')
    expect(mediaLabel(null)).toBe('')
    expect(mediaLabel({})).toBe('')
  })

  it('returns an empty string for an unrecognised type rather than guessing', () => {
    expect(mediaLabel({ type: 'audio' })).toBe('')
  })
})
