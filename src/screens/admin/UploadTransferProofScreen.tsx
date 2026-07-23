import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { UploadBox, UploadFile } from '../../components/UploadBox';
import {
  useAddTransferProof,
  useAdminParticipants,
  useParticipantAccounts,
  useParticipantDisbursements,
} from '../../hooks/useAdminData';
import { uploadFile } from '../../lib/api';
import { formatAmountInput, formatDate, parseAmountInput } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

const schema = z.object({
  participantId: z.string().min(1, 'Pilih partisipan'),
  disbursementId: z.string().min(1, 'Pilih pencairan'),
  amount: z
    .string()
    .min(1, 'Nominal wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Nominal harus lebih dari 0'),
  senderBank: z.string().trim().min(2, 'Bank pengirim wajib diisi'),
  destAccount: z.string().trim().min(4, 'Rekening tujuan wajib diisi'),
  referenceNo: z.string().trim().min(3, 'No. referensi wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

export function UploadTransferProofScreen() {
  const navigation = useNavigation();
  const token = useAuthStore((s) => s.token);
  const { data: participants } = useAdminParticipants();
  const addTransferProof = useAddTransferProof();

  const [file, setFile] = useState<UploadFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      participantId: '',
      disbursementId: '',
      amount: '',
      senderBank: 'Bank Mandiri',
      destAccount: '',
      referenceNo: '',
    },
  });

  useEffect(() => {
    if (!watch('participantId') && participants && participants.length > 0) {
      setValue('participantId', participants[0].profile.id);
    }
  }, [participants, watch, setValue]);

  const participantId = watch('participantId');
  const { data: participantDisbursements } = useParticipantDisbursements(participantId || undefined);
  const { data: participantAccounts } = useParticipantAccounts(participantId || undefined);

  useEffect(() => {
    if (!participantId) return;
    const first = participantDisbursements?.[0];
    setValue('disbursementId', first?.id ?? '');
    const primaryAccount = participantAccounts?.find((a) => a.isPrimary);
    setValue(
      'destAccount',
      primaryAccount
        ? `${primaryAccount.provider} •••• ${primaryAccount.number.slice(-4)}`
        : ''
    );
    // Keyed only on participantId so unrelated data refreshes don't reset edited fields.
  }, [participantId]);

  const onSubmit = async (values: FormValues) => {
    if (!file) {
      setFileError('Unggah lampiran bukti transfer terlebih dahulu');
      return;
    }
    setFileError(null);
    setSubmitError(null);

    try {
      setUploading(true);
      const uploaded = await uploadFile(file, 'transfer-proof', token, values.participantId);
      await addTransferProof.mutateAsync({
        participantId: values.participantId,
        disbursementId: values.disbursementId,
        amount: parseAmountInput(values.amount),
        senderBank: values.senderBank.trim(),
        destAccount: values.destAccount.trim(),
        transferredAt: new Date().toISOString(),
        referenceNo: values.referenceNo.trim(),
        proofFileId: uploaded.fileId,
        proofFileName: uploaded.name,
      });
      setFile(null);
      reset({ ...values, amount: '', referenceNo: '' });
      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim bukti transfer.');
    } finally {
      setUploading(false);
    }
  };

  const submitting = uploading || addTransferProof.isPending;

  return (
    <View style={styles.screen}>
      <Header
        variant="admin"
        title="Kirim Bukti Transfer"
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
        <Text style={styles.fieldLabel}>Kepada Partisipan</Text>
        <Controller
          control={control}
          name="participantId"
          render={({ field }) => (
            <ChipGroup>
              {(participants ?? []).map((p) => (
                <Chip
                  key={p.profile.id}
                  label={`${p.profile.fullName} — ${p.profile.idNumber}`}
                  active={field.value === p.profile.id}
                  onPress={() => field.onChange(p.profile.id)}
                />
              ))}
            </ChipGroup>
          )}
        />

        <View style={styles.gap}>
          <Text style={styles.fieldLabel}>Untuk Pencairan</Text>
          <Controller
            control={control}
            name="disbursementId"
            render={({ field }) => (
              <ChipGroup>
                {(participantDisbursements ?? []).map((d) => (
                  <Chip
                    key={d.id}
                    label={d.title}
                    active={field.value === d.id}
                    onPress={() => field.onChange(d.id)}
                  />
                ))}
              </ChipGroup>
            )}
          />
          {errors.disbursementId ? (
            <Text style={styles.errorText}>{errors.disbursementId.message}</Text>
          ) : null}
        </View>

        <View style={styles.gap}>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Field
                label="Nominal Transfer (Rp)"
                keyboardType="numeric"
                placeholder="0"
                value={field.value}
                onChangeText={(text) => field.onChange(formatAmountInput(text))}
                error={errors.amount?.message}
              />
            )}
          />
        </View>
        <Controller
          control={control}
          name="senderBank"
          render={({ field }) => (
            <Field
              label="Bank Pengirim"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.senderBank?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="destAccount"
          render={({ field }) => (
            <Field
              label="Rekening Tujuan"
              placeholder="cth: BRI •••• 4821 (Nama)"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.destAccount?.message}
            />
          )}
        />
        <Field
          label="Tanggal Transfer"
          editable={false}
          value={formatDate(new Date().toISOString())}
        />
        <Controller
          control={control}
          name="referenceNo"
          render={({ field }) => (
            <Field
              label="No. Referensi"
              placeholder="TRX20260220-0091"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.referenceNo?.message}
            />
          )}
        />

        <Text style={styles.fieldLabel}>Lampiran Bukti Transfer</Text>
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

        {sent ? (
          <Text style={styles.success}>
            Bukti transfer terkirim ke partisipan.
          </Text>
        ) : null}

        <Button
          label={submitting ? 'Mengirim...' : 'Kirim ke Partisipan'}
          variant="navy"
          onPress={handleSubmit(onSubmit)}
          disabled={submitting}
          loading={submitting}
        />
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  gap: {
    marginTop: 13,
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
