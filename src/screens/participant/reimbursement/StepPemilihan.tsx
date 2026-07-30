import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { Chip, ChipGroup } from '../../../components/Chip';
import { JenisPengajuanKode } from '../../../lib/generateNomorPengajuan';
import { REIMBURSEMENT_CATEGORY_LABEL } from '../../../lib/labels';
import { colors } from '../../../theme';
import { ReimbursementCategory } from '../../../types/models';

const JENIS_OPTIONS: Array<{ key: JenisPengajuanKode; label: string }> = [
  { key: 'reimburse', label: 'Reimbursement' },
  { key: 'return', label: 'Pengembalian Sisa' },
  { key: 'lainnya', label: 'Transaksi Lainnya' },
  { key: 'kasbon', label: 'Pengajuan Kasbon' },
];

const CATEGORIES = Object.entries(REIMBURSEMENT_CATEGORY_LABEL) as Array<
  [ReimbursementCategory, string]
>;

type StepPemilihanProps = {
  jenis: JenisPengajuanKode | null;
  kategori: ReimbursementCategory | null;
  onSelectJenis: (jenis: JenisPengajuanKode) => void;
  onSelectKategori: (kategori: ReimbursementCategory) => void;
  onBuatPengajuan: () => void;
  creating?: boolean;
};

/** Step 1 of the Ajukan Pengembalian wizard: pick Jenis Pengajuan, then Kategori, then
 * "Buat Pengajuan" advances to Step 2 (FormPengajuan). */
export function StepPemilihan({
  jenis,
  kategori,
  onSelectJenis,
  onSelectKategori,
  onBuatPengajuan,
  creating,
}: StepPemilihanProps) {
  return (
    <View>
      <Text style={styles.label}>Jenis Pengajuan</Text>
      <ChipGroup>
        {JENIS_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={jenis === opt.key}
            onPress={() => onSelectJenis(opt.key)}
          />
        ))}
      </ChipGroup>

      {jenis ? (
        <View style={styles.fieldGap}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(([key, label]) => (
              <Chip
                key={key}
                label={label}
                active={kategori === key}
                onPress={() => onSelectKategori(key)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {jenis && kategori ? (
        <Button
          label="Buat Pengajuan"
          onPress={onBuatPengajuan}
          disabled={creating}
          loading={creating}
          style={styles.buatBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  fieldGap: {
    marginTop: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  buatBtn: {
    marginTop: 20,
  },
});
