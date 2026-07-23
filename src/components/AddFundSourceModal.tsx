import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { formatAmountInput, parseAmountInput } from '../lib/format';
import { colors, radius, spacing } from '../theme';
import { SCHOLARSHIP_TYPES } from '../types/models';
import { Button } from './Button';
import { Chip, ChipGroup } from './Chip';
import { Field } from './Field';

const schema = z.object({
  scholarshipType: z.enum(['CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya'], {
    message: 'Pilih jenis dana',
  }),
  interventionId: z.string().trim().optional(),
  fundName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  amount: z
    .string()
    .min(1, 'Jumlah wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Jumlah harus lebih dari 0'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  scholarshipType: undefined as unknown as FormValues['scholarshipType'],
  interventionId: '',
  fundName: '',
  description: '',
  amount: '',
};

type AddFundSourceModalProps = {
  visible: boolean;
  saving?: boolean;
  onSave: (input: {
    scholarshipType: FormValues['scholarshipType'];
    interventionId?: string;
    fundName?: string;
    description?: string;
    amount: number;
  }) => void;
  onClose: () => void;
};

export function AddFundSourceModal({ visible, saving, onSave, onClose }: AddFundSourceModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const submit = (values: FormValues) => {
    onSave({
      scholarshipType: values.scholarshipType,
      interventionId: values.interventionId?.trim() || undefined,
      fundName: values.fundName?.trim() || undefined,
      description: values.description?.trim() || undefined,
      amount: parseAmountInput(values.amount),
    });
    reset(defaultValues);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Tambah Sumber Dana</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Jenis Dana</Text>
          <Controller
            control={control}
            name="scholarshipType"
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
          {errors.scholarshipType ? (
            <Text style={styles.errorText}>{errors.scholarshipType.message}</Text>
          ) : null}

          <View style={styles.gap}>
            <Controller
              control={control}
              name="interventionId"
              render={({ field }) => (
                <Field
                  label="ID Intervensi (Opsional)"
                  placeholder="cth: INT-000036784"
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name="fundName"
            render={({ field }) => (
              <Field
                label="Dana (Opsional)"
                placeholder="cth: FND002039 Child & Youth Education"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <Field
                label="Nama / Deskripsi (Opsional)"
                placeholder="cth: ID EDU Higher Education for Best Sulawesi 1 Students FY 24"
                multiline
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <Field
                label="Jumlah (Rp)"
                keyboardType="numeric"
                placeholder="0"
                value={field.value}
                onChangeText={(text) => field.onChange(formatAmountInput(text))}
                error={errors.amount?.message}
              />
            )}
          />

          <Button
            label={saving ? 'Menyimpan...' : 'Simpan'}
            variant="navy"
            onPress={handleSubmit(submit)}
            disabled={saving}
            loading={saving}
          />
          <Button label="Batal" variant="ghost" style={styles.closeBtn} onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,34,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  label: {
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
  closeBtn: {
    marginTop: 8,
  },
});
