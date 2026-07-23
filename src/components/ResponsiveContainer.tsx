import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

type ResponsiveContainerProps = ViewProps & {
  maxWidth?: number;
};

/** Caps content width and centers it on wide screens (tablets); no-op on phones. */
export function ResponsiveContainer({
  maxWidth = 640,
  style,
  children,
  ...rest
}: ResponsiveContainerProps) {
  return (
    <View style={[styles.container, { maxWidth }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'center',
  },
});
