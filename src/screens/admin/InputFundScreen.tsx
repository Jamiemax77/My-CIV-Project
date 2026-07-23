import { zodResolver } from '@hookform/resolvers/zod';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/Button';
import { Chip, ChipGroup } from '../../components/Chip';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { useAddDisbursement, useAdminParticipants } from '../../hooks/useAdminData';
import { formatAmountInput, formatDate, parseAmountInput } from '../../lib/format';
import { colors, radius } from '../../theme';
import { SCHOLARSHIP_TYPES } from '../../types/models';

const PERIODS = ['Genap 2025/2026', 'Ganjil 2025/2026'];

const schema = z.object({
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

type FormValues = z.infer<typeof schema>;

export function InputFundScreen() {
  const { data: participants, isLoading } = useAdminParticipants();
  const addDisbursement = useAddDisbursement();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      participantId: '',
      program: SCHOLARSHIP_TYPES[0],
      period: PERIODS[0],
      amount: '',
      note: '',
    },
  });

  useEffect(() => {
    if (!getValues('participantId') && participants && participants.length > 0) {
      setValue('participantId', participants[0].profile.id);
    }
  }, [participants, getValues, setValue]);

  const submit = async (values: FormValues, disburse: boolean) => {
    const participant = participants?.find((p) => p.profile.id === values.participantId)?.profile;
    setSubmitError(null);
    try {
      await addDisbursement.mutateAsync({
        participantId: values.participantId,
        title: `Pencairan Semester ${values.period.split(' ')[0]}`,
        amount: parseAmountInput(values.amount),
        period: values.period,
        disbursedAt: new Date().toISOString().slice(0, 10),
        note: values.note,
      });
      reset({ ...values, amount: '', note: '' });
      setSavedMessage(
        disburse
          ? `Dana untuk ${participant?.fullName} berhasil dicairkan.`
          : `Draf pencairan untuk ${participant?.fullName} disimpan.`
      );
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan pencairan.');
    }
  };

  return (
    <View style={styles.screen}>
      <Header variant="admin" title="Input Dana Beasiswa" />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
        {isLoading ? (
          <Skeleton height={200} radiusSize={radius.lg} />
        ) : (
          <>
        <Text style={styles.fieldLabel}>Pilih Partisipan</Text>
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
        {errors.participantId ? (
          <Text style={styles.errorText}>{errors.participantId.message}</Text>
        ) : null}

        <View style={styles.gap}>
          <Text style={styles.fieldLabel}>Program Beasiswa</Text>
          <Controller
            control={control}
            name="program"
            render={({ field }) => (
              <ChipGroup>
                {SCHOLARSHIP_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={type}
                    active={field.value === type}
                    onPress={() => field.onChange(type)}
                  />
                ))}
              </ChipGroup>
            )}
          />
          {errors.program ? (
            <Text style={styles.errorText}>{errors.program.message}</Text>
          ) : null}
        </View>

        <Text style={[styles.fieldLabel, styles.gap]}>Periode</Text>
        <Controller
          control={control}
          name="period"
          render={({ field }) => (
            <ChipGroup>
              {PERIODS.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  active={field.value === p}
                  onPress={() => field.onChange(p)}
                />
              ))}
            </ChipGroup>
          )}
        />

        <View style={styles.gap}>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Field
                label="Nominal Beasiswa (Rp)"
                keyboardType="numeric"
                placeholder="0"
                value={field.value}
                onChangeText={(text) => field.onChange(formatAmountInput(text))}
                error={errors.amount?.message}
              />
            )}
          />
        </View>
        <Field
          label="Tanggal Pencairan"
          editable={false}
          value={formatDate(new Date().toISOString())}
        />
        <Controller
          control={control}
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
        {savedMessage ? (
          <Text style={styles.success}>{savedMessage}</Text>
        ) : null}

        <View style={styles.btnRow}>
          <Button
            label="Simpan Draf"
            variant="ghost"
            style={styles.btn}
            disabled={addDisbursement.isPending}
            onPress={handleSubmit((values) => submit(values, false))}
          />
          <Button
            label="Simpan & Cairkan"
            variant="navy"
            style={styles.btn}
            disabled={addDisbursement.isPending}
            loading={addDisbursement.isPending}
            onPress={handleSubmit((values) => submit(values, true))}
          />
        </View>
          </>
        )}
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
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
});
