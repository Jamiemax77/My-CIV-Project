import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import {
  useAdminFullSemesterReports,
  useAdminReimbursements,
  useAdminReports,
} from '../../hooks/useAdminData';
import { useMockLoading } from '../../lib/useMockLoading';
import { colors, radius } from '../../theme';
import { VerifyFullSemesterReportScreen } from './VerifyFullSemesterReportScreen';
import { VerifyReimbursementScreen } from './VerifyReimbursementScreen';
import { VerifyReportScreen } from './VerifyReportScreen';

type Section = 'klaim' | 'laporan' | 'lengkap';

export function VerificationScreen() {
  const [section, setSection] = useState<Section>('klaim');
  const loading = useMockLoading();
  const { refetch: refetchReimbursements, isRefetching: reimbursementsRefetching } =
    useAdminReimbursements();
  const { refetch: refetchReports, isRefetching: reportsRefetching } = useAdminReports();
  const { refetch: refetchFullReports, isRefetching: fullReportsRefetching } =
    useAdminFullSemesterReports();

  const isRefetching = reimbursementsRefetching || reportsRefetching || fullReportsRefetching;
  const refetchAll = () =>
    Promise.all([refetchReimbursements(), refetchReports(), refetchFullReports()]);

  return (
    <View style={styles.screen}>
      <Header variant="admin" title="Verifikasi" />
      <ResponsiveContainer style={styles.segmented}>
        <SegmentButton
          label="Klaim"
          active={section === 'klaim'}
          onPress={() => setSection('klaim')}
        />
        <SegmentButton
          label="Laporan"
          active={section === 'laporan'}
          onPress={() => setSection('laporan')}
        />
        <SegmentButton
          label="Lengkap"
          active={section === 'lengkap'}
          onPress={() => setSection('lengkap')}
        />
      </ResponsiveContainer>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            tintColor={colors.navy}
            colors={[colors.navy]}
          />
        }
      >
        <ResponsiveContainer>
          {loading ? (
            <VerificationSkeleton />
          ) : section === 'klaim' ? (
            <VerifyReimbursementScreen />
          ) : section === 'laporan' ? (
            <VerifyReportScreen />
          ) : (
            <VerifyFullSemesterReportScreen />
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function VerificationSkeleton() {
  return (
    <View>
      <View style={styles.skeletonChipRow}>
        <Skeleton width={90} height={28} radiusSize={radius.pill} />
        <Skeleton width={80} height={28} radiusSize={radius.pill} />
        <Skeleton width={70} height={28} radiusSize={radius.pill} />
      </View>
      <Skeleton height={150} radiusSize={radius.lg} style={styles.skeletonGap} />
      <Skeleton height={150} radiusSize={radius.lg} style={styles.skeletonGap} />
    </View>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: colors.navy,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  body: { padding: 16 },
  skeletonChipRow: {
    flexDirection: 'row',
    gap: 7,
  },
  skeletonGap: {
    marginTop: 16,
  },
});
