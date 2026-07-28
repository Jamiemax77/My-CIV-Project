import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Card } from './Card';

type ReviewRow = { label: string; value: string; accent?: boolean };

type ReviewCardProps = {
  name: string;
  subtitle: string;
  headerRight?: React.ReactNode;
  rows: ReviewRow[];
  docLabel: string;
  docIcon?: keyof typeof Ionicons.glyphMap;
  /** When set, the document row becomes tappable (e.g. to preview the uploaded file). */
  onDocPress?: () => void;
  /** When set, the whole card becomes tappable (e.g. to open a full detail screen). */
  onPress?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  onApprove?: () => void;
  onReject?: () => void;
  readOnly?: boolean;
  /** Only meaningful once a decision exists (readOnly) — exports a Berita Acara Verifikasi PDF. */
  onExportPdf?: () => void;
  onSharePdf?: () => void;
  exporting?: boolean;
};

export function ReviewCard({
  name,
  subtitle,
  headerRight,
  rows,
  docLabel,
  docIcon = 'document-text-outline',
  onDocPress,
  onPress,
  approveLabel = 'Setujui',
  rejectLabel = 'Tolak',
  onApprove,
  onReject,
  readOnly,
  onExportPdf,
  onSharePdf,
  exporting,
}: ReviewCardProps) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headLeft}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {headerRight}
      </View>

      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.rowLabel}>{row.label}</Text>
          <Text style={[styles.rowValue, row.accent && styles.rowValueAccent]}>
            {row.value}
          </Text>
        </View>
      ))}

      {onDocPress ? (
        <Pressable style={styles.doc} onPress={onDocPress}>
          <Ionicons name={docIcon} size={14} color={colors.blue} />
          <Text style={styles.docText} numberOfLines={1}>
            {docLabel}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.blue} style={styles.docChevron} />
        </Pressable>
      ) : (
        <View style={styles.doc}>
          <Ionicons name={docIcon} size={14} color={colors.blue} />
          <Text style={styles.docText} numberOfLines={1}>
            {docLabel}
          </Text>
        </View>
      )}

      {readOnly ? null : (
        <View style={styles.btnRow}>
          <Button
            label={rejectLabel}
            variant="reject"
            onPress={onReject}
            style={styles.btn}
          />
          <Button
            label={approveLabel}
            variant="approve"
            onPress={onApprove}
            style={styles.btn}
          />
        </View>
      )}

      {readOnly && (onExportPdf || onSharePdf) ? (
        <View style={styles.btnRow}>
          {onExportPdf ? (
            <Button
              label={exporting ? 'Membuat PDF...' : 'Export PDF'}
              variant="ghost"
              onPress={onExportPdf}
              disabled={exporting}
              style={styles.btn}
            />
          ) : null}
          {onSharePdf ? (
            <Button
              label="Bagikan"
              variant="ghost"
              onPress={onSharePdf}
              disabled={exporting}
              style={styles.btn}
            />
          ) : null}
        </View>
      ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headLeft: {
    flexShrink: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  rowValueAccent: {
    color: colors.accent,
  },
  doc: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
  },
  docText: {
    fontSize: 13,
    color: colors.blue,
    flexShrink: 1,
  },
  docChevron: {
    marginLeft: 'auto',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
});
