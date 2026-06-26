import { useState, useEffect } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

type Role = 'attender' | 'hoster' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        try {
          const [userSnap, profileSnap] = await Promise.all([
            getDoc(doc(db, 'users', firebaseUser.uid)),
            getDoc(doc(db, 'profiles', firebaseUser.uid)),
          ])
          setRole(userSnap.exists() ? (userSnap.data().role as 'attender' | 'hoster') : null)
          setHasProfile(profileSnap.exists())
        } catch {
          setRole(null)
          setHasProfile(false)
        } finally {
          setLoading(false)
        }
      } else {
        setRole(null)
        setHasProfile(false)
        setLoading(false)
      }
    })
  }, [])

  return { user, role, hasProfile, loading }
}
