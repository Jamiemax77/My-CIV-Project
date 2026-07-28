import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { badge, BadgeStatus } from '../theme';

type BadgeProps = {
  status: BadgeStatus;
  label: string;
};

export function Badge({ status, label }: BadgeProps) {
  const tone = badge[status];
  return (
    <View style={[styles.wrap, { backgroundColor: tone.bg }]}>
      <Text style={[styles.text, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
  },
});
