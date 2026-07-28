import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
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
import { formatRupiah } from '../../lib/format';
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
            <Pressable
              style={styles.hero}
              onPress={() => navigation.navigate('FundAllocation')}
            >
              <Text style={styles.heroLabel}>Bantuan Dana Pendidikan</Text>
              <Text style={styles.heroValue}>
                {formatRupiah(fundSummary?.totals.sources ?? stats?.totalDisbursed ?? 0)}
              </Text>
              <View style={styles.heroStatRow}>
                <View>
                  <Text style={styles.heroStatLabel}>Digunakan</Text>
                  <Text style={styles.heroStatValue}>
                    {formatRupiah(fundSummary?.totals.received ?? 0)}
                  </Text>
                </View>
                <View style={styles.heroStatRight}>
                  <Text style={styles.heroStatLabel}>Sisa Dana</Text>
                  <Text style={styles.heroStatValue}>
                    {formatRupiah(fundSummary?.totals.remaining ?? 0)}
                  </Text>
                </View>
              </View>
              <Text style={styles.heroSub}>
                {stats?.activeParticipants ?? 0} partisipan aktif dari {stats?.totalParticipants ?? 0} terdaftar · Ketuk untuk rincian
              </Text>
            </Pressable>

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
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  heroStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  heroStatRight: {
    alignItems: 'flex-end',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
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
