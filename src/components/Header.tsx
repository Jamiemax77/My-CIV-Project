import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { AuthImage } from './AuthImage';

type HeaderProps = {
  variant?: 'participant' | 'admin';
  /** Back-button mode with a simple title, e.g. "Ajukan Pengembalian" */
  title?: string;
  onBack?: () => void;
  /** Dashboard-style greeting mode */
  greeting?: string;
  name?: string;
  roleTag?: string;
  avatarInitial?: string;
  /** When set, renders this file (via AuthImage) instead of avatarInitial's text fallback. */
  avatarFileId?: string;
  token?: string | null;
  onAvatarPress?: () => void;
};

export function Header({
  variant = 'participant',
  title,
  onBack,
  greeting,
  name,
  roleTag,
  avatarInitial,
  avatarFileId,
  token,
  onAvatarPress,
}: HeaderProps) {
  const content = (
    <View style={[styles.container, title ? styles.containerSmall : null]}>
      <View style={styles.top}>
        <View style={styles.left}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
          {title ? (
            <Text style={styles.title}>{title}</Text>
          ) : (
            <View>
              {greeting ? <Text style={styles.greet}>{greeting}</Text> : null}
              {name ? <Text style={styles.name}>{name}</Text> : null}
              {roleTag ? (
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{roleTag}</Text>
                </View>
              ) : null}
            </View>
          )}
        </View>
        {avatarInitial ? (
          <Pressable onPress={onAvatarPress} style={styles.avatar}>
            {avatarFileId ? (
              <AuthImage fileId={avatarFileId} token={token ?? null} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (variant === 'admin') {
    return (
      <LinearGradient
        colors={[colors.navy, colors.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView edges={['top']}>{content}</SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.navy }}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
  },
  containerSmall: {
    paddingBottom: 14,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  backBtn: {
    marginRight: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  greet: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.85,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
  },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginTop: 5,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
