import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { ForgotPinScreen } from '../screens/auth/ForgotPinScreen'
import { LoginScreen } from '../screens/auth/LoginScreen'
import { PinResetSelfieScreen } from '../screens/auth/PinResetSelfieScreen'

export type AuthStackParamList = {
  Login: undefined
  ForgotPin: undefined
  PinResetSelfie: { identifier: string }
}

const Stack = createNativeStackNavigator<AuthStackParamList>()

export function AuthStack () {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name='Login' component={LoginScreen} />
      <Stack.Screen name='ForgotPin' component={ForgotPinScreen} />
      <Stack.Screen name='PinResetSelfie' component={PinResetSelfieScreen} />
    </Stack.Navigator>
  )
}
