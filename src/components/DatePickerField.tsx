import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { Button } from './Button';

type DatePickerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maximumDate?: Date;
};

function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseValue(value: string): Date {
  return new Date(value.includes('T') ? value : `${value}T00:00:00`);
}

function formatDisplay(value: string): string {
  const date = parseValue(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('id-ID', { month: 'short' }).replace('.', '');
  const year = date.getFullYear();
  return `${day} - ${month} - ${year}`;
}

export function DatePickerField({ label, value, onChange, error, maximumDate }: DatePickerFieldProps) {
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) onChange(toDateOnly(selectedDate));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={[styles.field, error && styles.fieldError]} onPress={() => setShow(true)}>
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? formatDisplay(value) : 'Pilih tanggal'}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {show ? (
        <>
          <DateTimePicker
            value={value ? parseValue(value) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
          {Platform.OS === 'ios' ? (
            <Button label="Selesai" variant="ghost" onPress={() => setShow(false)} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 5,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  valueText: {
    fontSize: 15,
    color: colors.text,
  },
  placeholderText: {
    color: colors.muted,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
});
