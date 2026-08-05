import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * Whether the OS "reduce motion" setting is on.
 *
 * Starts at `true` — not `false`. The probe is a native round trip, and defaulting to
 * "animate" would start drift loops on the first frame and tear them down a tick later
 * for exactly the users who asked not to be animated at. Failing safe costs an
 * imperceptible pause before the field starts moving; failing the other way is the bug.
 *
 * A rejected probe resolves to `false`, because a broken accessibility API is not a
 * statement of preference and a permanently frozen background is worse than motion.
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(true)

  useEffect(() => {
    let mounted = true

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (mounted) setReduced(enabled) })
      .catch(() => { if (mounted) setReduced(false) })

    // The setting can be toggled while the app is open, and the field lives for the
    // whole session — so this listens rather than probing once.
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduced(enabled)
    })

    return () => {
      mounted = false
      sub.remove()
    }
  }, [])

  return reduced
}
