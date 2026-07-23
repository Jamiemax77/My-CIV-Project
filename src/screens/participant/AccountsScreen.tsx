import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { BankLogoBadge, EwalletLogoBadge } from '../../components/AccountLogoBadge';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Dropdown } from '../../components/Dropdown';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import {
  useAccounts,
  useAddAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '../../hooks/useParticipantData';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { AccountItem, AccountKind } from '../../types/models';

const KIND_LABEL: Record<AccountKind, string> = {
  bank: 'Rekening Bank',
  ewallet: 'E-Wallet',
};

const ALL_KINDS: AccountKind[] = ['bank', 'ewallet'];
const KNOWN_EWALLET_PROVIDERS = ['GoPay', 'DANA', 'OVO'];
const EWALLET_DROPDOWN_OPTIONS = [...KNOWN_EWALLET_PROVIDERS, 'Lainnya'];
const KNOWN_BANK_PROVIDERS = ['BRI', 'Mandiri', 'CIMB Niaga', 'BCA'];
const BANK_DROPDOWN_OPTIONS = [...KNOWN_BANK_PROVIDERS, 'Lainnya'];

function maskNumber(number: string) {
  const tail = number.slice(-4);
  return `•••• •••• ${tail}`;
}

const schema = z.object({
  kind: z.enum(['bank', 'ewallet']),
  provider: z.string().trim().min(2, 'Nama bank / e-wallet wajib diisi'),
  number: z.string().trim().min(4, 'Nomor tujuan minimal 4 digit'),
  holderName: z.string().trim().min(2, 'Atas nama wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

export function AccountsScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const { data: accountsData, isLoading, isError, refetch, isRefetching } = useAccounts();
  const accounts = accountsData ?? [];
  const addAccount = useAddAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const missingKinds = useMemo(
    () => ALL_KINDS.filter((k) => !accounts.some((a) => a.kind === k)),
    [accounts]
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [ewalletCustomMode, setEwalletCustomMode] = useState(false);
  const [bankCustomMode, setBankCustomMode] = useState(false);

  const formOpen = editingId !== null || formVisible;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      kind: missingKinds[0] ?? 'bank',
      provider: '',
      number: '',
      holderName: user?.fullName ?? '',
    },
  });

  const loadForKind = (kind: AccountKind) => {
    const existing = accounts.find((a) => a.kind === kind);
    if (existing) {
      reset({
        kind,
        provider: existing.provider,
        number: existing.number,
        holderName: existing.holderName,
      });
      setEditingId(existing.id);
      setEwalletCustomMode(
        kind === 'ewallet' && !KNOWN_EWALLET_PROVIDERS.includes(existing.provider)
      );
      setBankCustomMode(kind === 'bank' && !KNOWN_BANK_PROVIDERS.includes(existing.provider));
    } else {
      reset({ kind, provider: '', number: '', holderName: user?.fullName ?? '' });
      setEditingId(null);
      setEwalletCustomMode(false);
      setBankCustomMode(false);
    }
    setSaved(false);
    setFormError(null);
  };

  const openAddForm = () => {
    loadForKind(missingKinds[0] ?? 'bank');
    setFormVisible(true);
  };

  const closeForm = () => {
    setEditingId(null);
    setFormVisible(false);
    setSaved(false);
    setEwalletCustomMode(false);
    setBankCustomMode(false);
  };

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    const patch = {
      provider: values.provider.trim(),
      number: values.number.trim(),
      holderName: values.holderName.trim(),
    };
    setFormError(null);

    try {
      if (editingId) {
        await updateAccount.mutateAsync({ id: editingId, ...patch });
        setEditingId(null);
        setSaved(true);
        return;
      }

      await addAccount.mutateAsync({ kind: values.kind, ...patch });
      setFormVisible(false);
      setSaved(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan rekening.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await deleteAccount.mutateAsync(target.id);
    if (editingId === target.id) {
      closeForm();
    }
  };

  const submitting = addAccount.isPending || updateAccount.isPending;

  return (
    <View style={styles.screen}>
      <Header title="Rekening & E-Wallet" onBack={navigation.goBack} />
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
        <Text style={styles.sectionTitle}>Rekening Tujuan Pencairan</Text>
        {isLoading ? (
          <View>
            <Skeleton height={140} radiusSize={radius.xl} />
          </View>
        ) : isError ? (
          <View>
            <EmptyState
              icon="cloud-offline-outline"
              title="Gagal memuat rekening"
              subtitle="Coba lagi sebentar lagi."
            />
            <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
          </View>
        ) : accounts.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title="Belum ada rekening"
            subtitle="Tambahkan rekening bank atau e-wallet di bawah ini."
          />
        ) : (
          accounts.map((acc) => (
            <View
              key={acc.id}
              style={[styles.acctCard, acc.kind === 'ewallet' && styles.acctCardEwallet]}
            >
              <View style={styles.acctTopRow}>
                <View
                  style={[
                    styles.acctIcoWrap,
                    { backgroundColor: acc.kind === 'bank' ? colors.skySoft : '#efe7fb' },
                  ]}
                >
                  <Ionicons
                    name={acc.kind === 'bank' ? 'card-outline' : 'wallet-outline'}
                    size={16}
                    color={acc.kind === 'bank' ? colors.blue : colors.royal}
                  />
                </View>
                <View style={styles.acctTopRowMain}>
                  <Text style={styles.acctType}>{KIND_LABEL[acc.kind]}</Text>
                  {acc.isPrimary ? (
                    <View style={styles.acctTag}>
                      <Text style={styles.acctTagText}>UTAMA</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.acctInfoRow}>
                <View style={styles.acctInfoMain}>
                  <Text style={styles.acctProvider}>{acc.provider}</Text>
                  <Text style={styles.acctNumber}>
                    {acc.kind === 'bank' ? maskNumber(acc.number) : acc.number}
                  </Text>
                  <Text style={styles.acctName}>a.n. {acc.holderName}</Text>
                </View>
                {acc.kind === 'ewallet' ? (
                  <EwalletLogoBadge provider={acc.provider} width={120} height={49} />
                ) : (
                  <BankLogoBadge provider={acc.provider} width={120} height={49} />
                )}
              </View>

              <View style={styles.acctActions}>
                <Pressable style={styles.acctActionBtn} onPress={() => loadForKind(acc.kind)}>
                  <Ionicons name="create-outline" size={14} color={colors.navy} />
                  <Text style={styles.acctActionText}>Ubah</Text>
                </Pressable>
                <Pressable style={styles.acctActionBtn} onPress={() => setDeleteTarget(acc)}>
                  <Ionicons name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.acctActionText, styles.acctActionTextDanger]}>Hapus</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {!formOpen && saved ? (
          <Text style={styles.success}>Rekening berhasil disimpan.</Text>
        ) : null}

        {!formOpen && missingKinds.length > 0 ? (
          <Button
            label={`+ Tambah ${KIND_LABEL[missingKinds[0]]}`}
            variant="ghost"
            style={styles.addAccountBtn}
            onPress={openAddForm}
          />
        ) : null}

        {formOpen ? (
          <>
            <View style={styles.formHeaderRow}>
              <Text style={styles.sectionTitle}>
                {editingId ? `Ubah ${KIND_LABEL[watch('kind')]}` : 'Tambah Rekening'}
              </Text>
              <Pressable onPress={closeForm} hitSlop={8}>
                <Text style={styles.cancelLink}>Batal</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Jenis</Text>
            <Controller
              control={control}
              name="kind"
              render={({ field }) => (
                <ChipGroup>
                  <Chip
                    label="Rekening Bank"
                    active={field.value === 'bank'}
                    onPress={() => loadForKind('bank')}
                  />
                  <Chip
                    label="E-Wallet"
                    active={field.value === 'ewallet'}
                    onPress={() => loadForKind('ewallet')}
                  />
                </ChipGroup>
              )}
            />
            <Text style={styles.limitHint}>Maks. 1 rekening bank dan 1 e-wallet.</Text>

            <View style={styles.gap}>
              <Controller
                control={control}
                name="provider"
                render={({ field }) =>
                  watch('kind') === 'ewallet' ? (
                    <>
                      <Dropdown
                        label="Nama E-Wallet"
                        placeholder="Pilih e-wallet"
                        value={ewalletCustomMode ? 'Lainnya' : field.value}
                        options={EWALLET_DROPDOWN_OPTIONS}
                        onChange={(v) => {
                          if (v === 'Lainnya') {
                            setEwalletCustomMode(true);
                            field.onChange('');
                          } else {
                            setEwalletCustomMode(false);
                            field.onChange(v);
                          }
                        }}
                        error={errors.provider?.message}
                      />
                      {ewalletCustomMode ? (
                        <Field
                          label="Nama E-Wallet Lainnya"
                          placeholder="cth: LinkAja"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={errors.provider?.message}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <Dropdown
                        label="Nama Bank"
                        placeholder="Pilih bank"
                        value={bankCustomMode ? 'Lainnya' : field.value}
                        options={BANK_DROPDOWN_OPTIONS}
                        onChange={(v) => {
                          if (v === 'Lainnya') {
                            setBankCustomMode(true);
                            field.onChange('');
                          } else {
                            setBankCustomMode(false);
                            field.onChange(v);
                          }
                        }}
                        error={errors.provider?.message}
                      />
                      {bankCustomMode ? (
                        <Field
                          label="Nama Bank Lainnya"
                          placeholder="cth: Bank Permata"
                          value={field.value}
                          onChangeText={field.onChange}
                          error={errors.provider?.message}
                        />
                      ) : null}
                    </>
                  )
                }
              />
            </View>
            <Controller
              control={control}
              name="number"
              render={({ field }) => (
                <Field
                  label="Nomor Rekening / Nomor Wallet"
                  placeholder="Masukkan nomor tujuan"
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.number?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="holderName"
              render={({ field }) => (
                <Field
                  label="Atas Nama"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.holderName?.message}
                />
              )}
            />
            <Text style={styles.hint}>
              Pastikan nama sesuai identitas untuk mempercepat verifikasi
              pencairan.
            </Text>
            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
            <Button
              label={submitting ? 'Menyimpan...' : editingId ? 'Perbarui Rekening' : 'Simpan Rekening'}
              onPress={handleSubmit(onSubmit)}
              disabled={submitting}
              loading={submitting}
            />
          </>
        ) : null}
        </ResponsiveContainer>
      </ScrollView>

      <ConfirmModal
        visible={!!deleteTarget}
        title="Hapus Rekening"
        message={
          deleteTarget
            ? `Yakin ingin menghapus ${KIND_LABEL[deleteTarget.kind].toLowerCase()} "${deleteTarget.provider}"?`
            : ''
        }
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  formHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addAccountBtn: {
    marginTop: 4,
  },
  cancelLink: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
    marginBottom: 10,
  },
  acctCard: {
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0c2233',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  acctCardEwallet: {
    backgroundColor: '#faf8fe',
  },
  acctTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  acctIcoWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acctTopRowMain: {
    flex: 1,
  },
  acctInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  acctInfoMain: {
    flex: 1,
  },
  acctTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.skySoft,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginTop: 3,
  },
  acctTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.royal,
  },
  acctType: {
    fontSize: 10,
    color: colors.muted,
  },
  acctProvider: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  acctNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 10,
    letterSpacing: 1,
  },
  acctName: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  acctActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  acctActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  acctActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
  },
  acctActionTextDanger: {
    color: colors.danger,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  limitHint: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 6,
    lineHeight: 15,
  },
  gap: {
    marginTop: 13,
  },
  hint: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 6,
    lineHeight: 15,
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
