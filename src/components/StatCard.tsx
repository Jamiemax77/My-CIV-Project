import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { colors, radius } from '../theme';

type StatCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor?: string;
  value: string | number;
  label: string;
};

export function StatCard({
  icon,
  iconBg,
  iconColor = colors.navy,
  value,
  label,
}: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  label: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});
