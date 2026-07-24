import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { FilePreviewModal } from '../../components/FilePreviewModal';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import {
  useAdminFullSemesterReportActivities,
  useAdminFullSemesterReports,
  useReviewFullSemesterReport,
} from '../../hooks/useAdminData';
import { buildFileUrl } from '../../lib/api';
import { formatDate, formatRupiah } from '../../lib/format';
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

type DetailRoute = RouteProp<AdminStackParamList, 'VerifyFullSemesterReportDetail'>;

type PreviewTarget = { title: string; fileId?: string; fileName?: string };

export function VerifyFullSemesterReportDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { params } = useRoute<DetailRoute>();
  const token = useAuthStore((s) => s.token);
  const { data: reports } = useAdminFullSemesterReports();
  const { data: activities } = useAdminFullSemesterReportActivities(params.reportId);
  const reviewReport = useReviewFullSemesterReport();
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const report = reports?.find((r) => r.id === params.reportId);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

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

  const handleReview = async (status: 'verified' | 'revision') => {
    await reviewReport.mutateAsync({ id: report.id, status });
    navigation.goBack();
  };

  return (
    <View style={styles.screen}>
      <Header
        title={`Semester ${ROMAN[report.semesterNumber - 1] ?? report.semesterNumber}`}
        onBack={navigation.goBack}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.name}>{report.participantName ?? '-'}</Text>
              <Text style={styles.subtitle}>{report.participantIdNumber ?? '-'}</Text>
            </View>
            <Badge status={STATUS_BADGE[report.status]} label={STATUS_LABEL[report.status]} />
          </View>

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
              {pdfError ? <Text style={styles.pdfError}>{pdfError}</Text> : null}
            </>
          ) : null}

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
            <InfoRow
              label="Total Pengajuan"
              value={report.totalAmount !== undefined ? formatRupiah(report.totalAmount) : '-'}
            />
          </Card>

          <Text style={styles.sectionTitle}>Kelengkapan Lampiran</Text>
          <Card style={styles.gapBottom}>
            <DocRow
              label="Komitmen Partisipan"
              fileId={report.commitmentParticipantFileId}
              onPress={() =>
                setPreview({
                  title: 'Komitmen Partisipan',
                  fileId: report.commitmentParticipantFileId,
                })
              }
            />
            <DocRow
              label="Komitmen Orang Tua/Wali"
              fileId={report.commitmentGuardianFileId}
              onPress={() =>
                setPreview({
                  title: 'Komitmen Orang Tua/Wali',
                  fileId: report.commitmentGuardianFileId,
                })
              }
            />
            <DocRow
              label="Kartu Hasil Studi (KHS)"
              fileId={report.khsFileId}
              onPress={() => setPreview({ title: 'Kartu Hasil Studi', fileId: report.khsFileId })}
            />
          </Card>

          <Text style={styles.sectionTitle}>
            Catatan dan Dokumentasi ({report.activityCount ?? 0}/5)
          </Text>
          {!activities || activities.length === 0 ? (
            <EmptyState
              icon="camera-outline"
              title="Belum ada kegiatan terpilih"
              subtitle="Laporan bulanan yang dipilih partisipan akan muncul di sini."
            />
          ) : (
            activities.map((m) => (
              <View key={m.id} style={styles.activityCard}>
                {m.fileId ? (
                  <Image
                    source={{
                      uri: buildFileUrl(m.fileId),
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    style={styles.activityPhoto}
                  />
                ) : null}
                <View style={styles.activityMain}>
                  <Text style={styles.activityDate}>{formatDate(m.reportDate)}</Text>
                  <Text style={styles.activityDesc} numberOfLines={2}>
                    {m.description}
                  </Text>
                </View>
              </View>
            ))
          )}

          {report.status === 'pending' ? (
            <View style={styles.btnRow}>
              <Button
                label="Minta Revisi"
                variant="reject"
                style={styles.btn}
                loading={reviewReport.isPending}
                onPress={() => handleReview('revision')}
              />
              <Button
                label="Verifikasi"
                variant="approve"
                style={styles.btn}
                loading={reviewReport.isPending}
                onPress={() => handleReview('verified')}
              />
            </View>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>

      <FilePreviewModal
        visible={!!preview}
        title={preview?.title}
        fileId={preview?.fileId}
        fileName={preview?.fileName}
        token={token}
        onClose={() => setPreview(null)}
      />
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

function DocRow({
  label,
  fileId,
  onPress,
}: {
  label: string;
  fileId?: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.checklistLabel}>{label}</Text>
      {fileId ? (
        <Button label="Lihat" variant="ghost" style={styles.docBtn} onPress={onPress} />
      ) : (
        <Badge status="rejected" label="Belum Lengkap" />
      )}
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
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  pdfBtn: {
    marginBottom: 16,
  },
  pdfError: {
    fontSize: 10,
    color: colors.danger,
    marginTop: -10,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  gapBottom: {
    marginBottom: 20,
  },
  coverLetter: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.muted,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    marginRight: 8,
  },
  docBtn: {
    marginTop: 0,
    paddingHorizontal: 14,
    paddingVertical: 6,
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
    fontSize: 11,
    fontWeight: '700',
    color: colors.navy,
  },
  activityDesc: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  btn: {
    flex: 1,
    marginTop: 0,
  },
});
