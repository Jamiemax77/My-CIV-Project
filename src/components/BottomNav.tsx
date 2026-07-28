import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const NAV_HEIGHT = 66;

export type BottomNavItem = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Pending-count badge shown on the icon (e.g. items awaiting review). Omit/0 hides it. */
  badge?: number;
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
            <View style={styles.iconWrap}>
              <Ionicons
                name={item.icon}
                size={26}
                color={active ? colors.navy : colors.muted}
              />
              {item.badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                </View>
              ) : null}
            </View>
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
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  label: {
    fontSize: 10,
    color: colors.muted,
  },
  labelActive: {
    color: colors.navy,
    fontWeight: '700',
  },
});
