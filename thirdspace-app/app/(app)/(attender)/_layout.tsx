import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { LoadingView } from '../../../components/LoadingView'

export default function AttenderLayout() {
  const { role, loading } = useAuth()
  if (loading) return <LoadingView />
  if (role !== 'attender') return <Redirect href="/(app)" />

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
        options={{ title: 'Feed', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="my-events"
        options={{ title: 'My Events', tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} /> }}
      />
    </Tabs>
  )
}
