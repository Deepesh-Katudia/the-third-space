import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { ReportSheet } from '../../components/ReportSheet'
import { submitReport } from '../../services/reports'

jest.mock('../../services/reports', () => ({ submitReport: jest.fn() }))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'me' }, loading: false }) }))

const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(submitReport as jest.Mock).mockResolvedValue(undefined)
})

const open = (target: React.ComponentProps<typeof ReportSheet>['target']) =>
  render(<ReportSheet visible target={target} onClose={onClose} />)

it('offers every reason', () => {
  const { getByText } = open({ kind: 'user', targetUid: 'them' })
  for (const label of ['Harassment or bullying', 'Spam or scam', 'Nudity or sexual content', 'Hate speech', 'Violence or threats', 'Something else']) {
    expect(getByText(label)).toBeTruthy()
  }
})

it('will not submit until a reason is chosen', () => {
  // A report with no reason is unactionable, and the queue is read by a person.
  const { getByText } = open({ kind: 'user', targetUid: 'them' })
  fireEvent.press(getByText('Submit report'))
  expect(submitReport).not.toHaveBeenCalled()
})

it('submits a user report with the reporter and the reason', async () => {
  const { getByText } = open({ kind: 'user', targetUid: 'them' })
  fireEvent.press(getByText('Spam or scam'))
  fireEvent.press(getByText('Submit report'))
  await waitFor(() =>
    expect(submitReport).toHaveBeenCalledWith({
      reporterUid: 'me',
      kind: 'user',
      targetUid: 'them',
      reason: 'spam',
      details: '',
    })
  )
})

it('carries the thread and message ids for a message report', async () => {
  // Without them a reported message cannot be found again, which makes the report
  // unactionable however clear the reason is.
  const { getByText } = open({ kind: 'message', targetUid: 'them', threadId: 'me_them', messageId: 'm1' })
  fireEvent.press(getByText('Hate speech'))
  fireEvent.press(getByText('Submit report'))
  await waitFor(() =>
    expect(submitReport).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'message', threadId: 'me_them', messageId: 'm1', reason: 'hate' })
    )
  )
})

it('acknowledges the report rather than closing silently', async () => {
  // Apple's clause is about responsiveness. A sheet that vanishes reads as nothing
  // having happened.
  const { getByText, findByText } = open({ kind: 'event', targetUid: 'host', eventId: 'e1' })
  fireEvent.press(getByText('Violence or threats'))
  fireEvent.press(getByText('Submit report'))
  expect(await findByText('Thanks — we will look at this')).toBeTruthy()
})

it('surfaces a failure instead of pretending it was filed', async () => {
  ;(submitReport as jest.Mock).mockRejectedValue(new Error('offline'))
  const { getByText, findByText } = open({ kind: 'user', targetUid: 'them' })
  fireEvent.press(getByText('Spam or scam'))
  fireEvent.press(getByText('Submit report'))
  expect(await findByText("That didn't send. Try again.")).toBeTruthy()
})

it('closes on Cancel without filing anything', () => {
  const { getByText } = open({ kind: 'user', targetUid: 'them' })
  fireEvent.press(getByText('Cancel'))
  expect(onClose).toHaveBeenCalledTimes(1)
  expect(submitReport).not.toHaveBeenCalled()
})
