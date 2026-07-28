import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import { formatDateTime, formatRupiah } from '../../lib/format';
import { openLocalFile, shareOrDownloadPdf } from '../../lib/pdf';
import { ARCHIVE_DOC_TYPE_LABEL, ArchiveEntry, useArchiveStore } from '../../store/archiveStore';
import { colors, radius } from '../../theme';

export function ArchiveScreen() {
  const navigation = useNavigation();
  const entries = useArchiveStore((s) => s.entries);
  const hydrated = useArchiveStore((s) => s.hydrated);
  const hydrate = useArchiveStore((s) => s.hydrate);
  const markShared = useArchiveStore((s) => s.markShared);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const openEntry = async (entry: ArchiveEntry) => {
    setError(null);
    setBusyId(entry.id);
    try {
      await openLocalFile(entry.uri, entry.fileName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka berkas.');
    } finally {
      setBusyId(null);
    }
  };

  const shareEntry = async (entry: ArchiveEntry) => {
    setError(null);
    setBusyId(entry.id);
    try {
      await shareOrDownloadPdf(entry.uri, entry.fileName);
      await markShared(entry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membagikan berkas.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <Header variant="admin" title="Arsip Laporan (Cashier)" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
          {!hydrated ? (
            <>
              <Skeleton height={90} radiusSize={radius.lg} style={styles.gap} />
              <Skeleton height={90} radiusSize={radius.lg} style={styles.gap} />
            </>
          ) : entries.length === 0 ? (
            <EmptyState
              icon="document-lock-outline"
              title="Belum ada arsip"
              subtitle="PDF voucher pencairan, bukti transfer, dan berita acara verifikasi yang Anda export akan muncul di sini."
            />
          ) : (
            entries.map((entry) => (
              <Card key={entry.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardTopLeft}>
                    <Text style={styles.docType}>{ARCHIVE_DOC_TYPE_LABEL[entry.type]}</Text>
                    <Text style={styles.participant} numberOfLines={1}>
                      {entry.participantName} · {entry.participantIdNumber}
                    </Text>
                  </View>
                  {entry.shared ? <Badge status="approved" label="Terkirim" /> : null}
                </View>
                <Text style={styles.amount}>{formatRupiah(entry.amount)}</Text>
                <Text style={styles.fileName} numberOfLines={1}>
                  {entry.fileName}
                </Text>
                <Text style={styles.date}>{formatDateTime(entry.createdAt)}</Text>
                <View style={styles.btnRow}>
                  <Button
                    label="Buka"
                    variant="ghost"
                    style={styles.btn}
                    disabled={busyId === entry.id}
                    onPress={() => openEntry(entry)}
                  />
                  <Button
                    label="Bagikan"
                    variant="ghost"
                    style={styles.btn}
                    disabled={busyId === entry.id}
                    onPress={() => shareEntry(entry)}
                  />
                </View>
              </Card>
            ))
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  gap: {
    marginTop: 12,
  },
  card: {
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: {
    flexShrink: 1,
  },
  docType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
  },
  participant: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  fileName: {
    fontSize: 12,
    color: colors.blue,
    marginTop: 4,
  },
  date: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    textAlign: 'center',
  },
});
