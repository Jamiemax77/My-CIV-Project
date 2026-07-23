import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { ChangePinScreen } from '../screens/participant/ChangePinScreen'
import { SplashScreen } from '../screens/SplashScreen'
import { useAuthStore } from '../store/authStore'
import { AdminStack } from './AdminStack'
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

  useEffect(() => {
    hydrate()
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS)
    return () => clearTimeout(timer)
  }, [hydrate])

  if (!hydrated || !minTimeElapsed) {
    return <SplashScreen />
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name='Auth' component={LoginScreen} />
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
