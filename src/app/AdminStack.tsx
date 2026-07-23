import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AddParticipantScreen } from '../screens/admin/AddParticipantScreen';
import { EditAdminProfileScreen } from '../screens/admin/EditAdminProfileScreen';
import { FundAllocationScreen } from '../screens/admin/FundAllocationScreen';
import { ParticipantDetailScreen } from '../screens/admin/ParticipantDetailScreen';
import { UploadTransferProofScreen } from '../screens/admin/UploadTransferProofScreen';
import { VerifyFullSemesterReportDetailScreen } from '../screens/admin/VerifyFullSemesterReportDetailScreen';
import { AdminTabParamList, AdminTabs } from './AdminTabs';

export type AdminStackParamList = {
  Tabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  UploadTransferProof: undefined;
  AddParticipant: undefined;
  ParticipantDetail: { participantId: string };
  EditAdminProfile: undefined;
  FundAllocation: undefined;
  VerifyFullSemesterReportDetail: { reportId: string };
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AdminTabs} />
      <Stack.Screen name="UploadTransferProof" component={UploadTransferProofScreen} />
      <Stack.Screen name="AddParticipant" component={AddParticipantScreen} />
      <Stack.Screen name="ParticipantDetail" component={ParticipantDetailScreen} />
      <Stack.Screen name="EditAdminProfile" component={EditAdminProfileScreen} />
      <Stack.Screen name="FundAllocation" component={FundAllocationScreen} />
      <Stack.Screen
        name="VerifyFullSemesterReportDetail"
        component={VerifyFullSemesterReportDetailScreen}
      />
    </Stack.Navigator>
  );
}
