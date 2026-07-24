import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Field } from './Field';

type EditAcademicInfoModalProps = {
  visible: boolean;
  currentMajor?: string;
  currentUniversity?: string;
  saving?: boolean;
  errorText?: string | null;
  onSave: (input: { major: string; university: string }) => void;
  onClose: () => void;
};

export function EditAcademicInfoModal({
  visible,
  currentMajor,
  currentUniversity,
  saving,
  errorText,
  onSave,
  onClose,
}: EditAcademicInfoModalProps) {
  const [major, setMajor] = React.useState(currentMajor ?? '');
  const [university, setUniversity] = React.useState(currentUniversity ?? '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setMajor(currentMajor ?? '');
      setUniversity(currentUniversity ?? '');
      setError(null);
    }
  }, [visible, currentMajor, currentUniversity]);

  const submit = () => {
    const trimmedMajor = major.trim();
    const trimmedUniversity = university.trim();
    if (!trimmedMajor || !trimmedUniversity) {
      setError('Jurusan dan Universitas wajib diisi.');
      return;
    }
    setError(null);
    onSave({ major: trimmedMajor, university: trimmedUniversity });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Edit Data Akademik</Text>
          <Text style={styles.subtitle}>Jurusan dan Universitas</Text>

          <Field label="Jurusan" placeholder="cth: Teknik Informatika" value={major} onChangeText={setMajor} />
          <Field
            label="Universitas"
            placeholder="cth: Universitas Negeri Manado"
            value={university}
            onChangeText={setUniversity}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          {saving ? <Text style={styles.saving}>Menyimpan...</Text> : null}

          <Button label="Simpan" variant="navy" onPress={submit} disabled={saving} loading={saving} />
          <Button label="Tutup" variant="ghost" style={styles.closeBtn} onPress={onClose} />
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
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  saving: {
    fontSize: 11,
    color: colors.royal,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  closeBtn: {
    marginTop: 8,
  },
});
