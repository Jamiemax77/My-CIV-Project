import { zodResolver } from '@hookform/resolvers/zod';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AdminStackParamList } from '../../app/AdminStack';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ParticipantPicker } from '../../components/ParticipantPicker';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { UploadBox, UploadFile } from '../../components/UploadBox';
import {
  useAddDisbursement,
  useAddTransferProof,
  useAdminParticipants,
  useParticipantAccounts,
  useParticipantDisbursements,
} from '../../hooks/useAdminData';
import { uploadFile } from '../../lib/api';
import { formatAmountInput, formatDate, formatRupiah, parseAmountInput } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { AccountItem, SCHOLARSHIP_TYPES } from '../../types/models';

const PERIODS = ['Genap 2025/2026', 'Ganjil 2025/2026'];

const TUNAI_SENDER_BANK = 'Tunai';
const TUNAI_DEST_ACCOUNT = 'Diserahkan langsung (Tunai)';

function formatAccountLabel(account: AccountItem): string {
  return `${account.provider} - ${account.number} a.n. ${account.holderName}`;
}

type Step = 'data' | 'transfer';

/** What Step 2 (bukti transfer) is being sent for — either a Disbursement created/picked in
 * Step 1, or a disbursement-less "Transaksi Lainnya" note. Carries the fields Step 2 would
 * otherwise have asked for again (participant, amount, title/period). */
type ActiveTarget = {
  disbursementId?: string;
  title: string;
  amount: number;
  note?: string;
  participantId: string;
  participantName: string;
};

const dataSchema = z.object({
  participantId: z.string().min(1, 'Pilih partisipan'),
  program: z.enum(['CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya'], {
    message: 'Pilih program beasiswa',
  }),
  period: z.string(),
  amount: z
    .string()
    .min(1, 'Nominal wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Nominal harus lebih dari 0'),
  note: z.string().optional(),
});
type DataFormValues = z.infer<typeof dataSchema>;

const transferSchema = z
  .object({
    method: z.enum(['transfer', 'tunai']),
    senderBank: z.string().trim().optional(),
    destAccount: z.string().trim().optional(),
    referenceNo: z.string().trim().min(3, 'No. referensi wajib diisi'),
    amount: z.string().optional(),
  })
  .refine((data) => data.method === 'tunai' || (data.senderBank?.trim().length ?? 0) >= 2, {
    message: 'Bank pengirim wajib diisi',
    path: ['senderBank'],
  })
  .refine((data) => data.method === 'tunai' || (data.destAccount?.trim().length ?? 0) >= 4, {
    message: 'Rekening tujuan wajib diisi',
    path: ['destAccount'],
  });
type TransferFormValues = z.infer<typeof transferSchema>;

