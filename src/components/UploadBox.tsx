import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export type UploadFile = { name: string; uri: string };

type UploadBoxProps = {
  mode?: 'both' | 'document';
  title?: string;
  subtitle?: string;
  value: UploadFile | null;
  onChange: (file: UploadFile | null) => void;
  maxSizeMB?: number;
};

const MAX_SIZE_DEFAULT = 5;

export function UploadBox({
  mode = 'both',
  title,
  subtitle,
  value,
  onChange,
  maxSizeMB = MAX_SIZE_DEFAULT,
}: UploadBoxProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxBytes = maxSizeMB * 1024 * 1024;

  const acceptOrReject = (file: UploadFile, sizeBytes?: number) => {
    if (sizeBytes && sizeBytes > maxBytes) {
      setError(`Ukuran file maks ${maxSizeMB}MB`);
      return;
    }
    setError(null);
    setMenuOpen(false);
    onChange(file);
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: mode === 'both' ? ['image/*', 'application/pdf'] : 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    acceptOrReject({ name: asset.name, uri: asset.uri }, asset.size ?? undefined);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Izin kamera ditolak');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'foto.jpg';
    acceptOrReject({ name, uri: asset.uri }, asset.fileSize ?? undefined);
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Izin galeri ditolak');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'foto.jpg';
    acceptOrReject({ name, uri: asset.uri }, asset.fileSize ?? undefined);
  };

  const defaultTitle = mode === 'document' ? 'Pilih File PDF' : 'Unggah Berkas';
  const defaultSubtitle =
    mode === 'document'
      ? `PDF (maks ${maxSizeMB}MB)`
      : `Kamera · Galeri · PDF (maks ${maxSizeMB}MB)`;

  return (
    <View>
      <Pressable
        style={styles.box}
        onPress={() => (mode === 'document' ? pickDocument() : setMenuOpen((o) => !o))}
      >
        <Ionicons
          name={mode === 'document' ? 'document-text-outline' : 'cloud-upload-outline'}
          size={22}
          color={colors.blue}
        />
        <Text style={styles.title}>{title ?? defaultTitle}</Text>
        <Text style={styles.subtitle}>{subtitle ?? defaultSubtitle}</Text>
      </Pressable>

      {menuOpen && mode === 'both' ? (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={pickFromCamera}>
            <Ionicons name="camera-outline" size={16} color={colors.navy} />
            <Text style={styles.menuText}>Kamera</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={pickFromGallery}>
            <Ionicons name="images-outline" size={16} color={colors.navy} />
            <Text style={styles.menuText}>Galeri</Text>
          </Pressable>
          <Pressable style={styles.menuItem} onPress={pickDocument}>
            <Ionicons name="document-attach-outline" size={16} color={colors.navy} />
            <Text style={styles.menuText}>Berkas PDF</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {value ? (
        <View style={styles.pill}>
          <Ionicons name="document-attach" size={14} color={colors.blue} />
          <Text style={styles.pillText} numberOfLines={1}>
            {value.name}
          </Text>
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <Ionicons name="close" size={15} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
  },
  subtitle: {
    fontSize: 10,
    color: colors.muted,
  },
  menu: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  menuItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  menuText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.navy,
  },
  error: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  pillText: {
    fontSize: 11,
    color: colors.text,
    flexShrink: 1,
  },
});
