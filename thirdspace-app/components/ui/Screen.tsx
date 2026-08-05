import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { palette, NAV_CLEARANCE } from '../../constants/design'
import { AmbientBackdrop } from '../AmbientBackdrop'

interface ScreenProps {
  /** 'deep' shows the ambient field bare; 'cream' veils it for forms and chat threads. */
  tone?: 'deep' | 'cream'
  /** Set on tab screens so scrolling content clears the flat bottom bar. */
  padBottom?: boolean
  children: React.ReactNode
}

/**
 * Every route renders through here, which is what makes the ambient field app-wide: the
 * backdrop is mounted once per screen rather than sprinkled into individual routes.
 *
 * The field sits OUTSIDE the SafeAreaView, and the SafeAreaView is transparent, because
 * absolutely-positioned children are laid out against the padding edge — inside a
 * SafeAreaView the backdrop would stop at the notch and leave the status-bar strip
 * unpainted.
 *
 * `tone` no longer picks an opaque fill. 'deep' is the field itself; 'cream' lays a
 * near-opaque cream veil over it so forms keep their calm surface while the glows still
 * move faintly underneath. Screens do not opt out of the field.
 */
export function Screen({ tone = 'deep', padBottom = false, children }: ScreenProps) {
  return (
    <View style={styles.field} testID="screen-field">
      <AmbientBackdrop />
      {tone === 'cream' && <View style={styles.veil} pointerEvents="none" testID="screen-veil" />}

      <SafeAreaView
        testID="screen-root"
        style={{
          flex: 1,
          backgroundColor: 'transparent',
          paddingBottom: padBottom ? NAV_CLEARANCE : 0,
        }}
      >
        {children}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { flex: 1 },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.creamVeil },
})
