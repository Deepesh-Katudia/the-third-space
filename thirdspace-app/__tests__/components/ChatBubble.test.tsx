import React from 'react'
import { render } from '@testing-library/react-native'
import { ChatBubble } from '../../components/ChatBubble'
import { MediaAsset } from '../../types/models'

const media: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }
const base = { id: 'm1', author: 'Mara', text: '', time: '8:42 PM' }

describe('ChatBubble with media', () => {
  it('renders the attachment inside the bubble', () => {
    const { getByTestId } = render(<ChatBubble message={{ ...base, media }} isSelf={false} />)
    expect(getByTestId('media-thumb-image')).toBeTruthy()
  })

  it('renders the caption below the attachment when there is one', () => {
    const { getByText, getByTestId } = render(
      <ChatBubble message={{ ...base, text: 'found the good table', media }} isSelf={false} />
    )
    expect(getByTestId('media-thumb-image')).toBeTruthy()
    expect(getByText('found the good table')).toBeTruthy()
  })

  it('renders no caption text node for an attachment-only message', () => {
    const { queryByText } = render(<ChatBubble message={{ ...base, media }} isSelf />)
    expect(queryByText('PHOTO')).toBeNull()
  })

  it('shows a progress bar while the attachment is uploading', () => {
    const { getByTestId } = render(
      <ChatBubble message={{ ...base, media }} isSelf uploadProgress={0.25} />
    )
    expect(getByTestId('bubble-upload-fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '25%' })])
    )
  })

  it('shows no progress bar once the upload is done', () => {
    const { queryByTestId } = render(<ChatBubble message={{ ...base, media }} isSelf />)
    expect(queryByTestId('bubble-upload-fill')).toBeNull()
  })

  it('still renders a plain text message unchanged', () => {
    const { getByText, queryByTestId } = render(
      <ChatBubble message={{ ...base, text: 'hello' }} isSelf={false} />
    )
    expect(getByText('hello')).toBeTruthy()
    expect(queryByTestId('media-thumb')).toBeNull()
  })
})
