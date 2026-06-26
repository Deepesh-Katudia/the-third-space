import { Stack } from 'expo-router'

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-event" options={{ presentation: 'modal' }} />
      <Stack.Screen name="filters" options={{ presentation: 'modal' }} />
      <Stack.Screen name="message-requests" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-profile" />
    </Stack>
  )
}
