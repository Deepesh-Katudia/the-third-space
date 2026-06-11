import React from 'react'
import { Redirect } from 'expo-router'
import { useAuth } from '../../hooks/useAuth'
import { LoadingView } from '../../components/LoadingView'

export default function AppIndex() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingView />
  return <Redirect href={role === 'hoster' ? '/(app)/(hoster)' : '/(app)/(attender)'} />
}
