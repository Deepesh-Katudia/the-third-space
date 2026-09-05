import React from 'react'
import { Text, StyleProp, TextStyle } from 'react-native'
import { palette, type as typeScale, TypeRole } from '../../constants/design'

type Tone = 'ink' | 'inkSoft' | 'clay' | 'sage'

export type DisplayRole = 'screenTitle' | 'cardTitle' | 'stubDay' | 'tabLabel'
export type BodyRole = 'body' | 'bodySm' | 'bodyLg' | 'button'
export type MetaRole = 'meta' | 'eyebrow'

interface TextProps<R extends TypeRole = TypeRole> {
  role?: R
  tone?: Tone
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  /** Announce changes to screen readers — used by Toast. */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive'
  /**
   * Makes this run of text tappable in place. For a link inside a sentence — the terms
   * label at sign-up — where lifting it out into a button would break the sentence.
   * Everything else should be a TouchableOpacity around a whole row.
   */
  onPress?: () => void
  accessibilityRole?: 'link' | 'text'
  testID?: string
  children: React.ReactNode
}

function make<R extends TypeRole>(displayName: string, defaultRole: R, defaultTone: Tone) {
  function Component({ role = defaultRole, tone = defaultTone, style, numberOfLines, accessibilityLiveRegion, onPress, accessibilityRole, testID, children }: TextProps<R>) {
    return (
      <Text
        numberOfLines={numberOfLines}
        accessibilityLiveRegion={accessibilityLiveRegion}
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? (onPress ? 'link' : undefined)}
        testID={testID}
        style={[typeScale[role], { color: palette[tone] }, style]}
      >
        {children}
      </Text>
    )
  }
  Component.displayName = displayName
  return Component
}

/** Bebas Neue. Screen titles, event names, date stubs, tab labels. Renders all-caps — the face has no lowercase. */
export const Display = make<DisplayRole>('Display', 'cardTitle' as DisplayRole, 'ink')
/** Inter. Descriptions, locations, form and chat copy. */
export const Body = make<BodyRole>('Body', 'body' as BodyRole, 'inkSoft')
/** IBM Plex Mono. Timestamps, chips, eyebrows. */
export const Meta = make<MetaRole>('Meta', 'meta' as MetaRole, 'inkSoft')
