import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

type FieldProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  multiline?: boolean;
  children?: React.ReactNode;
};

export function Field({
  label,
  hint,
  error,
  multiline,
  children,
  style,
  ...inputProps
}: FieldProps) {
  const [focused, setFocused] = React.useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {children ?? (
        <TextInput
          style={[
            styles.input,
            multiline && styles.textarea,
            focused && styles.inputFocused,
            error && styles.inputError,
            style,
          ]}
          placeholderTextColor={colors.muted}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          {...inputProps}
        />
      )}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md + 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 5,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
  },
  textarea: {
    height: 64,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.royal,
  },
  inputError: {
    borderColor: colors.danger,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
});
