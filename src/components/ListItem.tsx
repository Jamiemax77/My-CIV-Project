import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

type ListItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor?: string;
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  onPress?: () => void;
};

export function ListItem({
  icon,
  iconBg,
  iconColor = colors.navy,
  title,
  subtitle,
  right,
  onPress,
}: ListItemProps) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.wrap} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={15} color={iconColor} />
      </View>
      <View style={styles.main}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {right}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  main: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 1,
  },
});
