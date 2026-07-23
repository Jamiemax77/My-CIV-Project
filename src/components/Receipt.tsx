import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatRupiah } from '../lib/format';
import { colors, radius, spacing } from '../theme';
import { Card } from './Card';

type ReceiptRow = { label: string; value: string; accent?: boolean };

type ReceiptProps = {
  amount: number;
  rows: ReceiptRow[];
  proofFileName: string;
};

export function Receipt({ amount, rows, proofFileName }: ReceiptProps) {
  return (
    <Card style={styles.card} padded={false}>
      <View style={styles.top}>
        <View style={styles.check}>
          <Ionicons name="checkmark" size={20} color="#ffffff" />
        </View>
        <Text style={styles.status}>Dana Berhasil Ditransfer</Text>
        <Text style={styles.amount}>{formatRupiah(amount)}</Text>
      </View>
      <View style={styles.body}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <Text style={[styles.rowValue, row.accent && styles.rowValueAccent]}>
              {row.value}
            </Text>
          </View>
        ))}
        <View style={styles.proof}>
          <Text style={styles.proofLabel}>Lampiran Bukti Transfer</Text>
          <View style={styles.proofImg}>
            <Ionicons name="receipt-outline" size={14} color={colors.blue} />
            <Text style={styles.proofImgText} numberOfLines={1}>
              {proofFileName}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  top: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 4,
  },
  check: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  amount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  body: {
    padding: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  rowValue: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  rowValueAccent: {
    color: colors.accent,
  },
  proof: {
    marginTop: spacing.md,
  },
  proofLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 6,
  },
  proofImg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  proofImgText: {
    fontSize: 11,
    color: colors.blue,
    flexShrink: 1,
  },
});
