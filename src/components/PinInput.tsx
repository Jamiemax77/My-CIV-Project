import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

type PinInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
};

export function PinInput({
  length = 6,
  value,
  onChange,
  autoFocus,
  disabled,
}: PinInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => !disabled && inputRef.current?.focus()}>
      <View style={styles.row}>
        {Array.from({ length }).map((_, i) => {
          const digit = value[i];
          const filled = digit !== undefined;
          return (
            <View
              key={i}
              style={[styles.box, filled && styles.boxFilled, disabled && styles.boxDisabled]}
            >
              <Text style={styles.digit}>{filled ? '•' : ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: 9,
    marginBottom: 6,
  },
  box: {
    flex: 1,
    height: 55,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  boxFilled: {
    borderColor: colors.royal,
  },
  boxDisabled: {
    backgroundColor: colors.bg,
    borderColor: colors.line,
    opacity: 0.6,
  },
  digit: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.navy,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
