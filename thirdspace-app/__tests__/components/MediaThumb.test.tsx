import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaThumb, formatDuration } from '../../components/MediaThumb'
import { MediaAsset } from '../../types/models'

const image: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 100, height: 100 }
const video: MediaAsset = { type: 'video', url: 'https://a/v.mp4', thumbURL: 'https://a/p.jpg', width: 100, height: 100, durationMs: 74_000 }
const posterless: MediaAsset = { ...video, thumbURL: '' }

describe('formatDuration', () => {
  it('formats as m:ss with a zero-padded seconds field', () => {
    expect(formatDuration(74_000)).toBe('1:14')
    expect(formatDuration(9_000)).toBe('0:09')
    expect(formatDuration(0)).toBe('0:00')
  })
})

describe('MediaThumb', () => {
  it('renders the poster and no play badge for an image', () => {
    const { getByTestId, queryByTestId } = render(<MediaThumb media={image} />)
    expect(getByTestId('media-thumb-image').props.source).toEqual({ uri: 'https://a/i.jpg' })
    expect(queryByTestId('media-thumb-play')).toBeNull()
  })

  it('renders the poster plus a play badge and duration for a video', () => {
    const { getByTestId } = render(<MediaThumb media={video} />)
    expect(getByTestId('media-thumb-image').props.source).toEqual({ uri: 'https://a/p.jpg' })
    expect(getByTestId('media-thumb-play')).toBeTruthy()
    expect(getByTestId('media-thumb-duration').props.children).toBe('1:14')
  })

  it('falls back to a flat tile when poster generation failed, and still shows it is a video', () => {
    const { getByTestId, queryByTestId } = render(<MediaThumb media={posterless} />)
    expect(queryByTestId('media-thumb-image')).toBeNull()
    expect(getByTestId('media-thumb-fallback')).toBeTruthy()
    expect(getByTestId('media-thumb-play')).toBeTruthy()
  })

  it('omits the duration chip when the video has no recorded duration', () => {
    const { queryByTestId } = render(<MediaThumb media={{ ...video, durationMs: undefined }} />)
    expect(queryByTestId('media-thumb-duration')).toBeNull()
  })

  it('calls onPress when tapped', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(<MediaThumb media={image} onPress={onPress} />)
    fireEvent.press(getByTestId('media-thumb'))
    expect(onPress).toHaveBeenCalled()
  })
})
