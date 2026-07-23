import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '../theme';

export type ButtonVariant = 'primary' | 'ghost' | 'navy' | 'approve' | 'reject';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyle.container,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color as string} />
      ) : (
        <Text style={[styles.text, variantStyle.text]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});

const variantStyles: Record<
  ButtonVariant,
  { container: ViewStyle; text: { color: string } }
> = {
  primary: {
    container: {
      backgroundColor: colors.royal,
      shadowColor: colors.royal,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    text: { color: '#ffffff' },
  },
  navy: {
    container: {
      backgroundColor: colors.navy,
      shadowColor: colors.navy,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    text: { color: '#ffffff' },
  },
  ghost: {
    container: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: colors.royal,
    },
    text: { color: colors.royal },
  },
  approve: {
    container: {
      backgroundColor: colors.accent,
    },
    text: { color: '#ffffff' },
  },
  reject: {
    container: {
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: colors.danger,
    },
    text: { color: colors.danger },
  },
};
