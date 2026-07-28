import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { AuthImage } from './AuthImage';

export type PickedPhoto = { uri: string; name: string };

type AvatarPickerProps = {
  initial: string;
  localUri?: string | null;
  remoteFileId?: string;
  token?: string | null;
  onPick: (file: PickedPhoto) => void;
  size?: number;
};

export function AvatarPicker({
  initial,
  localUri,
  remoteFileId,
  token,
  onPick,
  size = 76,
}: AvatarPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(fromCamera ? 'Izin kamera ditolak' : 'Izin galeri ditolak');
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
          aspect: [1, 1],
        });
    if (result.canceled) return;
    const asset = result.assets[0];
    setError(null);
    onPick({ uri: asset.uri, name: asset.fileName ?? asset.uri.split('/').pop() ?? 'foto.jpg' });
  };

  const avatarStyle = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={styles.wrap}>
      <View style={[styles.photoWrap, { width: size, height: size, borderRadius: size / 2 }]}>
        {localUri ? (
          <Image source={{ uri: localUri }} style={avatarStyle} />
        ) : remoteFileId ? (
          <AuthImage fileId={remoteFileId} token={token ?? null} style={avatarStyle} />
        ) : (
          <Text style={[styles.photoInitial, { fontSize: size * 0.34 }]}>{initial}</Text>
        )}
        <Pressable style={styles.camBadge} onPress={() => setMenuOpen((o) => !o)} hitSlop={8}>
          <Ionicons name="camera" size={13} color="#ffffff" />
        </Pressable>
      </View>

      {menuOpen ? (
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              pick(true);
            }}
          >
            <Ionicons name="camera-outline" size={14} color={colors.navy} />
            <Text style={styles.menuText}>Kamera</Text>
          </Pressable>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              pick(false);
            }}
          >
            <Ionicons name="images-outline" size={14} color={colors.navy} />
            <Text style={styles.menuText}>Galeri</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  photoWrap: {
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  photoInitial: {
    fontWeight: '800',
    color: '#ffffff',
  },
  camBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.royal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  menu: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  menuText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
  },
  error: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 6,
  },
});
