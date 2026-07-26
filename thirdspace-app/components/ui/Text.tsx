import React from 'react'
import { Text, StyleProp, TextStyle } from 'react-native'
import { palette, type as typeScale, TypeRole } from '../../constants/design'

type Tone = 'ink' | 'inkSoft' | 'clay' | 'sage'

interface TextProps {
  role?: TypeRole
  tone?: Tone
  style?: StyleProp<TextStyle>
  numberOfLines?: number
  children: React.ReactNode
}

function make(defaultRole: TypeRole, defaultTone: Tone) {
  return function Typed({ role = defaultRole, tone = defaultTone, style, numberOfLines, children }: TextProps) {
    return (
      <Text numberOfLines={numberOfLines} style={[typeScale[role], { color: palette[tone] }, style]}>
        {children}
      </Text>
    )
  }
}

/** Antonio. Screen titles, event names, date stubs, tab labels. */
export const Display = make('cardTitle', 'ink')
/** Inter. Descriptions, locations, form and chat copy. */
export const Body = make('body', 'inkSoft')
/** IBM Plex Mono. Timestamps, chips, eyebrows. */
export const Meta = make('meta', 'inkSoft')
