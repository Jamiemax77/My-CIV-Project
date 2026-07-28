import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { formatAmountInput, formatRupiah, parseAmountInput } from '../lib/format';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Field } from './Field';

export type NewBudgetItemInput = { keterangan: string; unit: number; satuan: number };

type AddBudgetItemModalProps = {
  visible: boolean;
  saving?: boolean;
  errorText?: string | null;
  onSave: (input: NewBudgetItemInput) => void;
  onClose: () => void;
};

/** Adds one "Rincian Penggunaan Dana" line (Keterangan/Unit/Satuan) — jumlah (unit × satuan)
 * is computed here as a live preview but always recomputed server-side, never trusted from the client. */
export function AddBudgetItemModal({
  visible,
  saving,
  errorText,
  onSave,
  onClose,
}: AddBudgetItemModalProps) {
  const [keterangan, setKeterangan] = React.useState('');
  const [unit, setUnit] = React.useState('');
  const [satuan, setSatuan] = React.useState('');
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible) {
      setKeterangan('');
      setUnit('');
      setSatuan('');
      setFieldError(null);
    }
  }, [visible]);

  const unitNum = Number(unit) || 0;
  const satuanNum = parseAmountInput(satuan);
  const jumlah = unitNum * satuanNum;

  const handleClose = () => {
    setKeterangan('');
    setUnit('');
    setSatuan('');
    setFieldError(null);
    onClose();
  };

  const submit = () => {
    if (!keterangan.trim()) {
      setFieldError('Keterangan wajib diisi.');
      return;
    }
    if (!(unitNum > 0)) {
      setFieldError('Unit harus lebih dari 0.');
      return;
    }
    if (!(satuanNum > 0)) {
      setFieldError('Satuan harus lebih dari 0.');
      return;
    }
    setFieldError(null);
    onSave({ keterangan: keterangan.trim(), unit: unitNum, satuan: satuanNum });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Tambah Item Rincian Dana</Text>

          <Field
            label="Keterangan"
            placeholder="cth: Bayar Kos 6 bulan"
            value={keterangan}
            onChangeText={setKeterangan}
          />
          <View style={styles.row}>
            <View style={styles.rowCol}>
              <Field label="Unit" placeholder="cth: 6" keyboardType="numeric" value={unit} onChangeText={setUnit} />
            </View>
            <View style={styles.rowCol}>
              <Field
                label="Satuan (Rp)"
                placeholder="cth: 600.000"
                keyboardType="numeric"
                value={satuan}
                onChangeText={(t) => setSatuan(formatAmountInput(t))}
              />
            </View>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Jumlah</Text>
            <Text style={styles.previewValue}>{formatRupiah(jumlah)}</Text>
          </View>

          {fieldError ? <Text style={styles.errorText}>{fieldError}</Text> : null}
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Item'}
            variant="navy"
            onPress={submit}
            disabled={saving}
            loading={saving}
          />
          <Button label="Batal" variant="ghost" style={styles.closeBtn} onPress={handleClose} />
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
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowCol: {
    flex: 1,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 4,
  },
  closeBtn: {
    marginTop: 8,
  },
});
