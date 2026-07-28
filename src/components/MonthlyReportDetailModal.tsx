import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../lib/format';
import { openRemotePdf } from '../lib/pdf';
import { colors, radius, spacing } from '../theme';
import { MonthlyReport } from '../types/models';
import { AuthImage } from './AuthImage';
import { Button } from './Button';

function isImageFile(fileId?: string) {
  if (!fileId) return false;
  const name = fileId.split('__').pop() ?? '';
  return /\.(png|jpe?g)$/i.test(name);
}

type MonthlyReportDetailModalProps = {
  visible: boolean;
  report: MonthlyReport | null;
  token: string | null;
  onClose: () => void;
  onEdit?: () => void;
};

export function MonthlyReportDetailModal({
  visible,
  report,
  token,
  onClose,
  onEdit,
}: MonthlyReportDetailModalProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenDocument = async () => {
    const fileId = report?.fileId;
    if (!fileId) return;
    setError(null);
    setOpening(true);
    try {
      await openRemotePdf(fileId, token, fileId.split('__').pop() || 'berkas.pdf');
    } catch {
      setError('Gagal membuka berkas. Coba lagi.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Detail Laporan Bulanan</Text>
          {report ? (
            <>
              <Text style={styles.date}>{formatDate(report.reportDate)}</Text>
              <Text style={styles.description}>{report.description}</Text>

              {report.fileId ? (
                isImageFile(report.fileId) ? (
                  <AuthImage fileId={report.fileId} token={token} style={styles.photo} />
                ) : (
                  <Pressable style={styles.fileRow} onPress={onOpenDocument} disabled={opening}>
                    <Ionicons name="document-text-outline" size={16} color={colors.blue} />
                    <Text style={styles.fileText} numberOfLines={1}>
                      {report.fileId.split('__').pop()}
                    </Text>
                    {opening ? (
                      <ActivityIndicator size="small" color={colors.blue} style={styles.fileAction} />
                    ) : (
                      <Ionicons
                        name="open-outline"
                        size={16}
                        color={colors.blue}
                        style={styles.fileAction}
                      />
                    )}
                  </Pressable>
                )
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </>
          ) : null}

          {onEdit ? (
            <View style={styles.btnRow}>
              <Button label="Tutup" variant="ghost" style={styles.rowBtn} onPress={onClose} />
              <Button label="Edit" variant="navy" style={styles.rowBtn} onPress={onEdit} />
            </View>
          ) : (
            <Button label="Tutup" variant="ghost" style={styles.closeBtn} onPress={onClose} />
          )}
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
    marginBottom: 10,
  },
  date: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 14,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  fileText: {
    fontSize: 13,
    color: colors.blue,
    flexShrink: 1,
  },
  fileAction: {
    marginLeft: 'auto',
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    marginTop: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  rowBtn: {
    flex: 1,
    marginTop: 0,
  },
});
