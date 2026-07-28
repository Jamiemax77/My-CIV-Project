import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import * as Notifications from 'expo-notifications'
import React, { useEffect, useState } from 'react'
import { useRegisterPushToken } from '../hooks/useNotifications'
import { registerForPushNotificationsAsync } from '../lib/push'
import { ChangePinScreen } from '../screens/participant/ChangePinScreen'
import { SplashScreen } from '../screens/SplashScreen'
import { useAuthStore } from '../store/authStore'
import { AdminStack } from './AdminStack'
import { AuthStack } from './AuthStack'
import { ParticipantStack } from './ParticipantStack'

const MIN_SPLASH_MS = 5000

const Stack = createNativeStackNavigator()

export function RootNavigator () {
  const hydrate = useAuthStore(s => s.hydrate)
  const hydrated = useAuthStore(s => s.hydrated)
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const role = useAuthStore(s => s.user?.role)
  const mustChangePin = useAuthStore(s => s.user?.mustChangePin)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false)
  const navigationRef = useNavigationContainerRef()
  const registerPushToken = useRegisterPushToken()

  useEffect(() => {
    hydrate()
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [hydrate])

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    registerForPushNotificationsAsync().then(token => {
      if (token && !cancelled) registerPushToken.mutate(token)
    })
    return () => {
      cancelled = true
    }
    // Only re-run when the session itself changes, not on every registerPushToken identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    // Tapping a push (e.g. admin tapping a "permintaan reset PIN" alert) opens straight
    // to that role's notification list — not the specific record, to keep this simple.
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      const currentRole = useAuthStore.getState().user?.role
      // RootNavigator's Stack has no typed param list (see `Stack` above), so this
      // ref's navigate() collapses to `never` — cast is the pragmatic way through.
      const navigate = navigationRef.navigate as (name: string, params?: object) => void
      if (currentRole === 'admin') {
        navigate('AdminApp', { screen: 'Notifications' })
      } else if (currentRole === 'participant') {
        navigate('ParticipantApp', { screen: 'Notifications' })
      }
    })
    return () => subscription.remove()
  }, [navigationRef])

  if (!hydrated || !minTimeElapsed) {
    return <SplashScreen />
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name='Auth' component={AuthStack} />
        ) : role === 'admin' ? (
          <Stack.Screen name='AdminApp' component={AdminStack} />
        ) : mustChangePin ? (
          <Stack.Screen name='ForceChangePin'>
            {() => <ChangePinScreen forced />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name='ParticipantApp' component={ParticipantStack} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
