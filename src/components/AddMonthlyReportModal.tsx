import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { DatePickerField } from './DatePickerField';
import { Field } from './Field';
import { UploadBox, UploadFile } from './UploadBox';

const schema = z.object({
  description: z.string().trim().min(5, 'Deskripsi minimal 5 karakter'),
  reportDate: z.string().trim().min(1, 'Tanggal wajib diisi'),
});

type FormValues = z.infer<typeof schema>;

const defaultValues: FormValues = { description: '', reportDate: '' };

export type NewMonthlyReportInput = FormValues & { file: UploadFile };

type AddMonthlyReportModalProps = {
  visible: boolean;
  saving?: boolean;
  onSave: (input: NewMonthlyReportInput) => void;
  onClose: () => void;
};

export function AddMonthlyReportModal({
  visible,
  saving,
  onSave,
  onClose,
}: AddMonthlyReportModalProps) {
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

  const handleClose = () => {
    reset(defaultValues);
    setFile(null);
    setFileError(null);
    onClose();
  };

  const submit = (values: FormValues) => {
    if (!file) {
      setFileError('Unggah file/foto terlebih dahulu');
      return;
    }
    setFileError(null);
    onSave({ ...values, file });
    reset(defaultValues);
    setFile(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Buat Laporan Bulan Ini</Text>
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
            <UploadBox
              mode="both"
              subtitle="Kamera · Galeri · PDF (maks 5MB)"
              value={file}
              onChange={(f) => {
                setFile(f);
                if (f) setFileError(null);
              }}
            />
            {fileError ? <Text style={styles.errorText}>{fileError}</Text> : null}

            <Button
              label={saving ? 'Menyimpan...' : 'Simpan Laporan'}
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
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  closeBtn: {
    marginTop: 8,
  },
});
