import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { ReviewCard } from '../../components/ReviewCard';
import { Skeleton } from '../../components/Skeleton';
import { useAdminReimbursements, useReviewReimbursement } from '../../hooks/useAdminData';
import { formatDate, formatRupiah } from '../../lib/format';
import { REIMBURSEMENT_CATEGORY_LABEL } from '../../lib/labels';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { ReimbursementItem, ReviewStatus } from '../../types/models';

const FILTERS: Array<{ key: ReviewStatus; label: string }> = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
];

export function VerifyReimbursementScreen() {
  const token = useAuthStore((s) => s.token);
  const { data: reimbursements, isLoading, isError, refetch } = useAdminReimbursements();
  const reviewReimbursement = useReviewReimbursement();
  const [filter, setFilter] = useState<ReviewStatus>('pending');
  const [previewTarget, setPreviewTarget] = useState<ReimbursementItem | null>(null);

  const pendingCount = useMemo(
    () => (reimbursements ?? []).filter((r) => r.status === 'pending').length,
    [reimbursements]
  );

  const items = (reimbursements ?? []).filter((r) => r.status === filter);

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
            icon="receipt-outline"
            title="Tidak ada pengajuan"
            subtitle="Tidak ada pengajuan reimbursement pada status ini."
          />
        ) : null}
        {items.map((item) => (
          <ReviewCard
            key={item.id}
            name={item.participantName ?? '-'}
            subtitle={`${item.participantIdNumber ?? '-'} · Reimbursement ${REIMBURSEMENT_CATEGORY_LABEL[item.category]}`}
            headerRight={<Text style={styles.amount}>{formatRupiah(item.amount)}</Text>}
            rows={[
              { label: 'Kategori', value: REIMBURSEMENT_CATEGORY_LABEL[item.category] },
              { label: 'Tanggal', value: formatDate(item.createdAt) },
            ]}
            docLabel={item.proofFileName}
            onDocPress={() => setPreviewTarget(item)}
            readOnly={filter !== 'pending'}
            onReject={() => reviewReimbursement.mutate({ id: item.id, status: 'rejected' })}
            onApprove={() => reviewReimbursement.mutate({ id: item.id, status: 'approved' })}
          />
        ))}
      </View>

      <FilePreviewModal
        visible={!!previewTarget}
        title="Bukti Pengajuan"
        fileId={previewTarget?.proofFileId}
        fileName={previewTarget?.proofFileName}
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
  amount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navy,
  },
});
