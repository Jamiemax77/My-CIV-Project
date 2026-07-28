import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AdminParticipant } from '../types/models';
import { colors } from '../theme';
import { Chip, ChipGroup } from './Chip';

type ParticipantPickerProps = {
  label?: string;
  participants: AdminParticipant[] | undefined;
  value: string;
  onChange: (participantId: string) => void;
  error?: string;
};

/** Chip-list participant picker shared by every admin flow that needs "pilih partisipan"
 * (previously duplicated inline in InputFundScreen and UploadTransferProofScreen). */
export function ParticipantPicker({
  label = 'Pilih Partisipan',
  participants,
  value,
  onChange,
  error,
}: ParticipantPickerProps) {
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <ChipGroup>
        {(participants ?? []).map((p) => (
          <Chip
            key={p.profile.id}
            label={`${p.profile.fullName} — ${p.profile.idNumber}`}
            active={value === p.profile.id}
            onPress={() => onChange(p.profile.id)}
          />
        ))}
      </ChipGroup>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
});
