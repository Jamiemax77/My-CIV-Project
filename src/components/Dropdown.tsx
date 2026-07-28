import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type DropdownProps = {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  onChange: (value: string) => void;
  error?: string;
};

export function Dropdown({ label, value, placeholder, options, onChange, error }: DropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.field, error && styles.fieldError]} onPress={() => setOpen(true)}>
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value || placeholder || 'Pilih'}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.menu}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={styles.option}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionText, opt === value && styles.optionTextActive]}>
                  {opt}
                </Text>
                {opt === value ? (
                  <Ionicons name="checkmark" size={16} color={colors.royal} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 5,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  valueText: {
    fontSize: 15,
    color: colors.text,
  },
  placeholderText: {
    color: colors.muted,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,34,51,0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  menu: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 6,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.royal,
    fontWeight: '700',
  },
});
