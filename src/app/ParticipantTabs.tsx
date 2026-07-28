import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { BottomNav, BottomNavItem } from '../components/BottomNav';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { DashboardScreen } from '../screens/participant/DashboardScreen';
import { ProfileScreen } from '../screens/participant/ProfileScreen';
import { ReimbursementScreen } from '../screens/participant/ReimbursementScreen';
import { ReportScreen } from '../screens/participant/ReportScreen';

export type ParticipantTabParamList = {
  Beranda: undefined;
  Klaim: undefined;
  Laporan: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<ParticipantTabParamList>();

export function ParticipantTabs() {
  // Shares the React Query cache with ProfileScreen's own unread-notification badge.
  const { data: unreadData } = useUnreadNotificationCount();

  const items: BottomNavItem[] = [
    { key: 'Beranda', label: 'Beranda', icon: 'home' },
    { key: 'Klaim', label: 'Klaim', icon: 'receipt' },
    { key: 'Laporan', label: 'Laporan', icon: 'document-text' },
    { key: 'Profil', label: 'Profil', icon: 'person', badge: unreadData?.count },
  ];

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
      <Tab.Screen name="Beranda" component={DashboardScreen} />
      <Tab.Screen name="Klaim" component={ReimbursementScreen} />
      <Tab.Screen name="Laporan" component={ReportScreen} />
      <Tab.Screen name="Profil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
