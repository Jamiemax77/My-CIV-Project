import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UploadBox, UploadFile } from '../../../components/UploadBox';
import { colors } from '../../../theme';

type UploadBuktiProps = {
  label: string;
  value: UploadFile | null;
  onChange: (file: UploadFile | null) => void;
  error?: string | null;
};

/** One required upload slot for FormPengajuan (Step 2) — thin domain wrapper around the
 * shared UploadBox (camera/gallery/PDF picker, image/* + application/pdf, 5MB max, thumbnail
 * preview for images) adding a label and a "required" error line. */
export function UploadBukti({ label, value, onChange, error }: UploadBuktiProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <UploadBox mode="both" value={value} onChange={onChange} />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 13,
  },
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
