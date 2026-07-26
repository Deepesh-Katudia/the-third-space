import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { palette, NAV_CLEARANCE } from '../../constants/design'

interface ScreenProps {
  /** 'deep' for browse/list screens, 'cream' for forms and chat threads. */
  tone?: 'deep' | 'cream'
  /** Set on tab screens so scrolling content clears the flat bottom bar. */
  padBottom?: boolean
  children: React.ReactNode
}

export function Screen({ tone = 'deep', padBottom = false, children }: ScreenProps) {
  return (
    <SafeAreaView
      testID="screen-root"
      style={{
        flex: 1,
        backgroundColor: tone === 'deep' ? palette.orangeDeep : palette.cream,
        paddingBottom: padBottom ? NAV_CLEARANCE : 0,
      }}
    >
      {children}
    </SafeAreaView>
  )
}
