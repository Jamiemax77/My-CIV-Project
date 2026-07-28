import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

type ChipGroupProps = {
  children: React.ReactNode;
};

export function ChipGroup({ children }: ChipGroupProps) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: colors.royal,
    borderColor: colors.royal,
  },
  text: {
    fontSize: 13,
    color: '#4a5578',
  },
  textActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
