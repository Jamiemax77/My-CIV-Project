import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { BalanceCard } from '../../components/BalanceCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import {
  useAdminReimbursements,
  useAdminReports,
  useAdminStats,
  useFundSummary,
} from '../../hooks/useAdminData';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

export function AdminDashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const initial = user?.fullName?.charAt(0) ?? '?';

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isRefetching: statsRefetching,
  } = useAdminStats();
  const { data: reimbursements, refetch: refetchReimbursements, isRefetching: reimbursementsRefetching } =
    useAdminReimbursements();
  const { data: reports, refetch: refetchReports, isRefetching: reportsRefetching } = useAdminReports();
  const {
    data: fundSummary,
    refetch: refetchFundSummary,
    isRefetching: fundSummaryRefetching,
  } = useFundSummary();

  const pendingReimbursements = (reimbursements ?? []).filter((r) => r.status === 'pending').length;
  const pendingReports = (reports ?? []).filter((r) => r.status === 'pending').length;

  const isRefetching =
    statsRefetching || reimbursementsRefetching || reportsRefetching || fundSummaryRefetching;
  const refetchAll = () =>
    Promise.all([refetchStats(), refetchReimbursements(), refetchReports(), refetchFundSummary()]);

  return (
    <View style={styles.screen}>
      <Header
        variant="admin"
        greeting="Panel Pengelola"
        name={user?.fullName ?? 'Staf PPA'}
        roleTag="ADMIN"
        avatarInitial={initial}
        avatarFileId={user?.photoUrl}
        token={token}
        onAvatarPress={() => navigation.navigate('EditAdminProfile')}
      />
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
        {statsLoading ? (
          <AdminDashboardSkeleton />
        ) : statsError ? (
          <View>
            <EmptyState
              icon="cloud-offline-outline"
              title="Gagal memuat data"
              subtitle="Coba lagi sebentar lagi."
            />
            <Button label="Coba Lagi" variant="ghost" onPress={() => refetchStats()} />
          </View>
        ) : (
          <>
            <BalanceCard
              label="Bantuan Dana Pendidikan"
              amount={fundSummary?.pendidikanTotals?.sources ?? stats?.totalDisbursed ?? 0}
              rows={[
                { label: 'Digunakan', value: fundSummary?.pendidikanTotals?.received ?? 0 },
                { label: 'Sisa Dana', value: fundSummary?.pendidikanTotals?.remaining ?? 0 },
              ]}
              onPress={() => navigation.navigate('FundAllocation')}
              footer={
                <Text style={styles.heroSub}>
                  {stats?.activeParticipants ?? 0} partisipan aktif dari {stats?.totalParticipants ?? 0} terdaftar · Ketuk untuk rincian
                </Text>
              }
            />

            <BalanceCard
              label="Dana Lainnya"
              amount={fundSummary?.lainnyaTotals?.sources ?? 0}
              rows={[
                { label: 'Digunakan', value: fundSummary?.lainnyaTotals?.received ?? 0 },
                { label: 'Sisa Dana', value: fundSummary?.lainnyaTotals?.remaining ?? 0 },
              ]}
              onPress={() => navigation.navigate('FundAllocation')}
              footer={
                <Text style={styles.heroSub}>
                  Dana kasbon dan pengeluaran non-beasiswa lainnya · Ketuk untuk rincian
                </Text>
              }
            />

            <View style={styles.statGrid}>
              <StatCard
                icon="receipt"
                iconBg="#fff3dc"
                iconColor={colors.warning}
                value={pendingReimbursements}
                label="Klaim Perlu Verifikasi"
              />
              <StatCard
                icon="document-text"
                iconBg={colors.skySoft}
                iconColor={colors.blue}
                value={pendingReports}
                label="Laporan Perlu Verifikasi"
              />
            </View>

            <Button
              label="Kirim Bukti Transfer"
              variant="navy"
              onPress={() => navigation.navigate('Disbursement', { initialMode: 'existing' })}
              style={styles.transferBtn}
            />
          </>
        )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function AdminDashboardSkeleton() {
  return (
    <View>
      <Skeleton height={92} radiusSize={radius.xl} style={styles.skeletonGap} />
      <View style={styles.statGrid}>
        <Skeleton height={84} radiusSize={radius.lg} style={styles.flex1} />
        <Skeleton height={84} radiusSize={radius.lg} style={styles.flex1} />
      </View>
      <Skeleton height={46} radiusSize={radius.md} style={styles.skeletonGap} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  flex1: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: 12,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 10,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  transferBtn: {
    marginBottom: 12,
  },
});
