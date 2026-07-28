import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleProp, View } from 'react-native';
import { buildFileUrl } from '../lib/api';
import { colors } from '../theme';

type AuthImageProps = {
  fileId: string;
  token: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain';
};

function safeCacheName(fileId: string): string {
  return fileId.replace(/[^a-zA-Z0-9._-]/g, '_');
}

// In-memory only (cleared on app restart) — the on-disk file itself (checked via
// getInfoAsync below) is what actually avoids re-downloading across restarts.
const localUriCache = new Map<string, string>();

/**
 * Renders an authenticated file (`GET /files/:id`, requires a Bearer token) as an
 * <Image>. React Native's Image `headers` option is unreliable on Android — once a
 * URI has been loaded once, the native image pipeline can re-request/revalidate it
 * without re-attaching custom headers, so the same authenticated image that loaded
 * fine the first time starts coming back 401 on subsequent views. Downloading the
 * file once (with the header, via expo-file-system) and rendering the local copy
 * sidesteps that entirely — the same approach already used for PDFs in lib/pdf.ts.
 */
export function AuthImage({ fileId, token, style, resizeMode = 'cover' }: AuthImageProps) {
  const [localUri, setLocalUri] = useState<string | null>(localUriCache.get(fileId) ?? null);
  const [loading, setLoading] = useState(!localUriCache.has(fileId));
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = localUriCache.get(fileId);
    if (cached) {
      setLocalUri(cached);
      setLoading(false);
      return;
    }

    const dest = `${FileSystem.cacheDirectory}auth-image-${safeCacheName(fileId)}`;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists) {
          await FileSystem.downloadAsync(buildFileUrl(fileId), dest, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
        }
        if (cancelled) return;
        localUriCache.set(fileId, dest);
        setLocalUri(dest);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fileId, token]);

  if (loading) {
    return (
      <View style={[style, styles.placeholder]}>
        <ActivityIndicator size="small" color={colors.royal} />
      </View>
    );
  }
  if (error || !localUri) {
    return <View style={[style, styles.placeholder]} />;
  }
  return <Image source={{ uri: localUri }} style={style} resizeMode={resizeMode} />;
}

const styles = {
  placeholder: {
    backgroundColor: colors.skySoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
