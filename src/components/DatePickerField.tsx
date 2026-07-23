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

function formatDisplay(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
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
            value={value ? new Date(`${value}T00:00:00`) : new Date()}
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
    fontSize: 11,
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
    fontSize: 13,
    color: colors.text,
  },
  placeholderText: {
    color: colors.muted,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
  },
});