export function DisbursementScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const route = useRoute<RouteProp<AdminStackParamList, 'Disbursement'>>();
  const token = useAuthStore((s) => s.token);
  const { data: participants, isLoading: participantsLoading } = useAdminParticipants();
  const addDisbursement = useAddDisbursement();
  const addTransferProof = useAddTransferProof();

  const [step, setStep] = useState<Step>('data');
  const [mode, setMode] = useState<'new' | 'existing'>(
    route.params?.initialMode === 'existing' ? 'existing' : 'new'
  );
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null);

  // "existing" mode picks an already-created disbursement (or "+ Transaksi Lainnya") to attach
  // a transfer proof to, instead of creating a new one — plain state, not react-hook-form, since
  // it's a chip selection rather than typed input (same convention as UploadBox's file field).
  const [existingParticipantId, setExistingParticipantId] = useState('');
  const [selectedDisbursementId, setSelectedDisbursementId] = useState('');
  const [otherTransaction, setOtherTransaction] = useState(false);
  const [otherNote, setOtherNote] = useState('');
  const [existingError, setExistingError] = useState<string | null>(null);

  const [file, setFile] = useState<UploadFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const dataForm = useForm<DataFormValues>({
    resolver: zodResolver(dataSchema),
    defaultValues: {
      participantId: '',
      program: SCHOLARSHIP_TYPES[0],
      period: PERIODS[0],
      amount: '',
      note: '',
    },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      method: 'transfer',
      senderBank: 'Bank Mandiri',
      destAccount: '',
      referenceNo: '',
      amount: '',
    },
  });

  useEffect(() => {
    if (!dataForm.getValues('participantId') && participants && participants.length > 0) {
      dataForm.setValue('participantId', participants[0].profile.id);
    }
    if (!existingParticipantId && participants && participants.length > 0) {
      setExistingParticipantId(participants[0].profile.id);
    }
    // Only needs to run once participants finish loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  const { data: existingDisbursements } = useParticipantDisbursements(
    mode === 'existing' ? existingParticipantId || undefined : undefined,
    { needsProof: true }
  );

  const isOther = !activeTarget?.disbursementId;
  const { data: accounts } = useParticipantAccounts(activeTarget?.participantId);
  const method = transferForm.watch('method');

  // Auto-fill destAccount once per participant switch, same rule as before: only when there's
  // exactly one account on file, so we're never silently guessing between several.
  const autoFilledForRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!activeTarget || step !== 'transfer') return;
    if (autoFilledForRef.current === activeTarget.participantId) return;
    if (accounts === undefined) return;
    autoFilledForRef.current = activeTarget.participantId;
    transferForm.setValue('destAccount', accounts.length === 1 ? formatAccountLabel(accounts[0]) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTarget, accounts, step]);

  const submitData = async (values: DataFormValues, advance: boolean) => {
    const participant = participants?.find((p) => p.profile.id === values.participantId)?.profile;
    setSubmitError(null);
    const title = `Pencairan Semester ${values.period.split(' ')[0]}`;
    try {
      const result = await addDisbursement.mutateAsync({
        participantId: values.participantId,
        title,
        amount: parseAmountInput(values.amount),
        period: values.period,
        disbursedAt: new Date().toISOString().slice(0, 10),
        note: values.note,
        status: advance ? 'disbursed' : 'draft',
      });
      if (advance) {
        setActiveTarget({
          disbursementId: result.id,
          title,
          amount: parseAmountInput(values.amount),
          participantId: values.participantId,
          participantName: participant?.fullName ?? '-',
        });
        setSavedMessage(null);
        setStep('transfer');
      } else {
        dataForm.reset({ ...values, amount: '', note: '' });
        setSavedMessage(`Draf pencairan untuk ${participant?.fullName} disimpan.`);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan pencairan.');
    }
  };

  const continueExisting = () => {
    setExistingError(null);
    if (!existingParticipantId) {
      setExistingError('Pilih partisipan');
      return;
    }
    const participant = participants?.find((p) => p.profile.id === existingParticipantId)?.profile;
    if (otherTransaction) {
      if (otherNote.trim().length < 3) {
        setExistingError('Isi keterangan untuk transaksi lainnya');
        return;
      }
      setActiveTarget({
        title: 'Transaksi Lainnya',
        amount: 0,
        note: otherNote.trim(),
        participantId: existingParticipantId,
        participantName: participant?.fullName ?? '-',
      });
      setStep('transfer');
      return;
    }
    const picked = (existingDisbursements ?? []).find((d) => d.id === selectedDisbursementId);
    if (!picked) {
      setExistingError('Pilih pencairan, atau isi keterangan untuk transaksi lainnya');
      return;
    }
    setActiveTarget({
      disbursementId: picked.id,
      title: picked.title,
      amount: picked.amount,
      participantId: existingParticipantId,
      participantName: participant?.fullName ?? '-',
    });
    setStep('transfer');
  };

  const submitTransfer = async (values: TransferFormValues) => {
    if (!activeTarget) return;
    if (!file) {
      setFileError('Unggah lampiran bukti transfer terlebih dahulu');
      return;
    }
    let amount = activeTarget.amount;
    if (isOther) {
      amount = parseAmountInput(values.amount ?? '');
      if (!(amount > 0)) {
        transferForm.setError('amount', { message: 'Nominal wajib diisi' });
        return;
      }
    }
    setFileError(null);
    setSubmitError(null);
    try {
      setUploading(true);
      const uploaded = await uploadFile(file, 'transfer-proof', token, activeTarget.participantId);
      await addTransferProof.mutateAsync({
        participantId: activeTarget.participantId,
        disbursementId: activeTarget.disbursementId,
        note: activeTarget.note,
        amount,
        method: values.method,
        senderBank: values.method === 'tunai' ? TUNAI_SENDER_BANK : (values.senderBank ?? '').trim(),
        destAccount: values.method === 'tunai' ? TUNAI_DEST_ACCOUNT : (values.destAccount ?? '').trim(),
        transferredAt: new Date().toISOString(),
        referenceNo: values.referenceNo.trim(),
        proofFileId: uploaded.fileId,
        proofFileName: uploaded.name,
      });
      setSavedMessage(`Bukti transfer terkirim ke ${activeTarget.participantName}.`);
      setFile(null);
      transferForm.reset({ method: 'transfer', senderBank: 'Bank Mandiri', destAccount: '', referenceNo: '', amount: '' });
      dataForm.reset({ participantId: '', program: SCHOLARSHIP_TYPES[0], period: PERIODS[0], amount: '', note: '' });
      setSelectedDisbursementId('');
      setOtherTransaction(false);
      setOtherNote('');
      autoFilledForRef.current = null;
      setActiveTarget(null);
      setMode('new');
      setStep('data');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal mengirim bukti transfer.');
    } finally {
      setUploading(false);
    }
  };

  const submittingTransfer = uploading || addTransferProof.isPending;
  const canGoBack = navigation.canGoBack();

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header
        variant="admin"
        title="Pencairan Dana"
        onBack={canGoBack ? navigation.goBack : undefined}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ResponsiveContainer>
          {participantsLoading ? (
            <Skeleton height={200} radiusSize={radius.lg} />
          ) : step === 'data' ? (
            <>
              <ChipGroup>
                <Chip label="Pencairan Baru" active={mode === 'new'} onPress={() => setMode('new')} />
                <Chip
                  label="Kirim Bukti untuk Pencairan Tersimpan"
                  active={mode === 'existing'}
                  onPress={() => setMode('existing')}
                />
              </ChipGroup>

              {mode === 'new' ? (
                <View style={styles.gap}>
                  <Controller
                    control={dataForm.control}
                    name="participantId"
                    render={({ field }) => (
                      <ParticipantPicker
                        participants={participants}
                        value={field.value}
                        onChange={field.onChange}
                        error={dataForm.formState.errors.participantId?.message}
                      />
                    )}
                  />

                  <View style={styles.gap}>
                    <Text style={styles.fieldLabel}>Program Beasiswa</Text>
                    <Controller
                      control={dataForm.control}
                      name="program"
                      render={({ field }) => (
                        <ChipGroup>
                          {SCHOLARSHIP_TYPES.map((type) => (
                            <Chip key={type} label={type} active={field.value === type} onPress={() => field.onChange(type)} />
                          ))}
                        </ChipGroup>
                      )}
                    />
                    {dataForm.formState.errors.program ? (
                      <Text style={styles.errorText}>{dataForm.formState.errors.program.message}</Text>
                    ) : null}
                  </View>

                  <Text style={[styles.fieldLabel, styles.gap]}>Periode</Text>
                  <Controller
                    control={dataForm.control}
                    name="period"
                    render={({ field }) => (
                      <ChipGroup>
                        {PERIODS.map((p) => (
                          <Chip key={p} label={p} active={field.value === p} onPress={() => field.onChange(p)} />
                        ))}
                      </ChipGroup>
                    )}
                  />

                  <View style={styles.gap}>
                    <Controller
                      control={dataForm.control}
                      name="amount"
                      render={({ field }) => (
                        <Field
                          label="Nominal Beasiswa (Rp)"
                          keyboardType="numeric"
                          placeholder="0"
                          value={field.value}
                          onChangeText={(text) => field.onChange(formatAmountInput(text))}
                          error={dataForm.formState.errors.amount?.message}
                        />
                      )}
                    />
                  </View>
                  <Field label="Tanggal Pencairan" editable={false} value={formatDate(new Date().toISOString())} />
                  <Controller
                    control={dataForm.control}
                    name="note"
                    render={({ field }) => (
                      <Field
                        label="Catatan"
                        multiline
                        placeholder="Catatan pencairan"
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />

                  {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
                  {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}

                  <View style={styles.btnRow}>
                    <Button
                      label="Simpan Draf"
                      variant="ghost"
                      style={styles.btn}
                      disabled={addDisbursement.isPending}
                      onPress={dataForm.handleSubmit((values) => submitData(values, false))}
                    />
                    <Button
                      label="Lanjut ke Bukti Transfer"
                      variant="navy"
                      style={styles.btn}
                      disabled={addDisbursement.isPending}
                      loading={addDisbursement.isPending}
                      onPress={dataForm.handleSubmit((values) => submitData(values, true))}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.gap}>
                  <ParticipantPicker
                    participants={participants}
                    value={existingParticipantId}
                    onChange={(id) => {
                      setExistingParticipantId(id);
                      setSelectedDisbursementId('');
                      setOtherTransaction(false);
                    }}
                  />

                  <View style={styles.gap}>
                    <Text style={styles.fieldLabel}>Untuk Pencairan</Text>
                    <ChipGroup>
                      {(existingDisbursements ?? []).map((d) => (
                        <Chip
                          key={d.id}
                          label={`${d.title}${d.status === 'draft' ? ' (Draf)' : ''}`}
                          active={!otherTransaction && selectedDisbursementId === d.id}
                          onPress={() => {
                            setOtherTransaction(false);
                            setSelectedDisbursementId(d.id);
                          }}
                        />
                      ))}
                      <Chip
                        label="+ Transaksi Lainnya"
                        active={otherTransaction}
                        onPress={() => {
                          setOtherTransaction(true);
                          setSelectedDisbursementId('');
                        }}
                      />
                    </ChipGroup>
                    {(existingDisbursements ?? []).length === 0 ? (
                      <Text style={styles.hintText}>
                        Tidak ada pencairan yang menunggu bukti transfer untuk partisipan ini.
                      </Text>
                    ) : null}
                  </View>

                  {otherTransaction ? (
                    <View style={styles.gap}>
                      <Field
                        label="Keterangan Transaksi Lainnya"
                        placeholder="cth: Transport & konsumsi kegiatan Youth Cluster"
                        multiline
                        value={otherNote}
                        onChangeText={setOtherNote}
                      />
                    </View>
                  ) : null}
                  {existingError ? <Text style={styles.errorText}>{existingError}</Text> : null}

                  <Button label="Lanjut ke Bukti Transfer" variant="navy" style={styles.gap} onPress={continueExisting} />
                </View>
              )}
            </>
          ) : (
            <>
              <Pressable onPress={() => setStep('data')} style={styles.targetCard}>
                <Text style={styles.targetLabel}>Mengirim bukti untuk</Text>
                <Text style={styles.targetTitle}>
                  {activeTarget?.title} · {activeTarget?.participantName}
                </Text>
                {!isOther ? (
                  <Text style={styles.targetAmount}>{formatRupiah(activeTarget?.amount ?? 0)}</Text>
                ) : null}
                <Text style={styles.targetChange}>Ubah</Text>
              </Pressable>

              {isOther ? (
                <View style={styles.gap}>
                  <Controller
                    control={transferForm.control}
                    name="amount"
                    render={({ field }) => (
                      <Field
                        label="Nominal Transfer (Rp)"
                        keyboardType="numeric"
                        placeholder="0"
                        value={field.value}
                        onChangeText={(text) => field.onChange(formatAmountInput(text))}
                        error={transferForm.formState.errors.amount?.message}
                      />
                    )}
                  />
                </View>
              ) : null}

              {method === 'transfer' ? (
                <>
                  <View style={styles.gap}>
                    <Controller
                      control={transferForm.control}
                      name="senderBank"
                      render={({ field }) => (
                        <Field
                          label="Bank Pengirim"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={transferForm.formState.errors.senderBank?.message}
                        />
                      )}
                    />
                  </View>
                  <View style={styles.gap}>
                    {!accounts ? null : accounts.length === 0 ? (
                      <Text style={styles.warningText}>
                        ⚠ Partisipan ini belum mengisi rekening bank atau e-wallet. Isi rekening tujuan
                        secara manual di bawah, atau minta partisipan melengkapinya dulu di menu
                        Rekening & E-Wallet.
                      </Text>
                    ) : (
                      <ChipGroup>
                        {accounts.map((a) => (
                          <Chip
                            key={a.id}
                            label={`${a.provider} (${a.kind === 'bank' ? 'Bank' : 'E-Wallet'})`}
                            active={transferForm.watch('destAccount') === formatAccountLabel(a)}
                            onPress={() => transferForm.setValue('destAccount', formatAccountLabel(a))}
                          />
                        ))}
                      </ChipGroup>
                    )}
                    {/* Single "Rekening Tujuan" field — the chips above are just a quick-pick
                        shortcut into it, not a second independent field. */}
                    <Controller
                      control={transferForm.control}
                      name="destAccount"
                      render={({ field }) => (
                        <Field
                          label="Rekening Tujuan"
                          placeholder="cth: BRI - 1234567890 a.n. Budi Santoso"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={transferForm.formState.errors.destAccount?.message}
                          style={accounts && accounts.length > 0 ? styles.gap : undefined}
                        />
                      )}
                    />
                  </View>
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
              <Field label="Tanggal Transfer" editable={false} value={formatDate(new Date().toISOString())} />

              <View style={styles.gap}>
                <Text style={styles.fieldLabel}>Metode Pembayaran</Text>
                <Controller
                  control={transferForm.control}
                  name="method"
                  render={({ field }) => (
                    <ChipGroup>
                      <Chip label="Transfer" active={field.value === 'transfer'} onPress={() => field.onChange('transfer')} />
                      <Chip label="Tunai" active={field.value === 'tunai'} onPress={() => field.onChange('tunai')} />
                    </ChipGroup>
                  )}
                />
              </View>
              <Controller
                control={transferForm.control}
                name="referenceNo"
                render={({ field }) => (
                  <Field
                    label={method === 'tunai' ? 'No. Kwitansi / Referensi' : 'No. Referensi'}
                    placeholder={method === 'tunai' ? 'KWT20260220-0091' : 'TRX20260220-0091'}
                    value={field.value}
                    onChangeText={field.onChange}
                    error={transferForm.formState.errors.referenceNo?.message}
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
              {savedMessage ? <Text style={styles.success}>{savedMessage}</Text> : null}

              <Button
                label={submittingTransfer ? 'Mengirim...' : 'Kirim ke Partisipan'}
                variant="navy"
                onPress={transferForm.handleSubmit(submitTransfer)}
                disabled={submittingTransfer}
                loading={submittingTransfer}
              />
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>
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
  gap: {
    marginTop: 13,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  warningText: {
    fontSize: 13,
    color: colors.warning,
    lineHeight: 16,
  },
  hintText: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 16,
  },
  success: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 4,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 13,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
  targetCard: {
    backgroundColor: colors.skySoft,
    borderRadius: radius.lg,
    padding: 14,
  },
  targetLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  targetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 2,
  },
  targetAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy,
    marginTop: 4,
  },
  targetChange: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.blue,
    marginTop: 8,
  },
});
