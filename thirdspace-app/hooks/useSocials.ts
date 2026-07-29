import { useEffect, useState } from 'react'
import { SocialHandles } from '../types/models'
import { subscribeSocials } from '../services/profiles'

/**
 * `visible` is decided by firestore.rules, not by this hook and not by the screen.
 * A permission-denied read means the viewer is not a connection — a normal outcome,
 * not an error. Keeping the mutual-follow check in exactly one place stops the UI
 * and the backend from disagreeing, and the UI copy would be the one that is wrong.
 */
export function useSocials(uid: string | undefined) {
  const [handles, setHandles] = useState<SocialHandles>({})
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    if (!uid) {
      setHandles({})
      setVisible(false)
      setLoading(false)
      setHasError(false)
      return
    }
    setHandles({})
    setVisible(false)
    setLoading(true)
    setHasError(false)

    return subscribeSocials(
      uid,
      (next) => {
        setHandles(next)
        setVisible(true)
        setLoading(false)
        setHasError(false)
      },
      (code) => {
        setVisible(false)
        setLoading(false)
        setHasError(code !== 'permission-denied')
      }
    )
  }, [uid])

  return { handles, visible, loading, hasError }
}
