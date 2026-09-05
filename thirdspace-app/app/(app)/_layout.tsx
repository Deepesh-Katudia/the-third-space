import { useEffect } from 'react'
import { Stack } from 'expo-router'
import PushRegistration from '../../hooks/usePushRegistration'
import { useAuth } from '../../hooks/useAuth'
import { syncBlocks } from '../../hooks/useBlocks'
import { navigatorBackground } from '../../constants/design'

export default function AppLayout() {
  const { user } = useAuth()

  // The one attach point for the app-wide blocked set. This layout stays mounted
  // underneath every pushed route, so a screen deep in a stack reads the same set as the
  // tab it was opened from — the same reasoning that puts RewardWatcher beside the tab
  // navigator rather than inside a screen. syncBlocks is idempotent per uid, so this
  // effect re-running costs nothing.
  useEffect(() => {
    syncBlocks(user?.uid)
  }, [user?.uid])

  return (
    <>
      <PushRegistration />
      <Stack screenOptions={{ headerShown: false, contentStyle: navigatorBackground }}>
        <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
        <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
        <Stack.Screen name="borough-picker" options={{ presentation: 'modal' }} />
        <Stack.Screen name="message-requests" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-profile" />
      </Stack>
    </>
  )
}
