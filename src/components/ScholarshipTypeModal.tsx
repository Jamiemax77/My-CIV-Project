import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SCHOLARSHIP_TYPES, ScholarshipType } from '../types/models';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Chip, ChipGroup } from './Chip';

type ScholarshipTypeModalProps = {
  visible: boolean;
  participantName: string;
  currentType?: ScholarshipType;
  saving?: boolean;
  onSelect: (type: ScholarshipType) => void;
  onClose: () => void;
};

export function ScholarshipTypeModal({
  visible,
  participantName,
  currentType,
  saving,
  onSelect,
  onClose,
}: ScholarshipTypeModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Jenis Bantuan Dana</Text>
          <Text style={styles.subtitle}>{participantName}</Text>

          <ChipGroup>
            {SCHOLARSHIP_TYPES.map((type) => (
              <Chip
                key={type}
                label={type}
                active={currentType === type}
                onPress={() => onSelect(type)}
              />
            ))}
          </ChipGroup>

          {saving ? <Text style={styles.saving}>Menyimpan...</Text> : null}

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
    marginTop: 14,
  },
});
