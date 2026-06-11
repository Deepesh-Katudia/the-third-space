import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { LoadingView } from '../../../components/LoadingView'

export default function HosterLayout() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading } = useVenue(user?.uid)

  if (loading || venueLoading) return <LoadingView />
  if (role !== 'hoster') return <Redirect href="/(app)" />
  if (!venue) return <Redirect href="/(app)/venue-setup" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#C4614A',
        tabBarInactiveTintColor: '#8C7B70',
        tabBarStyle: { backgroundColor: '#FBF7F2', borderTopColor: 'rgba(242,197,160,0.4)' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: 'Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="venue"
        options={{ title: 'Venue', tabBarIcon: ({ color, size }) => <Ionicons name="storefront-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
