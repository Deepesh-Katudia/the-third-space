import { useState, useEffect } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'

type Role = 'attender' | 'hoster' | null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
        setRole(snap.exists() ? (snap.data().role as 'attender' | 'hoster') : null)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
  }, [])

  return { user, role, loading }
}
