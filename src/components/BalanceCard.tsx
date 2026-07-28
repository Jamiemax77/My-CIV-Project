import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatRupiah } from '../lib/format';
import { colors, radius } from '../theme';

type BalanceCardProps = {
  label: string;
  amount: number;
  rows: Array<{ label: string; value: number }>;
  /** Makes the whole card tappable (e.g. admin's hero card drilling into FundAllocation). */
  onPress?: () => void;
  /** Extra content below the rows, inside the card (e.g. a "ketuk untuk rincian" hint). */
  footer?: React.ReactNode;
};

export function BalanceCard({ label, amount, rows, onPress, footer }: BalanceCardProps) {
  const content = (
    <LinearGradient
      colors={[colors.navy, colors.blue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>{formatRupiah(amount)}</Text>
      <View style={styles.row}>
        {rows.map((r) => (
          <View key={r.label}>
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue}>{formatRupiah(r.value)}</Text>
          </View>
        ))}
      </View>
      {footer}
    </LinearGradient>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  label: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.85,
  },
  amount: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
});
