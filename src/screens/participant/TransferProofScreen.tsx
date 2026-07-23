import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { Header } from '../../components/Header';
import { Receipt } from '../../components/Receipt';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { useConfirmTransferProof, useTransferProofs } from '../../hooks/useParticipantData';
import { formatDateTime } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

type TransferProofRoute = RouteProp<ParticipantStackParamList, 'TransferProof'>;

export function TransferProofScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<TransferProofRoute>();
  const token = useAuthStore((s) => s.token);
  const { data: proofs, isLoading, isError, refetch, isRefetching } = useTransferProofs();
  const confirmTransferProof = useConfirmTransferProof();
  const [previewOpen, setPreviewOpen] = useState(false);

  const proof = proofs?.find((tp) => tp.id === params.transferProofId);

  return (
    <View style={styles.screen}>
      <Header title="Bukti Transfer" onBack={navigation.goBack} />
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
            <Skeleton height={280} radiusSize={radius.xl} />
          ) : isError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat bukti transfer"
                subtitle="Coba lagi sebentar lagi."
              />
              <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
            </View>
          ) : !proof ? (
            <EmptyState
              icon="receipt-outline"
              title="Data tidak ditemukan"
              subtitle="Bukti transfer ini mungkin sudah tidak tersedia."
            />
          ) : (
            <>
              <Receipt
                amount={proof.amount}
                proofFileName={proof.proofFileName}
                rows={[
                  { label: 'Tanggal & Jam', value: formatDateTime(proof.transferredAt) },
                  { label: 'Untuk', value: proof.disbursementTitle ?? '-' },
                  { label: 'Dari', value: 'Staf PPA (Admin)' },
                  { label: 'Bank Pengirim', value: proof.senderBank },
                  { label: 'Rekening Tujuan', value: proof.destAccount },
                  { label: 'No. Referensi', value: proof.referenceNo },
                  {
                    label: 'Status',
                    value: proof.confirmedByParticipant ? 'Dikonfirmasi' : 'Berhasil',
                    accent: true,
                  },
                ]}
              />
              <View style={styles.btnRow}>
                <Button
                  label="Lihat Bukti"
                  variant="ghost"
                  style={styles.btn}
                  onPress={() => setPreviewOpen(true)}
                />
                <Button
                  label={
                    proof.confirmedByParticipant ? 'Sudah Dikonfirmasi' : 'Konfirmasi Terima'
                  }
                  variant="navy"
                  style={styles.btn}
                  disabled={proof.confirmedByParticipant || confirmTransferProof.isPending}
                  loading={confirmTransferProof.isPending}
                  onPress={() => confirmTransferProof.mutate(proof.id)}
                />
              </View>
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <FilePreviewModal
        visible={previewOpen}
        title="Bukti Transfer"
        fileId={proof?.proofFileId}
        fileName={proof?.proofFileName}
        token={token}
        onClose={() => setPreviewOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
});
