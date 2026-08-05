import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useVenue } from '../../../hooks/useVenue'
import { LoadingView } from '../../../components/LoadingView'
import { tabBar, navigatorBackground, type as typeScale } from '../../../constants/design'

export default function HosterLayout() {
  const { user, role, loading } = useAuth()
  const { venue, loading: venueLoading, hasError: venueHasError } = useVenue(user?.uid)

  if (loading || venueLoading) return <LoadingView />
  if (role !== 'hoster') return <Redirect href="/(app)" />
  // Only send them to setup when the venue is confirmed absent — not on a read
  // error, which would bounce a hoster who already has a venue into the form.
  if (!venue && !venueHasError) return <Redirect href="/(app)/venue-setup" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: navigatorBackground,
        tabBarActiveTintColor: tabBar.activeTintColor,
        tabBarInactiveTintColor: tabBar.inactiveTintColor,
        tabBarStyle: {
          backgroundColor: tabBar.backgroundColor,
          borderTopColor: tabBar.borderTopColor,
          borderTopWidth: tabBar.borderTopWidth,
          height: tabBar.height,
          elevation: 0,
        },
        tabBarLabelStyle: typeScale.tabLabel,
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
      {/* Detail route reached from Events — hidden from the tab bar. */}
      <Tabs.Screen name="announcement/[id]" options={{ href: null }} />
    </Tabs>

  )
}
