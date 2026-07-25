import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useChatList } from '../../../hooks/useChatList'
import { chatUnreadBadge } from '../../../utils/chat'
import { LoadingView } from '../../../components/LoadingView'
import { PillTabButton } from '../../../components/PillTabButton'
import { colors, font, floatingNav } from '../../../constants/theme'

export default function AttenderLayout() {
  const { user, role, loading } = useAuth()
  const { threads } = useChatList(user?.uid)
  if (loading) return <LoadingView />
  if (role !== 'attender') return <Redirect href="/(app)" />

  const chatBadge = chatUnreadBadge(threads)

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.mutedLight,
        tabBarLabelStyle: { fontFamily: font.bold, fontSize: 10 },
        tabBarStyle: floatingNav,
        tabBarButton: (props) => <PillTabButton {...props} />,
        tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: font.bold, fontSize: 10 },
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
          tabBarBadge: chatBadge,
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
