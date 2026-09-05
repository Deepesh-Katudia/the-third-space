import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MemberActionSheet } from '../../components/MemberActionSheet'

const onClose = jest.fn()
const onBlock = jest.fn()
const onReport = jest.fn()

beforeEach(() => jest.clearAllMocks())

const open = (props: Partial<React.ComponentProps<typeof MemberActionSheet>> = {}) =>
  render(
    <MemberActionSheet visible memberName="Maya" onClose={onClose} onBlock={onBlock} {...props} />
  )

it('offers Block and Cancel, naming the member', () => {
  const { getByText } = open()
  expect(getByText('Maya')).toBeTruthy()
  expect(getByText('Block')).toBeTruthy()
  expect(getByText('Cancel')).toBeTruthy()
})

it('asks to confirm before it blocks anybody', () => {
  // Blocking IS reversible, but a mis-tap that silently cuts somebody off is still worth
  // one extra press to avoid.
  const { getByText } = open()
  fireEvent.press(getByText('Block'))
  expect(getByText('Block Maya?')).toBeTruthy()
  expect(onBlock).not.toHaveBeenCalled()
})

it('blocks once confirmed', () => {
  const { getByText } = open()
  fireEvent.press(getByText('Block'))
  fireEvent.press(getByText('Yes, block them'))
  expect(onBlock).toHaveBeenCalledTimes(1)
})

it('backs out of the confirmation without blocking', () => {
  const { getByText } = open()
  fireEvent.press(getByText('Block'))
  fireEvent.press(getByText('Keep them'))
  expect(getByText('Block')).toBeTruthy()
  expect(onBlock).not.toHaveBeenCalled()
})

it('closes on Cancel and on the scrim', () => {
  const { getByText, getByTestId } = open()
  fireEvent.press(getByText('Cancel'))
  expect(onClose).toHaveBeenCalledTimes(1)
  fireEvent.press(getByTestId('member-sheet-scrim'))
  expect(onClose).toHaveBeenCalledTimes(2)
})

it('does not close when the sheet body itself is pressed', () => {
  // The scrim is the parent, so without stopping this a press anywhere inside the sheet
  // would dismiss it.
  const { getByTestId } = open()
  fireEvent.press(getByTestId('member-sheet'))
  expect(onClose).not.toHaveBeenCalled()
})

it('hides Report until a handler is supplied', () => {
  // Phase 2 adds reporting to this same sheet; until then the row would do nothing, and a
  // control that does nothing is what this whole change set exists to remove.
  const { queryByText } = open()
  expect(queryByText('Report')).toBeNull()
  const withReport = render(
    <MemberActionSheet visible memberName="Maya" onClose={onClose} onBlock={onBlock} onReport={onReport} />
  )
  fireEvent.press(withReport.getByText('Report'))
  expect(onReport).toHaveBeenCalledTimes(1)
})
