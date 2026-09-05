import React, { useState } from 'react'
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native'
import { Display, Body, Meta } from './ui/Text'
import { palette, radius, space } from '../constants/design'

/**
 * The safety actions on a member's profile, as a bottom sheet.
 *
 * A `Modal` rather than `ActionSheetIOS`, which is iOS-only — this app ships Android too,
 * and `CloudPrompt` already establishes Modal as how this codebase does an overlay.
 *
 * Blocking asks to confirm before it commits. It is reversible (see blocked-users), but a
 * mis-tap that silently cuts somebody off is still worth one extra press to avoid.
 */
interface MemberActionSheetProps {
  visible: boolean
  memberName: string
  onClose: () => void
  onBlock: () => void
  /** Wired in Phase 2 — the report sheet shares this entry point. */
  onReport?: () => void
}

export function MemberActionSheet({
  visible,
  memberName,
  onClose,
  onBlock,
  onReport,
}: MemberActionSheetProps) {
  const [confirming, setConfirming] = useState(false)

  const close = () => {
    setConfirming(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={close} testID="member-sheet-scrim">
        {/* Stops a press inside the sheet from closing it through the scrim above. */}
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}} testID="member-sheet">
          {confirming ? (
            <>
              <Display role="cardTitle" style={styles.title}>Block {memberName}?</Display>
              <Body role="bodySm" style={styles.body}>
                They won&apos;t be able to message you or follow you, and you won&apos;t see
                them anywhere in the app. You can undo this in Settings.
              </Body>
              <TouchableOpacity style={styles.destructiveRow} onPress={onBlock} activeOpacity={0.7}>
                <Meta role="eyebrow" tone="clay">Yes, block them</Meta>
              </TouchableOpacity>
              <TouchableOpacity style={styles.row} onPress={() => setConfirming(false)} activeOpacity={0.7}>
                <Body role="bodySm">Keep them</Body>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Display role="cardTitle" style={styles.title}>{memberName}</Display>
              <TouchableOpacity style={styles.destructiveRow} onPress={() => setConfirming(true)} activeOpacity={0.7}>
                <Meta role="eyebrow" tone="clay">Block</Meta>
              </TouchableOpacity>
              {onReport ? (
                <TouchableOpacity style={styles.row} onPress={onReport} activeOpacity={0.7}>
                  <Body role="bodySm">Report</Body>
                </TouchableOpacity>
              ) : null}
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
  },
  title: { marginBottom: space.md },
  body: { marginBottom: space.lg },
  row: {
    paddingVertical: space.lg - 2,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    alignItems: 'center',
  },
  destructiveRow: {
    paddingVertical: space.lg - 2,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
    alignItems: 'center',
  },
})
