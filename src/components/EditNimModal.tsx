import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Field } from './Field';

type EditNimModalProps = {
  visible: boolean;
  currentNim?: string;
  saving?: boolean;
  onSave: (nim: string) => void;
  onClose: () => void;
};

export function EditNimModal({ visible, currentNim, saving, onSave, onClose }: EditNimModalProps) {
  const [value, setValue] = React.useState(currentNim ?? '');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setValue(currentNim ?? '');
      setError(null);
    }
  }, [visible, currentNim]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('NIM wajib diisi.');
      return;
    }
    setError(null);
    onSave(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Isi NIM</Text>
          <Text style={styles.subtitle}>Nomor Induk Mahasiswa</Text>

          <Field
            label="NIM"
            placeholder="Masukkan NIM Anda"
            value={value}
            onChangeText={setValue}
            error={error ?? undefined}
          />

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
