import { Stack } from 'expo-router'
import { navigatorBackground } from '../../constants/design'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: navigatorBackground }}
    />
  )
}
