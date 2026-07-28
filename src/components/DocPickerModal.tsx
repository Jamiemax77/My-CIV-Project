import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

export type DocPickerOption = { key: string; label: string };

type DocPickerModalProps = {
  visible: boolean;
  title: string;
  options: DocPickerOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
};

/** Lets the participant choose which of two related documents (e.g. KHS vs KRS) an
 * action should apply to, before Lihat/Hapus opens the right one. */
export function DocPickerModal({ visible, title, options, onSelect, onClose }: DocPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {options.map((opt) => (
            <Button
              key={opt.key}
              label={opt.label}
              variant="navy"
              style={styles.optionBtn}
              onPress={() => onSelect(opt.key)}
            />
          ))}
          <Button label="Batal" variant="ghost" style={styles.cancelBtn} onPress={onClose} />
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
    maxWidth: 340,
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
  optionBtn: {
    marginTop: 8,
  },
  cancelBtn: {
    marginTop: 8,
  },
});
