import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AddParticipantScreen } from '../screens/admin/AddParticipantScreen';
import { ArchiveScreen } from '../screens/admin/ArchiveScreen';
import { DisbursementScreen } from '../screens/admin/DisbursementScreen';
import { EditAdminProfileScreen } from '../screens/admin/EditAdminProfileScreen';
import { FundAllocationScreen } from '../screens/admin/FundAllocationScreen';
import { ParticipantDetailScreen } from '../screens/admin/ParticipantDetailScreen';
import { VerifyFullSemesterReportDetailScreen } from '../screens/admin/VerifyFullSemesterReportDetailScreen';
import { NotificationScreen } from '../screens/NotificationScreen';
// Reused as-is — the screen has no role-specific data, same as the participant side.
import { AboutScreen } from '../screens/participant/AboutScreen';
import { AdminTabParamList, AdminTabs } from './AdminTabs';

export type AdminStackParamList = {
  Tabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  /** Pushed from the Dashboard's "Kirim Bukti Transfer" shortcut — opens straight into
   * attaching a proof to an already-disbursed entry instead of the "new" step. Pushed from
   * an approved Kasbon claim's "Kirim Dana" button with `prefill` set instead — opens the
   * "new" step with participant/amount/program already filled in. */
  Disbursement:
    | {
        initialMode?: 'existing';
        prefill?: {
          participantId: string;
          amount: string;
          program?: 'CIV P153' | 'CIV Edu' | 'BDP Support PPA' | 'Lainnya';
          note?: string;
        };
      }
    | undefined;
  AddParticipant: undefined;
  ParticipantDetail: { participantId: string };
  EditAdminProfile: undefined;
  FundAllocation: undefined;
  VerifyFullSemesterReportDetail: { reportId: string };
  Notifications: undefined;
  Archive: undefined;
  About: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      <Stack.Screen name="Disbursement" component={DisbursementScreen} />
      <Stack.Screen name="AddParticipant" component={AddParticipantScreen} />
      <Stack.Screen name="ParticipantDetail" component={ParticipantDetailScreen} />
      <Stack.Screen name="EditAdminProfile" component={EditAdminProfileScreen} />
      <Stack.Screen name="FundAllocation" component={FundAllocationScreen} />
      <Stack.Screen
        name="VerifyFullSemesterReportDetail"
        component={VerifyFullSemesterReportDetailScreen}
      />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="Archive" component={ArchiveScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
    </Stack.Navigator>
  );
}
