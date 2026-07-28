import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddFundSourceModal } from '../../components/AddFundSourceModal';
import { BalanceCard } from '../../components/BalanceCard';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { useAddFundSource, useFundSummary } from '../../hooks/useAdminData';
import { formatRupiah } from '../../lib/format';
import { colors, radius } from '../../theme';

export function FundAllocationScreen() {
  const navigation = useNavigation();
  const { data: summary, isLoading, isError, refetch, isRefetching } = useFundSummary();
  const addFundSource = useAddFundSource();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <View style={styles.screen}>
      <Header variant="admin" title="Rincian Dana Bantuan" onBack={navigation.goBack} />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.navy}
            colors={[colors.navy]}
          />
        }
      >
        <ResponsiveContainer>
          {isLoading ? (
            <Skeleton height={120} radiusSize={radius.xl} style={styles.skeletonGap} />
          ) : isError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat data"
                subtitle="Coba lagi sebentar lagi."
              />
              <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
            </View>
          ) : (
            <>
              <BalanceCard
                label="Total Bantuan Dana Pendidikan"
                amount={summary?.totals.sources ?? 0}
                rows={[
                  { label: 'Digunakan', value: summary?.totals.received ?? 0 },
                  { label: 'Sisa Dana', value: summary?.totals.remaining ?? 0 },
                ]}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sumber Dana</Text>
                <Button
                  label="+ Tambah"
                  variant="ghost"
                  style={styles.addBtn}
                  onPress={() => {
                    setSubmitError(null);
                    setModalOpen(true);
                  }}
                />
              </View>
              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
              {!summary || summary.sources.length === 0 ? (
                <EmptyState
                  icon="cash-outline"
                  title="Belum ada sumber dana"
                  subtitle="Tambahkan rincian sumber dana per jenis bantuan."
                />
              ) : (
                summary.sources.map((source) => (
                  <Card key={source.id} style={styles.sourceCard}>
                    <View style={styles.sourceTopRow}>
                      <Text style={styles.sourceType}>{source.scholarshipType}</Text>
                      <Text style={styles.sourceAmount}>{formatRupiah(source.amount)}</Text>
                    </View>
                    {source.interventionId ? (
                      <Text style={styles.sourceMeta}>ID Intervensi: {source.interventionId}</Text>
                    ) : null}
                    {source.fundName ? (
                      <Text style={styles.sourceMeta}>Dana: {source.fundName}</Text>
                    ) : null}
                    {source.description ? (
                      <Text style={styles.sourceDesc}>{source.description}</Text>
                    ) : null}
                  </Card>
                ))
              )}

              <Text style={[styles.sectionTitle, styles.gapTop]}>Alokasi per Partisipan</Text>
              {!summary || summary.participants.length === 0 ? (
                <EmptyState
                  icon="people-outline"
                  title="Belum ada partisipan"
                  subtitle="Data alokasi akan muncul setelah ada partisipan terdaftar."
                />
              ) : (
                summary.participants.map((p) => (
                  <Card key={p.participantId} style={styles.participantCard}>
                    <Text style={styles.participantName} numberOfLines={1}>
                      {p.fullName}
                    </Text>
                    <Text style={styles.participantId}>{p.idNumber}</Text>
                    <View style={styles.statRow}>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Total</Text>
                        <Text style={styles.statValue}>{formatRupiah(p.total)}</Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Diterima</Text>
                        <Text style={styles.statValue}>{formatRupiah(p.received)}</Text>
                      </View>
                      <View style={styles.statCol}>
                        <Text style={styles.statLabel}>Sisa</Text>
                        <Text style={styles.statValue}>{formatRupiah(p.remaining)}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <AddFundSourceModal
        visible={modalOpen}
        saving={addFundSource.isPending}
        onSave={(input) => {
          addFundSource.mutate(input, {
            onSuccess: () => setModalOpen(false),
            onError: (err) =>
              setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan sumber dana.'),
          });
        }}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  skeletonGap: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  gapTop: {
    marginTop: 22,
    marginBottom: 10,
  },
  addBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: 8,
  },
  sourceCard: {
    marginBottom: 10,
  },
  sourceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.royal,
  },
  sourceAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
  },
  sourceMeta: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  sourceDesc: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
  },
  participantCard: {
    marginBottom: 10,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  participantId: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: colors.muted,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
});
