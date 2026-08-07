import React from 'react'
import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../../hooks/useAuth'
import { useChatList } from '../../../hooks/useChatList'
import { chatUnreadBadge } from '../../../utils/chat'
import { LoadingView } from '../../../components/LoadingView'
import { RewardWatcher } from '../../../components/RewardWatcher'
import { CloudPromptWatcher } from '../../../components/CloudPromptWatcher'
import { palette, tabBar, navigatorBackground, type as typeScale } from '../../../constants/design'

export default function AttenderLayout() {
  const { user, role, loading } = useAuth()
  const { threads } = useChatList(user?.uid)
  if (loading) return <LoadingView />
  if (role !== 'attender') return <Redirect href="/(app)" />

  const chatBadge = chatUnreadBadge(threads)

  return (
    <>
      {/* Sits beside the navigator, not inside it: the unlock is a Modal and has to be
          able to land over whatever screen is on top. */}
      <RewardWatcher />
      <CloudPromptWatcher role="attender" />
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: navigatorBackground,
          tabBarActiveTintColor: tabBar.activeTintColor,
          tabBarInactiveTintColor: tabBar.inactiveTintColor,
          tabBarLabelStyle: typeScale.tabLabel,
          tabBarStyle: {
            backgroundColor: tabBar.backgroundColor,
            borderTopColor: tabBar.borderTopColor,
            borderTopWidth: tabBar.borderTopWidth,
            height: tabBar.height,
            elevation: 0,
          },
          tabBarBadgeStyle: { backgroundColor: palette.clay, color: palette.cream, ...typeScale.meta },
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
    </>
  )
}
