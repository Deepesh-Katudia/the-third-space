import React, { useState } from 'react'
import { Modal, View, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { submitReport } from '../services/reports'
import { ReportKind, ReportReason } from '../types/models'
import { FormInput } from './FormInput'
import { Display, Body, Meta } from './ui/Text'
import { palette, radius, space } from '../constants/design'

/**
 * One reason-picker for all three things a member can report: a profile, a message, or an
 * event. Shared rather than repeated per surface, so the reason list cannot drift into
 * three slightly different vocabularies — the report queue is read by a person, and
 * consistent reasons are what make it sortable.
 *
 * The reasons are plain English in the UI and slugs in Firestore, the same split
 * `constants/categories.ts` uses: the copy can be reworded without orphaning the reports
 * already filed under it.
 */
const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'spam', label: 'Spam or scam' },
  { id: 'nudity', label: 'Nudity or sexual content' },
  { id: 'hate', label: 'Hate speech' },
  { id: 'violence', label: 'Violence or threats' },
  { id: 'other', label: 'Something else' },
]

const NOUN: Record<ReportKind, string> = {
  user: 'this member',
  message: 'this message',
  event: 'this event',
}

export interface ReportTarget {
  kind: ReportKind
  targetUid: string
  threadId?: string
  messageId?: string
  eventId?: string
}

interface ReportSheetProps {
  visible: boolean
  target: ReportTarget
  onClose: () => void
}

export function ReportSheet({ visible, target, onClose }: ReportSheetProps) {
  const { user } = useAuth()
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const close = () => {
    setReason(null)
    setDetails('')
    setSent(false)
    setError('')
    onClose()
  }

  const handleSubmit = async () => {
    // A report with no reason is unactionable, so the button simply does nothing rather
    // than filing something a human then has to guess at.
    if (!reason || !user || sending) return
    setSending(true)
    setError('')
    try {
      await submitReport({
        reporterUid: user.uid,
        kind: target.kind,
        targetUid: target.targetUid,
        reason,
        ...(target.threadId ? { threadId: target.threadId } : {}),
        ...(target.messageId ? { messageId: target.messageId } : {}),
        ...(target.eventId ? { eventId: target.eventId } : {}),
        details,
      })
      setSent(true)
    } catch {
      // Never claim it was filed when it was not: the member would think somebody is
      // looking at it, which is worse than asking them to try again.
      setError("That didn't send. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={close} testID="report-sheet-scrim">
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}} testID="report-sheet">
          {sent ? (
            <>
              <Display role="cardTitle" style={styles.title}>Thanks — we will look at this</Display>
              <Body role="bodySm" style={styles.body}>
                Reports are reviewed by a person. If you also want them out of your app,
                block them from their profile.
              </Body>
              <TouchableOpacity style={styles.row} onPress={close} activeOpacity={0.7}>
                <Body role="bodySm">Done</Body>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Display role="cardTitle" style={styles.title}>Report {NOUN[target.kind]}</Display>
              <Body role="bodySm" style={styles.body}>What is wrong with it?</Body>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.reasons}>
                {REASONS.map((r) => {
                  const active = reason === r.id
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.reasonRow, active && styles.reasonRowActive]}
                      onPress={() => setReason(r.id)}
                      activeOpacity={0.7}
                    >
                      <Body role="bodySm" tone={active ? 'clay' : 'ink'}>{r.label}</Body>
                      {active ? <Meta role="eyebrow" tone="clay">✓</Meta> : null}
                    </TouchableOpacity>
                  )
                })}
              </ScrollView>

              <FormInput
                label="Anything else? (optional)"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {error ? <Body role="bodySm" tone="clay" style={styles.error}>{error}</Body> : null}

              <TouchableOpacity
                style={[styles.submit, !reason && styles.submitDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.7}
              >
                <Meta role="eyebrow" tone="clay">{sending ? 'Sending…' : 'Submit report'}</Meta>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={close} activeOpacity={0.7}>
                <Body role="bodySm">Cancel</Body>
              </TouchableOpacity>
            </>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: palette.sheetScrim },
  sheet: {
    backgroundColor: palette.cream,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    maxHeight: '88%',
  },
  title: { marginBottom: space.sm },
  body: { marginBottom: space.md },
  reasons: { marginBottom: space.md },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    paddingHorizontal: space.md + 2,
    borderRadius: radius.ticket,
    borderWidth: 1,
    borderColor: palette.rule,
    marginBottom: space.sm,
    backgroundColor: palette.orangeLight,
  },
  reasonRowActive: { borderColor: palette.clay },
  submit: {
    alignItems: 'center',
    paddingVertical: space.lg - 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.clay,
    marginTop: space.sm,
  },
  submitDisabled: { opacity: 0.45 },
  row: { paddingVertical: space.lg - 2, alignItems: 'center' },
  error: { marginBottom: space.sm },
})
