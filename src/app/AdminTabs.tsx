import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { BottomNav, BottomNavItem } from '../components/BottomNav';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminParticipantsScreen } from '../screens/admin/AdminParticipantsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { DisbursementScreen } from '../screens/admin/DisbursementScreen';
import { VerificationScreen } from '../screens/admin/VerificationScreen';

export type AdminTabParamList = {
  Dashboard: undefined;
  Partisipan: undefined;
  InputDana: undefined;
  Verifikasi: undefined;
  Profil: undefined;
};

const items: BottomNavItem[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'stats-chart' },
  { key: 'Partisipan', label: 'Partisipan', icon: 'people' },
  { key: 'InputDana', label: 'Input Dana', icon: 'add-circle' },
  { key: 'Verifikasi', label: 'Verifikasi', icon: 'checkmark-circle' },
  { key: 'Profil', label: 'Profil', icon: 'person' },
];

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <BottomNav
          items={items}
          activeKey={state.routeNames[state.index]}
          onChange={(key) => navigation.navigate(key)}
        />
      )}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Partisipan" component={AdminParticipantsScreen} />
      <Tab.Screen name="InputDana" component={DisbursementScreen} />
      <Tab.Screen name="Verifikasi" component={VerificationScreen} />
      <Tab.Screen name="Profil" component={AdminProfileScreen} />
    </Tab.Navigator>
  );
}
