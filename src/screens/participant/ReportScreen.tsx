import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { AddMonthlyReportModal, NewMonthlyReportInput } from '../../components/AddMonthlyReportModal';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ListItem } from '../../components/ListItem';
import { MonthlyReportDetailModal } from '../../components/MonthlyReportDetailModal';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import {
  useAddMonthlyReport,
  useDeleteMonthlyReport,
  useFullSemesterReports,
  useMonthlyReports,
  useUpdateMonthlyReport,
} from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';
import { FullSemesterReportStatus, MonthlyReport } from '../../types/models';

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

export function ReportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParticipantStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    data: monthlyReports,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useMonthlyReports();
  const addMonthlyReport = useAddMonthlyReport();
  const updateMonthlyReport = useUpdateMonthlyReport();
  const deleteMonthlyReport = useDeleteMonthlyReport();
  const { data: fullSemesterReports } = useFullSemesterReports();

  const [modalOpen, setModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MonthlyReport | null>(null);
  const [detailTarget, setDetailTarget] = useState<MonthlyReport | null>(null);
  const [editTarget, setEditTarget] = useState<MonthlyReport | null>(null);

  const handleSaveMonthlyReport = async (input: NewMonthlyReportInput) => {
    if (!user || !input.file) return;
    setSubmitError(null);
    try {
      const uploaded = await uploadFile(input.file, 'monthly-report', token, user.id);
      await addMonthlyReport.mutateAsync({
        description: input.description.trim(),
        reportDate: input.reportDate,
        fileId: uploaded.fileId,
      });
      setModalOpen(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan laporan bulanan.');
    }
  };

  const handleUpdateMonthlyReport = async (input: NewMonthlyReportInput) => {
    if (!user || !editTarget) return;
    setEditError(null);
    try {
      let fileId = editTarget.fileId;
      if (input.file) {
        const uploaded = await uploadFile(input.file, 'monthly-report', token, user.id);
        fileId = uploaded.fileId;
      }
      if (!fileId) {
        setEditError('Berkas/foto wajib diunggah.');
        return;
      }
      await updateMonthlyReport.mutateAsync({
        id: editTarget.id,
        description: input.description.trim(),
        reportDate: input.reportDate,
        fileId,
      });
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan laporan.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await deleteMonthlyReport.mutateAsync(target.id);
  };

  const requestDeleteFromEdit = () => {
    if (!editTarget) return;
    setDeleteTarget(editTarget);
    setEditTarget(null);
  };

  return (
    <View style={styles.screen}>
      <Header title="Laporan Saya" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.royal}
            colors={[colors.royal]}
          />
        }
      >
        <ResponsiveContainer>
          <Button
            label="+ Buat Laporan Bulan ini"
            variant="navy"
            style={styles.actionBtn}
            onPress={() => {
              setSubmitError(null);
              setModalOpen(true);
            }}
          />
          <Button
            label="+ Isi Laporan Semester Lengkap"
            variant="ghost"
            style={styles.actionBtn}
            onPress={() => navigation.navigate('FullSemesterReport')}
          />

          <Text style={styles.sectionTitle}>Laporan Bulanan</Text>
          {isLoading ? (
            <View>
              <Skeleton height={54} radiusSize={radius.md} style={styles.skeletonGap} />
              <Skeleton height={54} radiusSize={radius.md} style={styles.skeletonGap} />
            </View>
          ) : isError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat laporan"
                subtitle="Coba lagi sebentar lagi."
              />
              <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
            </View>
          ) : !monthlyReports || monthlyReports.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Belum ada laporan bulanan"
              subtitle="Catat aktivitasmu tiap bulan lewat tombol di atas."
            />
          ) : (
            monthlyReports.map((r) => (
              <ListItem
                key={r.id}
                icon="camera"
                iconBg={colors.skySoft}
                iconColor={colors.blue}
                title={formatDate(r.reportDate)}
                subtitle={r.description ?? '-'}
                onPress={() => setDetailTarget(r)}
              />
            ))
          )}

          {fullSemesterReports && fullSemesterReports.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, styles.gapTop]}>
                Riwayat Laporan Semester Lengkap
              </Text>
              {fullSemesterReports.map((r) => (
                <ListItem
                  key={r.id}
                  icon="school"
                  iconBg={colors.skySoft}
                  iconColor={colors.navy}
                  title={`Semester ${ROMAN[r.semesterNumber - 1] ?? r.semesterNumber}`}
                  subtitle={STATUS_LABEL[r.status]}
                  onPress={() =>
                    navigation.navigate('FullSemesterReportDetail', { reportId: r.id })
                  }
                  right={<Badge status={STATUS_BADGE[r.status]} label={STATUS_LABEL[r.status]} />}
                />
              ))}
            </>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>

      <AddMonthlyReportModal
        visible={modalOpen}
        saving={addMonthlyReport.isPending}
        errorText={submitError}
        onSave={handleSaveMonthlyReport}
        onClose={() => setModalOpen(false)}
      />

      <MonthlyReportDetailModal
        visible={!!detailTarget}
        report={detailTarget}
        token={token}
        onClose={() => setDetailTarget(null)}
        onEdit={() => {
          setEditError(null);
          setEditTarget(detailTarget);
          setDetailTarget(null);
        }}
      />

      <AddMonthlyReportModal
        visible={!!editTarget}
        mode="edit"
        initialValues={
          editTarget
            ? {
                description: editTarget.description ?? '',
                reportDate: editTarget.reportDate,
                fileId: editTarget.fileId,
              }
            : undefined
        }
        saving={updateMonthlyReport.isPending}
        errorText={editError}
        onSave={handleUpdateMonthlyReport}
        onClose={() => setEditTarget(null)}
        onDelete={requestDeleteFromEdit}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title="Hapus Laporan Bulanan"
        message="Yakin ingin menghapus laporan bulanan ini?"
        confirmLabel="Hapus"
        cancelLabel="Batal"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  actionBtn: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 12,
    marginBottom: 10,
  },
  skeletonGap: {
    marginTop: 8,
  },
  gapTop: {
    marginTop: 20,
  },
});
