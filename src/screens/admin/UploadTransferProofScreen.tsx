import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { AccountItem } from '../../types/models';

/** Full, unmasked account details an admin needs to actually perform the transfer. */
function formatAccountLabel(account: AccountItem): string {
  return `${account.provider} - ${account.number} a.n. ${account.holderName}`;
}

// Fixed values used for a cash handover — sender_bank/dest_account stay required at the DB
// level either way, so these fill in for the fields that don't apply when no bank is involved.
const TUNAI_SENDER_BANK = 'Tunai';
const TUNAI_DEST_ACCOUNT = 'Diserahkan langsung (Tunai)';

const schema = z
  .object({
    participantId: z.string().min(1, 'Pilih partisipan'),
    disbursementId: z.string().optional(),
    note: z.string().trim().optional(),
    amount: z
      .string()
      .min(1, 'Nominal wajib diisi')
      .refine((v) => parseAmountInput(v) > 0, 'Nominal harus lebih dari 0'),
    method: z.enum(['transfer', 'tunai']),
    senderBank: z.string().trim().optional(),
    destAccount: z.string().trim().optional(),
    referenceNo: z.string().trim().min(3, 'No. referensi wajib diisi'),
  })
  .refine((data) => !!data.disbursementId || (data.note?.trim().length ?? 0) >= 3, {
    message: 'Pilih pencairan, atau isi keterangan untuk transaksi lainnya',
    path: ['disbursementId'],
  })
  .refine((data) => data.method === 'tunai' || (data.senderBank?.trim().length ?? 0) >= 2, {
    message: 'Bank pengirim wajib diisi',
    path: ['senderBank'],
  })
  .refine((data) => data.method === 'tunai' || (data.destAccount?.trim().length ?? 0) >= 4, {
    message: 'Rekening tujuan wajib diisi',
    path: ['destAccount'],
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
  const [otherTransaction, setOtherTransaction] = useState(false);

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
      note: '',
      amount: '',
      method: 'transfer',
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
  const method = watch('method');
  const { data: participantDisbursements } = useParticipantDisbursements(participantId || undefined);
  const { data: participantAccounts } = useParticipantAccounts(participantId || undefined);

  // Auto-fill once per participant switch, using freshest data — not on every dep change,
  // since participantDisbursements/participantAccounts also refetch in the background
  // (focus refetch, other mutations invalidating the query) and re-running on every one of
  // those would clobber whatever the admin has since typed/edited by hand.
  const autoFilledForRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!participantId) return;
    if (autoFilledForRef.current === participantId) return;
    if (participantDisbursements === undefined || participantAccounts === undefined) return;
    autoFilledForRef.current = participantId;

    setOtherTransaction(false);
    setValue('disbursementId', participantDisbursements[0]?.id ?? '');
    setValue('note', '');
    setValue(
      'destAccount',
      participantAccounts.length === 1 ? formatAccountLabel(participantAccounts[0]) : ''
    );
  }, [participantId, participantDisbursements, participantAccounts, setValue]);

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
        disbursementId: values.disbursementId || undefined,
        note: values.note?.trim() || undefined,
        amount: parseAmountInput(values.amount),
        method: values.method,
        senderBank: values.method === 'tunai' ? TUNAI_SENDER_BANK : (values.senderBank ?? '').trim(),
        destAccount:
          values.method === 'tunai' ? TUNAI_DEST_ACCOUNT : (values.destAccount ?? '').trim(),
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        variant="admin"
        title="Kirim Bukti Transfer"
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
                    active={!otherTransaction && field.value === d.id}
                    onPress={() => {
                      setOtherTransaction(false);
                      field.onChange(d.id);
                    }}
                  />
                ))}
                <Chip
                  label="+ Transaksi Lainnya"
                  active={otherTransaction}
                  onPress={() => {
                    setOtherTransaction(true);
                    field.onChange('');
                  }}
                />
              </ChipGroup>
            )}
          />
          {otherTransaction ? (
            <View style={styles.gap}>
              <Controller
                control={control}
                name="note"
                render={({ field }) => (
                  <Field
                    label="Keterangan Transaksi Lainnya"
                    placeholder="cth: Transport & konsumsi kegiatan Youth Cluster"
                    multiline
                    value={field.value}
                    onChangeText={field.onChange}
                  />
                )}
              />
            </View>
          ) : null}
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
        {method === 'transfer' ? (
          <>
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
            <View style={styles.gap}>
              <Text style={styles.fieldLabel}>Rekening Tujuan Partisipan</Text>
              {!participantAccounts ? null : participantAccounts.length === 0 ? (
                <Text style={styles.warningText}>
                  ⚠ Partisipan ini belum mengisi rekening bank atau e-wallet. Isi rekening tujuan
                  secara manual di bawah, atau minta partisipan melengkapinya dulu di menu
                  Rekening & E-Wallet.
                </Text>
              ) : (
                <ChipGroup>
                  {participantAccounts.map((a) => (
                    <Chip
                      key={a.id}
                      label={`${a.provider} (${a.kind === 'bank' ? 'Bank' : 'E-Wallet'})`}
                      active={watch('destAccount') === formatAccountLabel(a)}
                      onPress={() => setValue('destAccount', formatAccountLabel(a))}
                    />
                  ))}
                </ChipGroup>
              )}
            </View>
            <Controller
              control={control}
              name="destAccount"
              render={({ field }) => (
                <Field
                  label="Rekening Tujuan"
                  placeholder="cth: BRI - 1234567890 a.n. Budi Santoso"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.destAccount?.message}
                />
              )}
            />
          </>
        ) : (
          <View style={styles.gap}>
            <Text style={styles.fieldLabel}>Penerimaan Tunai</Text>
            <Text style={styles.hintText}>
              Partisipan menerima dana secara tunai langsung dari bendahara — bank pengirim dan
              rekening tujuan tidak diperlukan.
            </Text>
          </View>
        )}
        <Field
          label="Tanggal Transfer"
          editable={false}
          value={formatDate(new Date().toISOString())}
        />

        <View style={styles.gap}>
          <Text style={styles.fieldLabel}>Metode Pembayaran</Text>
          <Controller
            control={control}
            name="method"
            render={({ field }) => (
              <ChipGroup>
                <Chip
                  label="Transfer"
                  active={field.value === 'transfer'}
                  onPress={() => field.onChange('transfer')}
                />
                <Chip
                  label="Tunai"
                  active={field.value === 'tunai'}
                  onPress={() => field.onChange('tunai')}
                />
              </ChipGroup>
            )}
          />
        </View>
        <Controller
          control={control}
          name="referenceNo"
          render={({ field }) => (
            <Field
              label={method === 'tunai' ? 'No. Kwitansi / Referensi' : 'No. Referensi'}
              placeholder={method === 'tunai' ? 'KWT20260220-0091' : 'TRX20260220-0091'}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.referenceNo?.message}
            />
          )}
        />

        <Text style={styles.fieldLabel}>
          {method === 'tunai' ? 'Lampiran Bukti Tanda Terima Tunai' : 'Lampiran Bukti Transfer'}
        </Text>
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
    </KeyboardAvoidingView>
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
  warningText: {
    fontSize: 11,
    color: colors.warning,
    lineHeight: 16,
  },
  hintText: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
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
