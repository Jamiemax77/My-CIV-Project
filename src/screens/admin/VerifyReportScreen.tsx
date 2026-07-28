import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { ReviewCard } from '../../components/ReviewCard';
import { Skeleton } from '../../components/Skeleton';
import { useAdminReports, useReviewReport } from '../../hooks/useAdminData';
import { formatDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { radius } from '../../theme';
import { ReportItem, ReportStatus } from '../../types/models';

type FilterKey = 'all' | ReportStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'revision', label: 'Revisi' },
  { key: 'all', label: 'Semua' },
];

export function VerifyReportScreen() {
  const token = useAuthStore((s) => s.token);
  const { data: reports, isLoading, isError, refetch } = useAdminReports();
  const reviewReport = useReviewReport();
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [previewTarget, setPreviewTarget] = useState<ReportItem | null>(null);

  const pendingCount = useMemo(
    () => (reports ?? []).filter((r) => r.status === 'pending').length,
    [reports]
  );

  const items = (reports ?? []).filter((r) => filter === 'all' || r.status === filter);

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
            icon="document-text-outline"
            title="Tidak ada laporan"
            subtitle="Tidak ada laporan semester pada status ini."
          />
        ) : null}
        {items.map((item) => (
          <ReviewCard
            key={item.id}
            name={item.participantName ?? '-'}
            subtitle={`${item.participantIdNumber ?? '-'} · Semester ${item.participantSemester ?? '-'}`}
            headerRight={
              <Badge
                status={
                  item.status === 'verified'
                    ? 'approved'
                    : item.status === 'revision'
                      ? 'rejected'
                      : 'pending'
                }
                label={
                  item.status === 'verified'
                    ? 'Terverifikasi'
                    : item.status === 'revision'
                      ? 'Revisi'
                      : 'Menunggu'
                }
              />
            }
            rows={[
              { label: 'Semester', value: item.semester },
              { label: 'IPK', value: item.gpa.toFixed(2) },
              { label: 'Tanggal', value: formatDate(item.createdAt) },
            ]}
            docLabel={item.fileName}
            docIcon="document-text-outline"
            onDocPress={() => setPreviewTarget(item)}
            approveLabel="Verifikasi"
            rejectLabel="Minta Revisi"
            readOnly={item.status !== 'pending'}
            onReject={() => reviewReport.mutate({ id: item.id, status: 'revision' })}
            onApprove={() => reviewReport.mutate({ id: item.id, status: 'verified' })}
          />
        ))}
      </View>

      <FilePreviewModal
        visible={!!previewTarget}
        title="Berkas Laporan"
        fileId={previewTarget?.fileId}
        fileName={previewTarget?.fileName}
        token={token}
        onClose={() => setPreviewTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 16,
  },
});
