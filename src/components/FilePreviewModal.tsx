import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { isImageFileId } from '../lib/fileType';
import { openRemotePdf } from '../lib/pdf';
import { colors, radius, spacing } from '../theme';
import { AuthImage } from './AuthImage';
import { Button } from './Button';

type FilePreviewModalProps = {
  visible: boolean;
  title?: string;
  fileId?: string;
  fileName?: string;
  token: string | null;
  onClose: () => void;
  /** When set, renders a "Hapus" button alongside "Tutup" so the participant can delete
   * straight from the preview instead of closing it and finding Hapus in the list below. */
  onDelete?: () => void;
};

export function FilePreviewModal({
  visible,
  title = 'Pratinjau Berkas',
  fileId,
  fileName,
  token,
  onClose,
  onDelete,
}: FilePreviewModalProps) {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onOpenDocument = async () => {
    if (!fileId) return;
    setError(null);
    setOpening(true);
    try {
      await openRemotePdf(fileId, token, fileName || fileId.split('__').pop() || 'berkas.pdf');
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
          <Text style={styles.title}>{title}</Text>

          {fileId ? (
            isImageFileId(fileId) ? (
              <AuthImage fileId={fileId} token={token} style={styles.photo} resizeMode="contain" />
            ) : (
              <Pressable style={styles.fileRow} onPress={onOpenDocument} disabled={opening}>
                <Ionicons name="document-text-outline" size={16} color={colors.blue} />
                <Text style={styles.fileText} numberOfLines={1}>
                  {fileName || fileId.split('__').pop()}
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
          ) : (
            <Text style={styles.empty}>Berkas tidak tersedia.</Text>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {onDelete ? (
            <View style={styles.btnRow}>
              <Button label="Tutup" variant="ghost" style={styles.rowBtn} onPress={onClose} />
              <Button label="Hapus" variant="reject" style={styles.rowBtn} onPress={onDelete} />
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
    marginBottom: 14,
  },
  photo: {
    width: '100%',
    height: 320,
    borderRadius: radius.md,
    marginBottom: 8,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    paddingVertical: 10,
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
  empty: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
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
