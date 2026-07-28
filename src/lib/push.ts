import Constants, { ExecutionEnvironment } from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
})

/** Requests permission and returns an Expo push token, or null if denied/unavailable
 * (web, no EAS project id configured, or running in Expo Go — remote push tokens can't
 * be issued there on Android since SDK 53, and calling getExpoPushTokenAsync anyway
 * makes expo-notifications log its own console.error on every launch, so this bails
 * out before touching that API at all). Safe to call repeatedly — a no-op once granted. */
export async function registerForPushNotificationsAsync (): Promise<string | null> {
  if (Platform.OS === 'web' || isExpoGo) return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT
    })
  }

  const existing = await Notifications.getPermissionsAsync()
  let status = existing.status
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync()
    status = requested.status
  }
  if (status !== 'granted') return null

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  if (!projectId) return null

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId })
    return data
  } catch {
    return null
  }
}
