import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../theme';

type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ style, padded = true, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, padded && styles.padded, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#0c2233',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  padded: {
    padding: spacing.md,
  },
});
