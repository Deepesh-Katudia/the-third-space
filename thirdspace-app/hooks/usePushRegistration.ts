import { useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { useAuth } from './useAuth'
import { upsertPushToken, deletePushToken } from '../services/pushTokens'
import { routeForNotification, NotificationData } from '../utils/pushRouting'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export function usePushRegistration(): void {
  const { user } = useAuth()
  const router = useRouter()
  const tokenRef = useRef<string | null>(null)
  const uidRef = useRef<string | null>(null)

  // Capture a token on sign-in (physical devices with granted permission only).
  useEffect(() => {
    let cancelled = false
    async function register(): Promise<void> {
      if (!user || !Device.isDevice) return
      const current = await Notifications.getPermissionsAsync()
      let status = current.status
      if (status === 'undetermined') {
        status = (await Notifications.requestPermissionsAsync()).status
      }
      if (status !== 'granted') return

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
      const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data
      if (cancelled) return
      tokenRef.current = token
      uidRef.current = user.uid
      await upsertPushToken(user.uid, token, Platform.OS === 'ios' ? 'ios' : 'android')
    }
    register()
    return () => {
      cancelled = true
    }
  }, [user])

  // Remove this device's token on sign-out so a shared device stops receiving pushes.
  useEffect(() => {
    if (user) return
    const uid = uidRef.current
    const token = tokenRef.current
    if (uid && token) {
      deletePushToken(uid, token)
      uidRef.current = null
      tokenRef.current = null
    }
  }, [user])

  // Deep-link when a notification is tapped.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData
      const route = routeForNotification(data)
      if (route) router.push(route as never)
    })
    return () => sub.remove()
  }, [router])
}

export default function PushRegistration(): null {
  usePushRegistration()
  return null
}
