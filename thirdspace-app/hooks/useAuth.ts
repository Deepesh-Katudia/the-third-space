import { useState, useEffect } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

type Role = 'attender' | 'hoster' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubUser: (() => void) | undefined
    let unsubProfile: (() => void) | undefined

    const teardownDocs = () => {
      unsubUser?.()
      unsubProfile?.()
      unsubUser = undefined
      unsubProfile = undefined
    }

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      teardownDocs()
      setUser(firebaseUser)

      if (!firebaseUser) {
        setRole(null)
        setHasProfile(false)
        setLoading(false)
        return
      }

      // Live subscriptions so role/profile reflect writes from role-select and
      // create-profile immediately (no one-shot staleness that would bounce the
      // user back through the setup flow). Loading clears once both first snapshots
      // (or errors) have arrived.
      setLoading(true)
      let gotUser = false
      let gotProfile = false
      const settle = () => {
        if (gotUser && gotProfile) setLoading(false)
      }

      unsubUser = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          setRole(snap.exists() ? (snap.data().role as 'attender' | 'hoster') : null)
          gotUser = true
          settle()
        },
        () => {
          setRole(null)
          gotUser = true
          settle()
        }
      )

      unsubProfile = onSnapshot(
        doc(db, 'profiles', firebaseUser.uid),
        (snap) => {
          setHasProfile(snap.exists())
          gotProfile = true
          settle()
        },
        () => {
          setHasProfile(false)
          gotProfile = true
          settle()
        }
      )
    })

    return () => {
      unsubAuth()
      teardownDocs()
    }
  }, [])

  return { user, role, hasProfile, loading }
}
