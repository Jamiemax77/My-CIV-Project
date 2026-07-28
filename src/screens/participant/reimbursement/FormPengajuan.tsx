import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { Button } from '../../../components/Button';
import { Field } from '../../../components/Field';
import { UploadFile } from '../../../components/UploadBox';
import { formatAmountInput, parseAmountInput } from '../../../lib/format';
import { colors } from '../../../theme';
import { UploadBukti } from './UploadBukti';

const schema = z.object({
  description: z.string().trim().min(5, 'Keterangan minimal 5 karakter'),
  amount: z
    .string()
    .min(1, 'Nominal wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Nominal harus lebih dari 0'),
});

type FormValues = z.infer<typeof schema>;

export type FormPengajuanSubmitValues = {
  description: string;
  amount: number;
  proof: UploadFile;
  usageProof: UploadFile;
};

type FormPengajuanProps = {
  nomorPengajuan: string;
  onKembali: () => void;
  onSubmit: (values: FormPengajuanSubmitValues) => void;
  submitting: boolean;
  submitError?: string | null;
};

/** Step 2 of the Ajukan Pengembalian wizard. */
export function FormPengajuan({
  nomorPengajuan,
  onKembali,
  onSubmit,
  submitting,
  submitError,
}: FormPengajuanProps) {
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [usageProof, setUsageProof] = useState<UploadFile | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [usageProofError, setUsageProofError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { description: '', amount: '' },
  });

  const canSubmit = isValid && !!proof && !!usageProof && !submitting;

  const submit = (values: FormValues) => {
    setProofError(proof ? null : 'Nota / Kwitansi wajib diunggah');
    setUsageProofError(usageProof ? null : 'Bukti wajib diunggah');
    if (!proof || !usageProof) return;
    onSubmit({
      description: values.description.trim(),
      amount: parseAmountInput(values.amount),
      proof,
      usageProof,
    });
  };

  return (
    <View>
      <Field label="Nomor Pengajuan" editable={false} value={nomorPengajuan} />

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

      <UploadBukti
        label="Nota / Kwitansi"
        value={proof}
        onChange={(f) => {
          setProof(f);
          if (f) setProofError(null);
        }}
        error={proofError}
      />
      <UploadBukti
        label="Bukti barang / jasa / kegiatan yang dibiayai"
        value={usageProof}
        onChange={(f) => {
          setUsageProof(f);
          if (f) setUsageProofError(null);
        }}
        error={usageProofError}
      />

      {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

      <View style={styles.btnRow}>
        <Button label="Kembali" variant="ghost" style={styles.btn} onPress={onKembali} disabled={submitting} />
        <Button
          label={submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          style={styles.btn}
          onPress={handleSubmit(submit)}
          disabled={!canSubmit}
          loading={submitting}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 8,
  },
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
