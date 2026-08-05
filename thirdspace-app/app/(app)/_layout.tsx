import { Stack } from 'expo-router'
import PushRegistration from '../../hooks/usePushRegistration'
import { navigatorBackground } from '../../constants/design'

export default function AppLayout() {
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
