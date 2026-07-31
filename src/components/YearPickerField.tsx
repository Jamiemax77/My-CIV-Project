import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { Button } from './Button';
import { Field } from './Field';

type YearPickerFieldProps = {
  label: string;
  value: string;
  onChange: (year: string) => void;
  error?: string;
  startYear?: number;
  endYear?: number;
};

/** Dropdown replacement for a free-typed "Tahun" input — lists every year from
 * `startYear` (default 2020) through `endYear` (default 2035), newest first. */
export function YearPickerField({
  label,
  value,
  onChange,
  error,
  startYear = 2020,
  endYear = 2035,
}: YearPickerFieldProps) {
  const [open, setOpen] = React.useState(false);
  const years = React.useMemo(() => {
    const list: number[] = [];
    for (let y = endYear; y >= startYear; y--) list.push(y);
    return list;
  }, [startYear, endYear]);

  return (
    <>
      <Field label={label} error={error}>
        <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
          <Text style={[styles.triggerText, !value && styles.placeholder]}>
            {value || 'Pilih tahun'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        </Pressable>
      </Field>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{label}</Text>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {years.map((y) => {
                const yearStr = String(y);
                const active = yearStr === value;
                return (
                  <Pressable
                    key={y}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => {
                      onChange(yearStr);
                      setOpen(false);
                    }}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {yearStr}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.royal} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Button label="Batal" variant="ghost" style={styles.cancelBtn} onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  triggerText: {
    fontSize: 15,
    color: colors.text,
  },
  placeholder: {
    color: colors.muted,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,34,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 14,
  },
  list: {
    maxHeight: 280,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.sm,
  },
  optionActive: {
    backgroundColor: colors.skySoft,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
  optionTextActive: {
    fontWeight: '700',
    color: colors.royal,
  },
  cancelBtn: {
    marginTop: 8,
  },
});
