import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { AuthImage } from '../../components/AuthImage';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import {
  useBudgetItems,
  useFullSemesterReports,
  useMonthlyReports,
  useReportActivityLinks,
} from '../../hooks/useParticipantData';
import { formatDate, formatRupiah } from '../../lib/format';
import { MONTHLY_REPORT_CATEGORY_LABEL } from '../../lib/labels';
import { openRemotePdf } from '../../lib/pdf';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { FullSemesterReportStatus } from '../../types/models';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const STATUS_LABEL: Record<FullSemesterReportStatus, string> = {
  draft: 'Draft',
  pending: 'Menunggu',
  verified: 'Terverifikasi',
  revision: 'Revisi',
};

const STATUS_BADGE: Record<FullSemesterReportStatus, 'pending' | 'approved' | 'rejected'> = {
  draft: 'pending',
  pending: 'pending',
  verified: 'approved',
  revision: 'rejected',
};

type FullSemesterReportDetailRoute = RouteProp<
  ParticipantStackParamList,
  'FullSemesterReportDetail'
>;

export function FullSemesterReportDetailScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<FullSemesterReportDetailRoute>();
  const token = useAuthStore((s) => s.token);
  const { data: reports } = useFullSemesterReports();
  const { data: monthlyReports } = useMonthlyReports();
  const { data: linkedIds } = useReportActivityLinks(params.reportId);
  const { data: budgetItems } = useBudgetItems(params.reportId);

  const report = reports?.find((r) => r.id === params.reportId);
  const linkedReports = (monthlyReports ?? []).filter((m) => linkedIds?.includes(m.id));
  const [openingPdf, setOpeningPdf] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);

  const handleOpenPdf = async () => {
    if (!report?.pdfFileId) return;
    setPdfError(null);
    setOpeningPdf(true);
    try {
      await openRemotePdf(report.pdfFileId, token, `${report.fileName || 'laporan-semester'}.pdf`);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Gagal membuka laporan PDF.');
    } finally {
      setOpeningPdf(false);
    }
  };

  if (!report) {
    return (
      <View style={styles.screen}>
        <Header title="Detail Laporan Semester" onBack={navigation.goBack} />
        <ScrollView contentContainerStyle={styles.body}>
          <EmptyState
            icon="document-text-outline"
            title="Data tidak ditemukan"
            subtitle="Laporan ini mungkin sudah tidak tersedia."
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header
        title={`Detail Laporan Semester ${ROMAN[report.semesterNumber - 1] ?? report.semesterNumber}`}
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
          <View style={styles.statusRow}>
            <Badge status={STATUS_BADGE[report.status]} label={STATUS_LABEL[report.status]} />
            <Text style={styles.dateText}>{formatDate(report.createdAt)}</Text>
          </View>

          <Text style={styles.sectionTitle}>Nama File</Text>
          <Card style={styles.gapBottom}>
            <Text style={styles.fileName}>{report.fileName}</Text>
            {report.pdfFileId ? (
              <>
                <Button
                  label={openingPdf ? 'Membuka...' : 'Buka Laporan PDF'}
                  variant="ghost"
                  style={styles.pdfBtn}
                  disabled={openingPdf}
                  loading={openingPdf}
                  onPress={handleOpenPdf}
                />
                {pdfError ? <Text style={styles.errorText}>{pdfError}</Text> : null}
              </>
            ) : null}
          </Card>

          <Text style={styles.sectionTitle}>Kata Pengantar</Text>
          <Card style={styles.gapBottom}>
            <Text style={styles.coverLetter}>{report.coverLetter ?? '-'}</Text>
          </Card>

          <Text style={styles.sectionTitle}>Data Akademik</Text>
          <Card style={styles.gapBottom}>
            <InfoRow label="Tahun" value={report.year ?? '-'} />
            <InfoRow label="SKS" value={report.sks !== undefined ? String(report.sks) : '-'} />
            <InfoRow label="IPS" value={report.ips !== undefined ? report.ips.toFixed(2) : '-'} />
            <InfoRow label="IPK" value={report.ipk !== undefined ? report.ipk.toFixed(2) : '-'} />
          </Card>

          <Text style={styles.sectionTitle}>Rincian Penggunaan Dana</Text>
          <Card style={styles.gapBottom}>
            {!budgetItems || budgetItems.length === 0 ? (
              <EmptyState
                icon="cash-outline"
                title="Belum ada rincian"
                subtitle="Laporan ini belum memiliki rincian penggunaan dana."
              />
            ) : (
              budgetItems.map((item, i) => (
                <View key={item.id} style={styles.budgetRow}>
                  <Text style={styles.budgetKeterangan} numberOfLines={2}>
                    {i + 1}. {item.keterangan}
                  </Text>
                  <Text style={styles.budgetDetail}>
                    {item.unit} × {formatRupiah(item.satuan)} = {formatRupiah(item.jumlah)}
                  </Text>
                </View>
              ))
            )}
            <InfoRow label="Kontribusi Orangtua/Wali" value={formatRupiah(report.kontribusiOrtu ?? 0)} />
            <InfoRow
              label="Total Biaya CIV"
              value={report.totalAmount !== undefined ? formatRupiah(report.totalAmount) : '-'}
            />
          </Card>

          <Text style={styles.sectionTitle}>Kelengkapan Lampiran</Text>
          <Card style={styles.gapBottom}>
            <ChecklistRow label="Komitmen Partisipan & Orang Tua/Wali" done={!!report.checklist?.commitment} />
            <ChecklistRow label="Kartu Hasil Studi (KHS)" done={!!report.checklist?.khs} />
            <ChecklistRow
              label={`Laporan Kegiatan (${report.activityCount ?? 0}/5)`}
              done={!!report.checklist?.activities}
            />
            <ChecklistRow label="Rincian Penggunaan Dana" done={!!report.checklist?.budget} />
          </Card>

          <Text style={styles.sectionTitle}>Catatan dan Dokumentasi</Text>
          {linkedReports.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="Belum ada kegiatan terpilih"
              subtitle="Laporan bulanan yang dipilih untuk semester ini akan muncul di sini."
            />
          ) : (
            linkedReports.map((m) => (
              <View key={m.id} style={styles.activityCard}>
                {m.fileId ? (
                  <AuthImage fileId={m.fileId} token={token} style={styles.activityPhoto} />
                ) : null}
                <View style={styles.activityMain}>
                  <Text style={styles.activityDate}>
                    {formatDate(m.reportDate)} · {MONTHLY_REPORT_CATEGORY_LABEL[m.category]}
                  </Text>
                  <Text style={styles.activityDesc} numberOfLines={2}>
                    {m.description}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.checklistLabel}>{label}</Text>
      <Badge status={done ? 'approved' : 'rejected'} label={done ? 'Lengkap' : 'Belum Lengkap'} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: colors.muted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  gapBottom: {
    marginBottom: 20,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  coverLetter: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 19,
  },
  pdfBtn: {
    marginTop: 10,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8,
  },
  budgetRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  budgetKeterangan: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  budgetDetail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginBottom: 8,
  },
  activityPhoto: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
  },
  activityMain: {
    flex: 1,
  },
  activityDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
  },
  activityDesc: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2,
  },
});
