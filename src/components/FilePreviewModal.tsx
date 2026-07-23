import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Modal, StyleSheet, Text, View } from 'react-native';
import { buildFileUrl } from '../lib/api';
import { isImageFileId } from '../lib/fileType';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';

type FilePreviewModalProps = {
  visible: boolean;
  title?: string;
  fileId?: string;
  fileName?: string;
  token: string | null;
  onClose: () => void;
};

export function FilePreviewModal({
  visible,
  title = 'Pratinjau Berkas',
  fileId,
  fileName,
  token,
  onClose,
}: FilePreviewModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {fileId ? (
            isImageFileId(fileId) ? (
              <Image
                source={{
                  uri: buildFileUrl(fileId),
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.fileRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.blue} />
                <Text style={styles.fileText} numberOfLines={1}>
                  {fileName || fileId.split('__').pop()}
                </Text>
              </View>
            )
          ) : (
            <Text style={styles.empty}>Berkas tidak tersedia.</Text>
          )}

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
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: 15,
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
    fontSize: 11,
    color: colors.blue,
    flexShrink: 1,
  },
  empty: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  closeBtn: {
    marginTop: 8,
  },
});
