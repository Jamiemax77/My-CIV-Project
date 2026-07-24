import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AboutScreen } from '../screens/participant/AboutScreen';
import { AccountsScreen } from '../screens/participant/AccountsScreen';
import { ChangePinScreen } from '../screens/participant/ChangePinScreen';
import { EditProfileScreen } from '../screens/participant/EditProfileScreen';
import { FullSemesterReportDetailScreen } from '../screens/participant/FullSemesterReportDetailScreen';
import { FullSemesterReportScreen } from '../screens/participant/FullSemesterReportScreen';
import { HelpFaqScreen } from '../screens/participant/HelpFaqScreen';
import { TransferProofScreen } from '../screens/participant/TransferProofScreen';
import { ParticipantTabParamList, ParticipantTabs } from './ParticipantTabs';

export type ParticipantStackParamList = {
  Tabs: NavigatorScreenParams<ParticipantTabParamList> | undefined;
  Accounts: undefined;
  TransferProof: { transferProofId: string };
  About: undefined;
  HelpFaq: undefined;
  ChangePin: undefined;
  EditProfile: undefined;
  FullSemesterReport: undefined;
  FullSemesterReportDetail: { reportId: string };
};

const Stack = createNativeStackNavigator<ParticipantStackParamList>();

export function ParticipantStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={ParticipantTabs} />
      <Stack.Screen name="Accounts" component={AccountsScreen} />
      <Stack.Screen name="TransferProof" component={TransferProofScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="HelpFaq" component={HelpFaqScreen} />
      <Stack.Screen name="ChangePin" component={ChangePinScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="FullSemesterReport" component={FullSemesterReportScreen} />
      <Stack.Screen name="FullSemesterReportDetail" component={FullSemesterReportDetailScreen} />
    </Stack.Navigator>
  );
}
