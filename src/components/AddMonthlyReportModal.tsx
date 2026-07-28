import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { MONTHLY_REPORT_CATEGORY_LABEL } from '../lib/labels';
import { colors, radius, spacing } from '../theme';
import { MonthlyReportCategory } from '../types/models';
import { Button } from './Button';
import { Chip, ChipGroup } from './Chip';
import { DatePickerField } from './DatePickerField';
import { Field } from './Field';
import { UploadBox, UploadFile } from './UploadBox';

const CATEGORIES: MonthlyReportCategory[] = ['kampus', 'ppa_cluster', 'mentoring'];

const schema = z.object({
  description: z.string().trim().min(5, 'Deskripsi minimal 5 karakter'),
  category: z.enum(['kampus', 'ppa_cluster', 'mentoring'], { message: 'Pilih kategori kegiatan' }),
  reportDate: z.string().trim().min(1, 'Tanggal wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = {
  description: '',
  category: undefined as unknown as FormValues['category'],
  reportDate: '',
};

export type NewMonthlyReportInput = FormValues & { file: UploadFile | null };

type AddMonthlyReportModalProps = {
  visible: boolean;
  mode?: 'create' | 'edit';
  initialValues?: {
    description: string;
    category: MonthlyReportCategory;
    reportDate: string;
    fileId?: string;
  };
  saving?: boolean;
  errorText?: string | null;
  onSave: (input: NewMonthlyReportInput) => void;
  onClose: () => void;
  onDelete?: () => void;
};

export function AddMonthlyReportModal({
  visible,
  mode = 'create',
  initialValues,
  saving,
  errorText,
  onSave,
  onClose,
  onDelete,
}: AddMonthlyReportModalProps) {
  const isEdit = mode === 'edit';
  const [file, setFile] = React.useState<UploadFile | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  React.useEffect(() => {
    if (visible) {
      reset(
        initialValues
          ? {
              description: initialValues.description,
              category: initialValues.category,
              reportDate: initialValues.reportDate,
            }
          : defaultValues
      );
      setFile(null);
      setFileError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    reset(defaultValues);
    setFile(null);
    setFileError(null);
    onClose();
  };

  const submit = (values: FormValues) => {
    if (!isEdit && !file) {
      setFileError('Unggah file/foto terlebih dahulu');
      return;
    }
    setFileError(null);
    onSave({ ...values, file });
    reset(defaultValues);
    setFile(null);
  };

  const existingFileName = initialValues?.fileId?.split('__').pop();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>
            {isEdit ? 'Edit Laporan Bulanan' : 'Buat Laporan Bulan Ini'}
          </Text>
          {isEdit && onDelete ? (
            <Pressable style={styles.deleteIcon} onPress={onDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          ) : null}
          <ScrollView showsVerticalScrollIndicator={false}>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <Field
                  label="Deskripsi Aktivitas"
                  multiline
                  placeholder="cth: Mengikuti kegiatan Youth Cluster di gereja"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.description?.message}
                />
              )}
            />
            <Text style={styles.label}>Kategori Kegiatan</Text>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <ChipGroup>
                  {CATEGORIES.map((cat) => (
                    <Chip
                      key={cat}
                      label={MONTHLY_REPORT_CATEGORY_LABEL[cat]}
                      active={field.value === cat}
                      onPress={() => field.onChange(cat)}
                    />
                  ))}
                </ChipGroup>
              )}
            />
            {errors.category ? <Text style={styles.errorText}>{errors.category.message}</Text> : null}

            <Controller
              control={control}
              name="reportDate"
              render={({ field }) => (
                <DatePickerField
                  label="Tanggal"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.reportDate?.message}
                  maximumDate={new Date()}
                />
              )}
            />

            <Text style={styles.label}>Unggah File / Kamera</Text>
            {isEdit && existingFileName ? (
              <Text style={styles.currentFile} numberOfLines={1}>
                File saat ini: {existingFileName}
              </Text>
            ) : null}
            <UploadBox
              mode="both"
              subtitle={
                isEdit ? 'Kosongkan untuk tetap pakai file lama · maks 5MB' : 'Kamera · Galeri · PDF (maks 5MB)'
              }
              value={file}
              onChange={(f) => {
                setFile(f);
                if (f) setFileError(null);
              }}
            />
            {fileError ? <Text style={styles.errorText}>{fileError}</Text> : null}
            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <Button
              label={saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Laporan'}
              variant="navy"
              onPress={handleSubmit(submit)}
              disabled={saving}
              loading={saving}
            />
            <Button label="Batal" variant="ghost" style={styles.closeBtn} onPress={handleClose} />
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  deleteIcon: {
    position: 'absolute',
    top: spacing.xl - 4,
    right: spacing.xl - 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  currentFile: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  closeBtn: {
    marginTop: 8,
  },
});
