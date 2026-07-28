import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { BottomNav, BottomNavItem } from '../components/BottomNav';
import {
  useAdminFullSemesterReports,
  useAdminReimbursements,
  useAdminReports,
} from '../hooks/useAdminData';
import { useUnreadNotificationCount } from '../hooks/useNotifications';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminParticipantsScreen } from '../screens/admin/AdminParticipantsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { DisbursementScreen } from '../screens/admin/DisbursementScreen';
import { VerificationScreen } from '../screens/admin/VerificationScreen';

export type VerificationSection = 'klaim' | 'laporan' | 'lengkap';

export type AdminTabParamList = {
  Dashboard: undefined;
  Partisipan: undefined;
  InputDana: undefined;
  Verifikasi: { section?: VerificationSection } | undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

export function AdminTabs() {
  // Fetched once here (not per-screen) so the bottom nav badges stay in sync with the
  // Verifikasi/Profil screens' own counts via the shared React Query cache.
  const { data: reimbursements } = useAdminReimbursements();
  const { data: reports } = useAdminReports();
  const { data: fullReports } = useAdminFullSemesterReports();
  const { data: unreadData } = useUnreadNotificationCount();

  const verifikasiPendingCount =
    (reimbursements ?? []).filter((r) => r.status === 'pending').length +
    (reports ?? []).filter((r) => r.status === 'pending').length +
    (fullReports ?? []).filter((r) => r.status === 'pending').length;

  const items: BottomNavItem[] = [
    { key: 'Dashboard', label: 'Dashboard', icon: 'stats-chart' },
    { key: 'Partisipan', label: 'Partisipan', icon: 'people' },
    { key: 'InputDana', label: 'Input Dana', icon: 'add-circle' },
    { key: 'Verifikasi', label: 'Verifikasi', icon: 'checkmark-circle', badge: verifikasiPendingCount },
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
      <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="Partisipan" component={AdminParticipantsScreen} />
      <Tab.Screen name="InputDana" component={DisbursementScreen} />
      <Tab.Screen name="Verifikasi" component={VerificationScreen} />
      <Tab.Screen name="Profil" component={AdminProfileScreen} />
    </Tab.Navigator>
  );
}
