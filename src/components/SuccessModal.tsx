import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

type SuccessModalProps = {
  visible: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

/** Non-destructive counterpart to ConfirmModal — confirms an action already happened
 * (e.g. a delete completed) rather than asking permission before one does. */
export function SuccessModal({ visible, title = 'Berhasil', message, onClose }: SuccessModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle-outline" size={26} color={colors.accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <Button label="Tutup" variant="navy" style={styles.closeBtn} onPress={onClose} />
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
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3f6ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  closeBtn: {
    marginTop: 18,
    width: '100%',
  },
});
