import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { Header } from '../../components/Header';
import { ListItem } from '../../components/ListItem';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { UploadBox, UploadFile } from '../../components/UploadBox';
import { useAddReimbursement, useReimbursements } from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { formatAmountInput, formatRupiah, parseAmountInput } from '../../lib/format';
import { REIMBURSEMENT_CATEGORY_LABEL } from '../../lib/labels';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { ReimbursementCategory, ReimbursementItem, ReimbursementType } from '../../types/models';

const STATUS_LABEL: Record<ReimbursementItem['status'], string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const CATEGORIES = Object.entries(REIMBURSEMENT_CATEGORY_LABEL) as Array<
  [ReimbursementCategory, string]
>;

const schema = z.object({
  type: z.enum(['reimburse', 'return']),
  category: z.enum(['ukt', 'buku', 'alat', 'lainnya']),
  amount: z
    .string()
    .min(1, 'Nominal wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Nominal harus lebih dari 0'),
  description: z.string().trim().min(5, 'Keterangan minimal 5 karakter'),
});

type FormValues = z.infer<typeof schema>;

export function ReimbursementScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const addReimbursement = useAddReimbursement();
  const { data: history, isLoading: historyLoading } = useReimbursements();

  const [file, setFile] = useState<UploadFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<ReimbursementItem | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'reimburse', category: 'ukt', amount: '', description: '' },
  });

  const categoryValue = watch('category');

  const onSubmit = async (values: FormValues) => {
    if (!file) {
      setFileError('Unggah bukti terlebih dahulu');
      return;
    }
    if (!user) return;
    setFileError(null);
    setSubmitError(null);

    try {
      setUploading(true);
      const uploaded = await uploadFile(file, 'reimbursement', token, user.id);
      await addReimbursement.mutateAsync({
        type: values.type,
        category: values.category,
        amount: parseAmountInput(values.amount),
        description: values.description.trim(),
        proofFileId: uploaded.fileId,
        proofFileName: uploaded.name,
      });
      reset({ type: values.type, category: values.category, amount: '', description: '' });
      setFile(null);
      setSubmitted(true);
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
        <Text style={styles.label}>Jenis Pengajuan</Text>
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <ChipGroup>
              <Chip
                label="Reimbursement"
                active={field.value === 'reimburse' && categoryValue !== 'lainnya'}
                onPress={() => field.onChange('reimburse' as ReimbursementType)}
              />
              <Chip
                label="Pengembalian Sisa"
                active={field.value === 'return'}
                onPress={() => field.onChange('return' as ReimbursementType)}
              />
              <Chip
                label="Transaksi Lainnya"
                active={field.value === 'reimburse' && categoryValue === 'lainnya'}
                onPress={() => {
                  field.onChange('reimburse' as ReimbursementType);
                  setValue('category', 'lainnya');
                }}
              />
            </ChipGroup>
          )}
        />

        <View style={styles.fieldGap}>
          <Text style={styles.fieldLabel}>Kategori</Text>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <View style={styles.categoryRow}>
                {CATEGORIES.map(([key, cat]) => (
                  <Chip
                    key={key}
                    label={cat}
                    active={field.value === key}
                    onPress={() => field.onChange(key)}
                  />
                ))}
              </View>
            )}
          />
        </View>

        <Controller
          control={control}
          name="amount"
          render={({ field }) => (
            <Field
              label="Nominal (Rp)"
              keyboardType="numeric"
              placeholder="0"
              value={field.value}
              onChangeText={(text) => field.onChange(formatAmountInput(text))}
              error={errors.amount?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <Field
              label="Keterangan"
              multiline
              placeholder="Jelaskan penggunaan dana"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.description?.message}
            />
          )}
        />

        <Text style={styles.fieldLabel}>Bukti (Nota / Kwitansi / Bukti Bayar)</Text>
        <UploadBox
          mode="both"
          value={file}
          onChange={(f) => {
            setFile(f);
            if (f) setFileError(null);
          }}
        />
        {fileError ? <Text style={styles.errorText}>{fileError}</Text> : null}
        {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

        {submitted ? (
          <Text style={styles.success}>
            Pengajuan terkirim, menunggu verifikasi admin.
          </Text>
        ) : null}

        <Button
          label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          loading={submitting}
        />

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
              title={`${REIMBURSEMENT_CATEGORY_LABEL[item.category]} · ${formatRupiah(item.amount)}`}
              subtitle={item.description}
              onPress={() => setPreviewTarget(item)}
              right={<Badge status={item.status} label={STATUS_LABEL[item.status]} />}
            />
          ))
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
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  fieldGap: {
    marginTop: 16,
    marginBottom: 13,
  },
  historyTitle: {
    marginTop: 24,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  success: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
});
