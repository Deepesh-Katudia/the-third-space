import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { LoadingView } from '../../../components/LoadingView'

// Phase 1: unread count is hardcoded; Phase 2 wires it to a chats subscription.
const UNREAD_CHATS = 3

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
        tabBarLabelStyle: { fontFamily: 'DMSans_500Medium', fontSize: 11 },
        tabBarStyle: {
          backgroundColor: 'rgba(255,249,244,0.97)',
          borderTopColor: 'rgba(242,197,160,0.5)',
          borderTopWidth: 1,
        },
        tabBarBadgeStyle: { backgroundColor: '#C4614A', fontFamily: 'DMSans_500Medium', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="compass-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-events"
        options={{
          title: 'My Events',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarBadge: UNREAD_CHATS,
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  )
}
