import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const NAV_HEIGHT = 58;

export type BottomNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type BottomNavProps = {
  items: BottomNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
};

export function BottomNav({ items, activeKey, onChange }: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { height: NAV_HEIGHT + insets.bottom, paddingBottom: insets.bottom }]}>
      {items.map((item) => {
        const active = item.key === activeKey;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={styles.item}
            hitSlop={6}
          >
            <Ionicons
              name={item.icon}
              size={19}
              color={active ? colors.navy : colors.muted}
            />
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  item: {
    alignItems: 'center',
    gap: 2,
  },
  label: {
    fontSize: 9,
    color: colors.muted,
  },
  labelActive: {
    color: colors.navy,
    fontWeight: '700',
  },
});
