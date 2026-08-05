import React from 'react'
import { View, TouchableOpacity, Linking, StyleSheet } from 'react-native'
import { space } from '../constants/design'
import { Body, Meta } from './ui/Text'

const SUGGESTIONS_EMAIL = 'hello@yourthirdspace.app'

/**
 * Sits under the category list: the list is a closed set with no catch-all, so a member
 * whose thing does not fit has nowhere to put it. This is that outlet.
 *
 * The address is written out rather than hidden behind a "get in touch" link, so it
 * survives the tap failing — see below.
 */
export function CategorySuggestion() {
  const compose = () => {
    // A device with no mail client rejects this. Nothing useful to show the user in that
    // case, and it is not an error on their part — the address is on screen either way,
    // which is the whole reason it is rendered as text rather than a bare link.
    Linking.openURL(`mailto:${SUGGESTIONS_EMAIL}`).catch(() => {})
  }

  return (
    <View style={styles.wrap}>
      <Body role="bodySm" tone="inkSoft" style={styles.prompt}>
        Any new category suggestions?
      </Body>
      <TouchableOpacity
        onPress={compose}
        accessibilityRole="link"
        accessibilityLabel={`Email ${SUGGESTIONS_EMAIL} with a category suggestion`}
        hitSlop={8}
      >
        <Meta role="eyebrow" tone="clay" style={styles.email}>{SUGGESTIONS_EMAIL}</Meta>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs + 1, paddingTop: space.lg, paddingHorizontal: space.md },
  prompt: { textAlign: 'center' },
  email: { textAlign: 'center' },
})
