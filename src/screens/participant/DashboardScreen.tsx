import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { BalanceCard } from '../../components/BalanceCard';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ListItem } from '../../components/ListItem';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { StatCard } from '../../components/StatCard';
import { useDashboard } from '../../hooks/useDashboard';
import { useTransferProofs } from '../../hooks/useParticipantData';
import { formatDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

export function DashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<ParticipantStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const initial = user?.fullName?.charAt(0) ?? '?';

  const { data: summary, isLoading, isError, error, refetch, isRefetching } = useDashboard();
  const { data: transferProofs } = useTransferProofs();
  const otherTransfers = (transferProofs ?? []).filter((tp) => !tp.disbursementId);

  return (
    <View style={styles.screen}>
      <Header
        greeting="Selamat datang,"
        name={user?.fullName ?? '-'}
        avatarInitial={initial}
        avatarFileId={user?.photoUrl}
        token={token}
        onAvatarPress={() => navigation.navigate('EditProfile')}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.royal}
            colors={[colors.royal]}
          />
        }
      >
        <ResponsiveContainer>
          {isLoading ? (
            <DashboardSkeleton />
          ) : isError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat data"
                subtitle={error instanceof Error ? error.message : 'Terjadi kesalahan.'}
              />
              <Button
                label={isRefetching ? 'Mencoba lagi...' : 'Coba Lagi'}
                variant="ghost"
                onPress={() => refetch()}
                disabled={isRefetching}
              />
            </View>
          ) : !summary ? null : (
            <>
              <BalanceCard
                label="Total Beasiswa Diterima"
                amount={summary.total}
                rows={[
                  { label: 'Digunakan', value: summary.used },
                  { label: 'Sisa Dana', value: summary.remaining },
                ]}
              />

              <Text style={styles.sectionTitle}>Ringkasan</Text>
              <View style={styles.statGrid}>
                <StatCard
                  icon="checkmark-circle"
                  iconBg="#dbf8ee"
                  iconColor={colors.accent}
                  value={summary.approvedCount}
                  label="Klaim Disetujui"
                />
                <StatCard
                  icon="time"
                  iconBg="#fff3dc"
                  iconColor={colors.warning}
                  value={summary.pendingCount}
                  label="Menunggu Verifikasi"
                />
              </View>

              <Text style={styles.sectionTitle}>Riwayat Pencairan</Text>
              {summary.disbursements.length === 0 ? (
                <EmptyState
                  icon="cash-outline"
                  title="Belum ada pencairan"
                  subtitle="Riwayat pencairan dana akan muncul di sini."
                />
              ) : (
                summary.disbursements.map((d) => (
                  <ListItem
                    key={d.id}
                    icon="cash-outline"
                    iconBg={colors.skySoft}
                    iconColor={colors.blue}
                    title={d.title}
                    subtitle={formatDate(d.disbursedAt)}
                    onPress={
                      d.transferProofId
                        ? () =>
                            navigation.navigate('TransferProof', {
                              transferProofId: d.transferProofId!,
                            })
                        : undefined
                    }
                    right={
                      <Text style={styles.amount}>
                        +{d.amount.toLocaleString('id-ID')}
                      </Text>
                    }
                  />
                ))
              )}

              {otherTransfers.length > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, styles.gapTop]}>Transaksi Lainnya</Text>
                  {otherTransfers.map((tp) => (
                    <ListItem
                      key={tp.id}
                      icon="wallet-outline"
                      iconBg={colors.skySoft}
                      iconColor={colors.blue}
                      title={tp.note ?? 'Transaksi Lainnya'}
                      subtitle={formatDate(tp.transferredAt)}
                      onPress={() =>
                        navigation.navigate('TransferProof', { transferProofId: tp.id })
                      }
                      right={
                        <Text style={styles.amount}>
                          +{tp.amount.toLocaleString('id-ID')}
                        </Text>
                      }
                    />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function DashboardSkeleton() {
  return (
    <View>
      <Skeleton height={140} radiusSize={radius.xl} style={styles.skeletonGap} />
      <View style={styles.statGrid}>
        <Skeleton height={84} radiusSize={radius.lg} style={styles.flex1} />
        <Skeleton height={84} radiusSize={radius.lg} style={styles.flex1} />
      </View>
      <Skeleton height={54} radiusSize={radius.md} style={styles.skeletonGap} />
      <Skeleton height={54} radiusSize={radius.md} style={styles.skeletonGap} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
    marginTop: 4,
  },
  gapTop: {
    marginTop: 20,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
  },
  flex1: {
    flex: 1,
  },
  skeletonGap: {
    marginTop: 16,
  },
});
