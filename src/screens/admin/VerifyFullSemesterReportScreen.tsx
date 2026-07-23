import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ReviewCard } from '../../components/ReviewCard';
import { Skeleton } from '../../components/Skeleton';
import { useAdminFullSemesterReports } from '../../hooks/useAdminData';
import { formatDate, formatRupiah } from '../../lib/format';
import { colors, radius } from '../../theme';
import { ReportStatus } from '../../types/models';

const FILTERS: Array<{ key: ReportStatus; label: string }> = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'revision', label: 'Revisi' },
];

export function VerifyFullSemesterReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { data: reports, isLoading, isError, refetch } = useAdminFullSemesterReports();
  const [filter, setFilter] = useState<ReportStatus>('pending');

  const pendingCount = useMemo(
    () => (reports ?? []).filter((r) => r.status === 'pending').length,
    [reports]
  );

  const items = (reports ?? []).filter((r) => r.status === filter);

  if (isLoading) {
    return (
      <View>
        <Skeleton height={150} radiusSize={radius.lg} />
      </View>
    );
  }

  if (isError) {
    return (
      <View>
        <EmptyState
          icon="cloud-offline-outline"
          title="Gagal memuat data"
          subtitle="Coba lagi sebentar lagi."
        />
        <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
      </View>
    );
  }

  return (
    <View>
      <ChipGroup>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.key === 'pending' ? `${f.label} (${pendingCount})` : f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </ChipGroup>

      <View style={styles.list}>
        {items.length === 0 ? (
          <EmptyState
            icon="school-outline"
            title="Tidak ada laporan"
            subtitle="Tidak ada laporan semester lengkap pada status ini."
          />
        ) : null}
        {items.map((item) => (
          <ReviewCard
            key={item.id}
            name={item.participantName ?? '-'}
            subtitle={`${item.participantIdNumber ?? '-'} · Semester ${item.semesterNumber}`}
            headerRight={<Text style={styles.amount}>{formatRupiah(item.totalAmount ?? 0)}</Text>}
            rows={[
              { label: 'Tahun', value: item.year ?? '-' },
              { label: 'SKS', value: item.sks !== undefined ? String(item.sks) : '-' },
              { label: 'IPS', value: item.ips !== undefined ? item.ips.toFixed(2) : '-' },
              { label: 'IPK', value: item.ipk !== undefined ? item.ipk.toFixed(2) : '-' },
              {
                label: 'Komitmen',
                value: item.checklist?.commitment ? 'Lengkap' : 'Belum',
                accent: item.checklist?.commitment,
              },
              {
                label: 'KHS',
                value: item.checklist?.khs ? 'Lengkap' : 'Belum',
                accent: item.checklist?.khs,
              },
              {
                label: 'Kegiatan',
                value: `${item.activityCount ?? 0}/5`,
                accent: item.checklist?.activities,
              },
              { label: 'Tanggal', value: formatDate(item.createdAt) },
            ]}
            docLabel={item.fileName ?? '-'}
            docIcon="document-text-outline"
            readOnly
            onPress={() =>
              navigation.navigate('VerifyFullSemesterReportDetail', { reportId: item.id })
            }
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
});
