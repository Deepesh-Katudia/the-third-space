import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MediaSlotPicker } from '../../components/MediaSlotPicker'
import { MediaAsset } from '../../types/models'

const asset: MediaAsset = { type: 'image', url: 'https://a/i.jpg', thumbURL: 'https://a/i.jpg', width: 10, height: 10 }

describe('MediaSlotPicker', () => {
  it('shows an empty affordance and no remove button when the slot is empty', () => {
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={null} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('slot-picker-empty')).toBeTruthy()
    expect(queryByTestId('slot-picker-remove')).toBeNull()
  })

  it('calls onPick when an empty slot is tapped', () => {
    const onPick = jest.fn()
    const { getByTestId } = render(<MediaSlotPicker media={null} onPick={onPick} onRemove={() => {}} />)
    fireEvent.press(getByTestId('slot-picker'))
    expect(onPick).toHaveBeenCalled()
  })

  it('shows the thumb and a remove button once filled', () => {
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={asset} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('media-thumb-image')).toBeTruthy()
    expect(getByTestId('slot-picker-remove')).toBeTruthy()
    expect(queryByTestId('slot-picker-empty')).toBeNull()
  })

  it('calls onRemove when the remove button is tapped', () => {
    const onRemove = jest.fn()
    const { getByTestId } = render(<MediaSlotPicker media={asset} onPick={() => {}} onRemove={onRemove} />)
    fireEvent.press(getByTestId('slot-picker-remove'))
    expect(onRemove).toHaveBeenCalled()
  })

  it('renders a determinate progress bar while uploading', () => {
    const { getByTestId } = render(
      <MediaSlotPicker media={null} progress={0.4} onPick={() => {}} onRemove={() => {}} />
    )
    expect(getByTestId('slot-picker-progress-fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: '40%' })])
    )
  })

  it('does not let a slot be re-picked or removed mid-upload', () => {
    const onPick = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <MediaSlotPicker media={asset} progress={0.4} onPick={onPick} onRemove={() => {}} />
    )
    fireEvent.press(getByTestId('slot-picker'))
    expect(onPick).not.toHaveBeenCalled()
    expect(queryByTestId('slot-picker-remove')).toBeNull()
  })

  it('shows no progress bar when idle', () => {
    const { queryByTestId } = render(<MediaSlotPicker media={asset} onPick={() => {}} onRemove={() => {}} />)
    expect(queryByTestId('slot-picker-progress')).toBeNull()
  })
})
