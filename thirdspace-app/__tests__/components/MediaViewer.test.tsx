import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaViewer } from '../../components/MediaViewer'
import { MediaAsset } from '../../types/models'

jest.mock('expo-video', () => {
  const React2 = require('react')
  const { View } = require('react-native')
  return {
    useVideoPlayer: jest.fn(() => ({ play: jest.fn(), pause: jest.fn() })),
    VideoView: (props: Record<string, unknown>) => React2.createElement(View, { testID: 'video-view', ...props }),
  }
})

const image: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }
const video: MediaAsset = { type: 'video', url: 'https://a/v.mp4', thumbURL: 'https://a/p.jpg', width: 10, height: 10 }

describe('MediaViewer', () => {
  it('renders nothing when there is no media', () => {
    const { queryByTestId } = render(<MediaViewer media={null} onClose={() => {}} />)
    expect(queryByTestId('media-viewer')).toBeNull()
  })

  it('renders the full asset, not the poster, for an image', () => {
    const { getByTestId } = render(<MediaViewer media={image} onClose={() => {}} />)
    expect(getByTestId('media-viewer-image').props.source).toEqual({ uri: 'https://a/i.jpg' })
  })

  it('renders a video view for a clip', () => {
    const { getByTestId, queryByTestId } = render(<MediaViewer media={video} onClose={() => {}} />)
    expect(getByTestId('video-view')).toBeTruthy()
    expect(queryByTestId('media-viewer-image')).toBeNull()
  })

  it('closes when the backdrop is pressed', () => {
    const onClose = jest.fn()
    const { getByTestId } = render(<MediaViewer media={image} onClose={onClose} />)
    fireEvent.press(getByTestId('media-viewer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
