import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { ReviewCard } from '../../components/ReviewCard';
import { Skeleton } from '../../components/Skeleton';
import { useAdminReimbursements, useReviewReimbursement } from '../../hooks/useAdminData';
import { useReimbursementLaporanExport } from '../../hooks/useReimbursementLaporanExport';
import { formatAmountInput, formatDate, formatRupiah } from '../../lib/format';
import { REIMBURSEMENT_CATEGORY_LABEL } from '../../lib/labels';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { ReimbursementItem, ReviewStatus } from '../../types/models';

type FilterKey = 'all' | ReviewStatus;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'pending', label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'all', label: 'Semua' },
];

// Kasbon has no dedicated column server-side — it's submitted as an ordinary
// type:'reimburse' claim, distinguishable only by its nomorPengajuan prefix
// ('KSB-...', see lib/generateNomorPengajuan.ts's KODE_JENIS map).
const isKasbon = (item: ReimbursementItem) => item.nomorPengajuan?.startsWith('KSB-') ?? false;

export function VerifyReimbursementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const token = useAuthStore((s) => s.token);
  const { data: reimbursements, isLoading, isError, refetch } = useAdminReimbursements();
  const reviewReimbursement = useReviewReimbursement();
  const { exportingId, error: exportError, exportPdf, sharePdf } = useReimbursementLaporanExport();
  const [filter, setFilter] = useState<FilterKey>('pending');
  const [previewTarget, setPreviewTarget] = useState<ReimbursementItem | null>(null);

  const pendingCount = useMemo(
    () => (reimbursements ?? []).filter((r) => r.status === 'pending').length,
    [reimbursements]
  );

  const items = (reimbursements ?? []).filter((r) => filter === 'all' || r.status === filter);

  // "Laporan Penggunaan Dana" — always this one item, never the whole Klaim list.
  const laporanInputFor = (item: ReimbursementItem) => ({
    nomorPengajuan: item.nomorPengajuan || item.id,
    description: item.description,
    amount: item.amount,
    date: item.createdAt,
    proofFileId: item.proofFileId,
    proofFileName: item.proofFileName,
    usageProofFileId: item.usageProofFileId,
    usageProofFileName: item.usageProofFileName,
    participant: { fullName: item.participantName ?? '-', idNumber: item.participantIdNumber ?? '-' },
  });

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
            subtitle={`${item.participantIdNumber ?? '-'} · ${
              isKasbon(item) ? 'Kasbon' : `Reimbursement ${REIMBURSEMENT_CATEGORY_LABEL[item.category]}`
            }${item.nomorPengajuan ? ` · ${item.nomorPengajuan}` : ''}`}
            headerRight={<Text style={styles.amount}>{formatRupiah(item.amount)}</Text>}
            rows={[
              { label: 'Kategori', value: REIMBURSEMENT_CATEGORY_LABEL[item.category] },
              { label: 'Tanggal', value: formatDate(item.createdAt) },
            ]}
            docLabel={item.proofFileName}
            onDocPress={() => setPreviewTarget(item)}
            readOnly={item.status !== 'pending'}
            onReject={() => reviewReimbursement.mutate({ id: item.id, status: 'rejected' })}
            onApprove={() => reviewReimbursement.mutate({ id: item.id, status: 'approved' })}
            onExportPdf={
              item.status !== 'pending' ? () => exportPdf(item.id, laporanInputFor(item)) : undefined
            }
            onSharePdf={
              item.status !== 'pending' ? () => sharePdf(item.id, laporanInputFor(item)) : undefined
            }
            exporting={exportingId === item.id}
            onSendFunds={
              item.status === 'approved' && isKasbon(item)
                ? () =>
                    navigation.navigate('Disbursement', {
                      prefill: {
                        participantId: item.participantId,
                        amount: formatAmountInput(String(Math.round(item.amount))),
                        program: 'Lainnya',
                        note: `Kasbon ${item.nomorPengajuan ?? item.id} — ${item.description}`.slice(
                          0,
                          500
                        )
                      }
                    })
                : undefined
            }
          />
        ))}
      </View>
      {exportError ? <Text style={styles.errorText}>{exportError}</Text> : null}

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
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    textAlign: 'center',
  },
});
