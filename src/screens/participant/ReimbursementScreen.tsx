import React, { useReducer, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { Header } from '../../components/Header';
import { ListItem } from '../../components/ListItem';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { useAddReimbursement, useReimbursements } from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { formatRupiah } from '../../lib/format';
import { generateNomorPengajuan, JenisPengajuanKode } from '../../lib/generateNomorPengajuan';
import { REIMBURSEMENT_CATEGORY_LABEL } from '../../lib/labels';
import { FormPengajuan, FormPengajuanSubmitValues } from './reimbursement/FormPengajuan';
import { StepPemilihan } from './reimbursement/StepPemilihan';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { ReimbursementCategory, ReimbursementItem } from '../../types/models';

const STATUS_LABEL: Record<ReimbursementItem['status'], string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

type WizardStep = 'pemilihan' | 'form';

type WizardState = {
  step: WizardStep;
  jenis: JenisPengajuanKode | null;
  kategori: ReimbursementCategory | null;
  nomorPengajuan: string | null;
};

type WizardAction =
  | { type: 'SET_JENIS'; jenis: JenisPengajuanKode }
  | { type: 'SET_KATEGORI'; kategori: ReimbursementCategory }
  | { type: 'BUAT_PENGAJUAN'; nomorPengajuan: string }
  | { type: 'KEMBALI' }
  | { type: 'RESET' };

const initialState: WizardState = {
  step: 'pemilihan',
  jenis: null,
  kategori: null,
  nomorPengajuan: null,
};

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_JENIS':
      // Changing jenis after a kategori was already picked doesn't invalidate it — Kategori
      // is an independent pill, not a value scoped to a specific jenis.
      return { ...state, jenis: action.jenis };
    case 'SET_KATEGORI':
      return { ...state, kategori: action.kategori };
    case 'BUAT_PENGAJUAN':
      return { ...state, step: 'form', nomorPengajuan: action.nomorPengajuan };
    case 'KEMBALI':
      return { ...state, step: 'pemilihan' };
    case 'RESET':
      return initialState;
  }
}

export function ReimbursementScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const addReimbursement = useAddReimbursement();
  const { data: history, isLoading: historyLoading } = useReimbursements();

  const [wizard, dispatch] = useReducer(wizardReducer, initialState);
  const [creatingNomor, setCreatingNomor] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ReimbursementItem | null>(null);

  const onBuatPengajuan = async () => {
    if (!wizard.jenis) return;
    setCreatingNomor(true);
    try {
      const nomor = await generateNomorPengajuan(wizard.jenis);
      dispatch({ type: 'BUAT_PENGAJUAN', nomorPengajuan: nomor });
    } finally {
      setCreatingNomor(false);
    }
  };

  const onSubmitForm = async (values: FormPengajuanSubmitValues) => {
    if (!user || !wizard.jenis || !wizard.kategori) return;
    setSubmitError(null);
    setSuccessMessage(null);
    try {
      setUploading(true);
      // NOTE(backend integration): two sequential multipart uploads against the existing
      // POST /files endpoint, then one POST /participant/reimbursements carrying both
      // resulting fileIds — see migration 008 for the usage_proof_* columns this relies on.
      const uploadedProof = await uploadFile(values.proof, 'reimbursement', token, user.id);
      const uploadedUsageProof = await uploadFile(values.usageProof, 'reimbursement', token, user.id);
      await addReimbursement.mutateAsync({
        type: wizard.jenis === 'lainnya' ? 'reimburse' : wizard.jenis,
        category: wizard.kategori,
        amount: values.amount,
        description: values.description,
        nomorPengajuan: wizard.nomorPengajuan ?? undefined,
        proofFileId: uploadedProof.fileId,
        proofFileName: uploadedProof.name,
        usageProofFileId: uploadedUsageProof.fileId,
        usageProofFileName: uploadedUsageProof.name,
      });
      setSuccessMessage(`Pengajuan ${wizard.nomorPengajuan} terkirim, menunggu verifikasi admin.`);
      dispatch({ type: 'RESET' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim pengajuan.');
    } finally {
      setUploading(false);
    }
  };

  const submitting = uploading || addReimbursement.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Ajukan Pengembalian" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
          {wizard.step === 'pemilihan' ? (
            <>
              <StepPemilihan
                jenis={wizard.jenis}
                kategori={wizard.kategori}
                onSelectJenis={(jenis) => dispatch({ type: 'SET_JENIS', jenis })}
                onSelectKategori={(kategori) => dispatch({ type: 'SET_KATEGORI', kategori })}
                onBuatPengajuan={onBuatPengajuan}
                creating={creatingNomor}
              />

              {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

              <Text style={[styles.fieldLabel, styles.historyTitle]}>Riwayat Pengajuan</Text>
              {historyLoading ? (
                <Skeleton height={54} radiusSize={radius.md} />
              ) : !history || history.length === 0 ? (
                <EmptyState
                  icon="receipt-outline"
                  title="Belum ada pengajuan"
                  subtitle="Riwayat klaim keuanganmu akan muncul di sini."
                />
              ) : (
                history.map((item) => (
                  <ListItem
                    key={item.id}
                    icon="receipt"
                    iconBg={colors.skySoft}
                    iconColor={colors.blue}
                    title={`${item.nomorPengajuan ? `${item.nomorPengajuan} · ` : ''}${REIMBURSEMENT_CATEGORY_LABEL[item.category]} · ${formatRupiah(item.amount)}`}
                    subtitle={item.description}
                    onPress={() => setPreviewTarget(item)}
                    right={<Badge status={item.status} label={STATUS_LABEL[item.status]} />}
                  />
                ))
              )}
            </>
          ) : (
            <FormPengajuan
              nomorPengajuan={wizard.nomorPengajuan ?? ''}
              onKembali={() => dispatch({ type: 'KEMBALI' })}
              onSubmit={onSubmitForm}
              submitting={submitting}
              submitError={submitError}
            />
          )}
        </ResponsiveContainer>
      </ScrollView>

      <FilePreviewModal
        visible={!!previewTarget}
        title="Bukti Pengajuan"
        fileId={previewTarget?.proofFileId}
        fileName={previewTarget?.proofFileName}
        token={token}
        onClose={() => setPreviewTarget(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  historyTitle: {
    marginTop: 24,
  },
  success: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
});
