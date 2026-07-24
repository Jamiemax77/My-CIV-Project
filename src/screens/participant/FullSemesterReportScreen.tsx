import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { AddMonthlyReportModal, NewMonthlyReportInput } from '../../components/AddMonthlyReportModal';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EditAcademicInfoModal } from '../../components/EditAcademicInfoModal';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { LineChart } from '../../components/LineChart';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import {
  useAddMonthlyReport,
  useCommitmentStatements,
  useFinalizeFullSemesterReport,
  useFullSemesterReports,
  useKhsUploads,
  useLinkActivity,
  useMonthlyReports,
  useReportActivityLinks,
  useSaveFullSemesterReportPdf,
  useSubmitFullSemesterReport,
  useUnlinkActivity,
  useUpdateAcademicInfo,
  useUploadCommitmentStatement,
  useUploadKhs,
} from '../../hooks/useParticipantData';
import { buildFileUrl, uploadFile } from '../../lib/api';
import { formatAmountInput, formatDate, parseAmountInput } from '../../lib/format';
import { generateFullSemesterReportPdf, openLocalFile } from '../../lib/pdf';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

const KHS_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const SUMMARY_CELL_W = 46;
const SUMMARY_LABEL_W = 70;

const schema = z.object({
  year: z.string().trim().min(4, 'Tahun wajib diisi'),
  sks: z
    .string()
    .trim()
    .min(1, 'SKS wajib diisi')
    .refine((v) => Number(v) > 0, 'SKS harus berupa angka'),
  ips: z
    .string()
    .trim()
    .min(1, 'IPS wajib diisi')
    .refine((v) => {
      const n = Number(v.replace(',', '.'));
      return n > 0 && n <= 4;
    }, 'IPS harus di antara 0 dan 4'),
  ipk: z
    .string()
    .trim()
    .min(1, 'IPK wajib diisi')
    .refine((v) => {
      const n = Number(v.replace(',', '.'));
      return n > 0 && n <= 4;
    }, 'IPK harus di antara 0 dan 4'),
  coverLetter: z
    .string()
    .trim()
    .min(10, 'Kata pengantar minimal 10 karakter')
    .max(200, 'Maksimal 200 karakter'),
  totalAmount: z
    .string()
    .min(1, 'Total pengajuan wajib diisi')
    .refine((v) => parseAmountInput(v) > 0, 'Total harus lebih dari 0'),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = { year: '', sks: '', ips: '', ipk: '', coverLetter: '', totalAmount: '' };

export function FullSemesterReportScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const {
    data: reports,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
    isRefetching: reportsRefetching,
  } = useFullSemesterReports();
  const submitReport = useSubmitFullSemesterReport();
  const { data: khsUploads, refetch: refetchKhs } = useKhsUploads();
  const uploadKhs = useUploadKhs();
  const { data: commitment, refetch: refetchCommitment } = useCommitmentStatements();
  const uploadCommitment = useUploadCommitmentStatement();
  const addMonthlyReport = useAddMonthlyReport();
  const updateAcademicInfo = useUpdateAcademicInfo();
  const finalizeReport = useFinalizeFullSemesterReport();
  const savePdf = useSaveFullSemesterReportPdf();

  const sortedReports = reports ?? [];
  const lastReport = sortedReports[sortedReports.length - 1];
  const activeReport = lastReport && lastReport.status !== 'verified' ? lastReport : undefined;
  const targetSemesterNumber = activeReport
    ? activeReport.semesterNumber
    : (lastReport?.semesterNumber ?? 0) + 1;
  const academicLocked = activeReport?.status === 'pending';
  const canEditAcademic = !activeReport || activeReport.status === 'revision' || activeReport.status === 'draft';
  const canFinalize = activeReport?.status === 'draft' || activeReport?.status === 'revision';

  const { data: monthlyReports } = useMonthlyReports();
  const activityLinksQuery = useReportActivityLinks(activeReport?.id);
  const linkActivity = useLinkActivity(activeReport?.id);
  const unlinkActivity = useUnlinkActivity(activeReport?.id);
  const linkedActivityIds = new Set(activityLinksQuery.data ?? []);
  const linkedReports = (monthlyReports ?? []).filter((m) => linkedActivityIds.has(m.id));

  const [academicError, setAcademicError] = React.useState<string | null>(null);
  const [khsError, setKhsError] = React.useState<string | null>(null);
  const [uploadingKhsSemester, setUploadingKhsSemester] = React.useState<number | null>(null);
  const [stmtError, setStmtError] = React.useState<string | null>(null);
  const [uploadingStmt, setUploadingStmt] = React.useState<'participant' | 'guardian' | null>(null);
  const [activityModalOpen, setActivityModalOpen] = React.useState(false);
  const [activityError, setActivityError] = React.useState<string | null>(null);
  const [finalizeError, setFinalizeError] = React.useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
  const [pdfError, setPdfError] = React.useState<string | null>(null);
  const [academicInfoModalOpen, setAcademicInfoModalOpen] = React.useState(false);
  const [academicInfoError, setAcademicInfoError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  React.useEffect(() => {
    if (activeReport && activeReport.status === 'revision') {
      reset({
        year: activeReport.year ?? '',
        sks: activeReport.sks !== undefined ? String(activeReport.sks) : '',
        ips: activeReport.ips !== undefined ? activeReport.ips.toFixed(2) : '',
        ipk: activeReport.ipk !== undefined ? activeReport.ipk.toFixed(2) : '',
        coverLetter: activeReport.coverLetter ?? '',
        totalAmount:
          activeReport.totalAmount !== undefined
            ? formatAmountInput(String(activeReport.totalAmount))
            : '',
      });
    } else if (!activeReport) {
      reset(emptyValues);
    }
    // Only re-sync when the target report identity/status actually changes.
  }, [activeReport?.id, activeReport?.status]);

  const coverLetterValue = watch('coverLetter');

  const onSubmitAcademic = async (values: FormValues) => {
    setAcademicError(null);
    try {
      await submitReport.mutateAsync({
        semesterNumber: targetSemesterNumber,
        year: values.year.trim(),
        sks: Number(values.sks),
        ips: Number(values.ips.replace(',', '.')),
        ipk: Number(values.ipk.replace(',', '.')),
        coverLetter: values.coverLetter.trim(),
        totalAmount: parseAmountInput(values.totalAmount),
      });
    } catch (err) {
      setAcademicError(err instanceof Error ? err.message : 'Gagal menyimpan data akademik.');
    }
  };

  const pickAndUploadKhs = async (semesterNumber: number) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setKhsError(null);
    setUploadingKhsSemester(semesterNumber);
    try {
      const uploaded = await uploadFile({ uri: asset.uri, name: asset.name }, 'khs', token, user?.id);
      await uploadKhs.mutateAsync({ semesterNumber, fileId: uploaded.fileId });
    } catch (err) {
      setKhsError(err instanceof Error ? err.message : 'Gagal mengunggah KHS.');
    } finally {
      setUploadingKhsSemester(null);
    }
  };

  const pickAndUploadStatement = async (type: 'participant' | 'guardian') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setStmtError(null);
    setUploadingStmt(type);
    try {
      const uploaded = await uploadFile(
        { uri: asset.uri, name: asset.name },
        'commitment-statement',
        token,
        user?.id
      );
      await uploadCommitment.mutateAsync({ type, fileId: uploaded.fileId });
    } catch (err) {
      setStmtError(err instanceof Error ? err.message : 'Gagal mengunggah pernyataan.');
    } finally {
      setUploadingStmt(null);
    }
  };

  const handleAddActivity = async (input: NewMonthlyReportInput) => {
    if (!user || !input.file) return;
    setActivityError(null);
    try {
      const uploaded = await uploadFile(input.file, 'monthly-report', token, user.id);
      const created = await addMonthlyReport.mutateAsync({
        description: input.description.trim(),
        reportDate: input.reportDate,
        fileId: uploaded.fileId,
      });
      if (activeReport) {
        await linkActivity.mutateAsync(created.id);
      }
      setActivityModalOpen(false);
    } catch (err) {
      setActivityError(err instanceof Error ? err.message : 'Gagal menyimpan kegiatan.');
    }
  };

  const handleSaveAcademicInfo = (input: { major: string; university: string }) => {
    setAcademicInfoError(null);
    updateAcademicInfo.mutate(input, {
      onSuccess: () => setAcademicInfoModalOpen(false),
      onError: (err) =>
        setAcademicInfoError(err instanceof Error ? err.message : 'Gagal menyimpan data akademik.'),
    });
  };

  const linkedCount = linkedActivityIds.size;

  const handleFinalize = async () => {
    if (!activeReport) return;
    setFinalizeError(null);
    try {
      await finalizeReport.mutateAsync(activeReport.id);
    } catch (err) {
      setFinalizeError(err instanceof Error ? err.message : 'Gagal mengirim laporan semester.');
    }
  };

  const handleGeneratePdf = async () => {
    if (!activeReport || !user) return;
    setPdfError(null);
    setPdfGenerating(true);
    try {
      const { uri, name } = await generateFullSemesterReportPdf(activeReport, user, linkedReports);
      const uploaded = await uploadFile({ uri, name }, 'full-semester-report-pdf', token, user.id);
      await savePdf.mutateAsync({ id: activeReport.id, fileId: uploaded.fileId });
      await openLocalFile(uri, name);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Gagal membuat laporan PDF.');
    } finally {
      setPdfGenerating(false);
    }
  };

  const toggleActivityLink = (monthlyReportId: string, linked: boolean) => {
    if (linked) {
      unlinkActivity.mutate(monthlyReportId);
    } else {
      linkActivity.mutate(monthlyReportId);
    }
  };

  const checklist = activeReport?.checklist ?? {
    commitment: !!(commitment?.participantStmtFileId && commitment?.guardianStmtFileId),
    khs: !!khsUploads?.some((k) => k.semesterNumber === targetSemesterNumber && k.fileId),
    activities: false,
  };
  const finalizeReady = checklist.commitment && checklist.khs && checklist.activities;
  const missingItems = [
    !checklist.commitment ? 'pernyataan komitmen' : null,
    !checklist.khs ? 'KHS semester ini' : null,
    !checklist.activities ? 'minimal 5 kegiatan' : null,
  ].filter((item): item is string => !!item);

  const fileName = `LS-${targetSemesterNumber}-${user?.fullName ?? ''}`;

  const ipkChartData = sortedReports
    .filter((r) => r.semesterNumber <= 8 && r.ipk !== undefined)
    .map((r) => ({ label: ROMAN[r.semesterNumber - 1] ?? String(r.semesterNumber), value: r.ipk as number }));

  const reportBySemester = new Map(sortedReports.map((r) => [r.semesterNumber, r]));
  const SUMMARY_SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1);

  const refreshAll = () =>
    Promise.all([refetchReports(), refetchKhs(), refetchCommitment()]);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Laporan Semester Lengkap" onBack={navigation.goBack} />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={reportsRefetching}
            onRefresh={refreshAll}
            tintColor={colors.royal}
            colors={[colors.royal]}
          />
        }
      >
        <ResponsiveContainer>
          {reportsLoading ? (
            <Skeleton height={200} radiusSize={radius.lg} />
          ) : reportsError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat data"
                subtitle="Coba lagi sebentar lagi."
              />
              <Button label="Coba Lagi" variant="ghost" onPress={() => refetchReports()} />
            </View>
          ) : (
            <>
              <Text style={styles.semesterBanner}>
                Melaporkan Semester {ROMAN[targetSemesterNumber - 1] ?? targetSemesterNumber}
              </Text>

              {/* 3. File name */}
              <Text style={styles.sectionTitle}>Nama File</Text>
              <Card style={styles.gapBottom}>
                <Text style={styles.fileName}>{fileName}</Text>
                <Text style={styles.myJournal}>MY JURNAL</Text>
              </Card>

              {/* 3b. Academic summary table */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gapBottom}>
                <View style={styles.summaryTable}>
                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryMetaLabelCell, { width: SUMMARY_LABEL_W }]}>
                      <Text style={styles.summaryMetaLabelText}>JURUSAN :</Text>
                    </View>
                    <View style={[styles.summaryMetaValueCell, { width: SUMMARY_CELL_W * 5 }]}>
                      <Text style={styles.summaryMetaValueText} numberOfLines={1}>
                        {user?.major || '-'}
                      </Text>
                    </View>
                    <View style={[styles.summaryMetaLabelCell, { width: SUMMARY_CELL_W * 2 }]}>
                      <Text style={styles.summaryMetaLabelText}>UNIVERSITAS :</Text>
                    </View>
                    <View style={[styles.summaryMetaValueCell, { width: SUMMARY_CELL_W * 5 }]}>
                      <Text style={styles.summaryMetaValueText} numberOfLines={1}>
                        {user?.university || '-'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={[styles.summaryLabelCell, styles.summaryHeadCell]}>
                      <Text style={styles.summaryHeadText}>Semester</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map((sem) => (
                      <View
                        key={sem}
                        style={[styles.summaryCell, styles.summaryHeadCell, { width: SUMMARY_CELL_W }]}
                      >
                        <Text style={styles.summaryHeadText}>{sem}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>Tahun</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map((sem) => (
                      <View key={sem} style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}>
                        <Text style={styles.summaryValueText}>
                          {reportBySemester.get(sem)?.year ?? '-'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>SKS</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map((sem) => (
                      <View key={sem} style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}>
                        <Text style={styles.summaryValueText}>
                          {reportBySemester.get(sem)?.sks ?? '-'}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>IPS</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map((sem) => {
                      const ips = reportBySemester.get(sem)?.ips;
                      return (
                        <View key={sem} style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}>
                          <Text style={styles.summaryValueText}>
                            {ips !== undefined ? ips.toFixed(2) : '-'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={[styles.summaryRow, styles.summaryRowLast]}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>IPK</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map((sem) => {
                      const ipk = reportBySemester.get(sem)?.ipk;
                      return (
                        <View key={sem} style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}>
                          <Text style={styles.summaryValueText}>
                            {ipk !== undefined ? ipk.toFixed(2) : '-'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* 2. Checklist */}
              <Text style={styles.sectionTitle}>Kelengkapan Lampiran</Text>
              <Card style={styles.gapBottom}>
                <ChecklistRow
                  label="Komitmen Partisipan & Orang Tua/Wali"
                  done={checklist.commitment}
                />
                <ChecklistRow label="Kartu Hasil Studi (KHS)" done={checklist.khs} />
                <ChecklistRow label="Laporan Kegiatan (min. 5)" done={checklist.activities} />
              </Card>

              {/* 1. Cover letter + total */}
              {academicLocked ? (
                <>
                  <Text style={styles.sectionTitle}>Status Laporan Semester Ini</Text>
                  <Card style={styles.gapBottom}>
                    <Badge status="pending" label="Menunggu Verifikasi" />
                    <Text style={styles.lockedNote}>
                      Laporan Semester {targetSemesterNumber} sudah dikirim
                      {activeReport ? ` pada ${formatDate(activeReport.createdAt)}` : ''} dan
                      menunggu verifikasi admin. Anda tetap dapat melengkapi KHS, pernyataan, dan
                      catatan kegiatan di bawah selama menunggu.
                    </Text>
                  </Card>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Kata Pengantar</Text>
                  <Controller
                    control={control}
                    name="coverLetter"
                    render={({ field }) => (
                      <Field
                        label="Kata Pengantar (maks. 200 karakter)"
                        multiline
                        placeholder="Kepada Yth Pengurus & Staf PPA Mawar Saron..."
                        value={field.value}
                        onChangeText={(t) => field.onChange(t.slice(0, 200))}
                        error={errors.coverLetter?.message}
                      />
                    )}
                  />
                  <Text style={styles.charCounter}>{coverLetterValue?.length ?? 0}/200</Text>

                  <Controller
                    control={control}
                    name="totalAmount"
                    render={({ field }) => (
                      <Field
                        label="Total Pengajuan (Rp)"
                        keyboardType="numeric"
                        placeholder="0"
                        value={field.value}
                        onChangeText={(t) => field.onChange(formatAmountInput(t))}
                        error={errors.totalAmount?.message}
                      />
                    )}
                  />

                  {/* 4. Academic figures for this semester */}
                  <Text style={[styles.sectionTitle, styles.gapTop]}>
                    Data Akademik Semester {targetSemesterNumber}
                  </Text>
                  <Card style={styles.academicInfoCard}>
                    <Text style={styles.academicInfoText}>
                      Jurusan: {user?.major ?? '-'} · Universitas: {user?.university ?? '-'}
                    </Text>
                    <Button
                      label="Edit"
                      variant="ghost"
                      style={styles.academicInfoEditBtn}
                      onPress={() => {
                        setAcademicInfoError(null);
                        setAcademicInfoModalOpen(true);
                      }}
                    />
                  </Card>
                  <View style={styles.row2}>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name="year"
                        render={({ field }) => (
                          <Field
                            label="Tahun"
                            placeholder="2026"
                            keyboardType="numeric"
                            value={field.value}
                            onChangeText={field.onChange}
                            error={errors.year?.message}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name="sks"
                        render={({ field }) => (
                          <Field
                            label="SKS"
                            placeholder="20"
                            keyboardType="numeric"
                            value={field.value}
                            onChangeText={field.onChange}
                            error={errors.sks?.message}
                          />
                        )}
                      />
                    </View>
                  </View>
                  <View style={styles.row2}>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name="ips"
                        render={({ field }) => (
                          <Field
                            label="IPS"
                            placeholder="3.45"
                            keyboardType="decimal-pad"
                            value={field.value}
                            onChangeText={field.onChange}
                            error={errors.ips?.message}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name="ipk"
                        render={({ field }) => (
                          <Field
                            label="IPK"
                            placeholder="3.45"
                            keyboardType="decimal-pad"
                            value={field.value}
                            onChangeText={field.onChange}
                            error={errors.ipk?.message}
                          />
                        )}
                      />
                    </View>
                  </View>

                  {academicError ? <Text style={styles.errorText}>{academicError}</Text> : null}
                  <Button
                    label={submitReport.isPending ? 'Menyimpan...' : 'Simpan Data Akademik'}
                    variant="navy"
                    onPress={handleSubmit(onSubmitAcademic)}
                    disabled={submitReport.isPending}
                    loading={submitReport.isPending}
                  />
                </>
              )}

              {/* Academic history table */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>Riwayat Akademik</Text>
              {sortedReports.length === 0 ? (
                <EmptyState
                  icon="school-outline"
                  title="Belum ada riwayat"
                  subtitle="Riwayat semester akan muncul setelah laporan pertama dikirim."
                />
              ) : (
                <>
                  <Card style={styles.gapBottom}>
                    <Text style={styles.trackTitle}>TRACK IPK</Text>
                    <LineChart data={ipkChartData} />
                  </Card>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gapBottom}>
                    <View>
                      <TableRow
                        label="Semester"
                        values={sortedReports.map((r) => ROMAN[r.semesterNumber - 1] ?? String(r.semesterNumber))}
                        header
                      />
                      <TableRow label="Tahun" values={sortedReports.map((r) => r.year ?? '-')} />
                      <TableRow label="SKS" values={sortedReports.map((r) => (r.sks ?? '-').toString())} />
                      <TableRow
                        label="IPS"
                        values={sortedReports.map((r) => (r.ips !== undefined ? r.ips.toFixed(2) : '-'))}
                      />
                      <TableRow
                        label="IPK"
                        values={sortedReports.map((r) => (r.ipk !== undefined ? r.ipk.toFixed(2) : '-'))}
                      />
                    </View>
                  </ScrollView>
                </>
              )}

              {/* 5. Unggah KHS */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>Unggah KHS</Text>
              <Card style={styles.gapBottom}>
                {KHS_SEMESTERS.map((sem) => {
                  const existing = khsUploads?.find((k) => k.semesterNumber === sem && k.fileId);
                  return (
                    <View key={sem} style={styles.uploadRow}>
                      <Text style={styles.uploadLabel}>Semester {ROMAN[sem - 1]}</Text>
                      {existing ? (
                        <Badge status="approved" label="Sudah diunggah" />
                      ) : (
                        <Button
                          label={uploadingKhsSemester === sem ? 'Mengunggah...' : 'Unggah'}
                          variant="ghost"
                          style={styles.uploadBtn}
                          disabled={uploadingKhsSemester !== null}
                          loading={uploadingKhsSemester === sem}
                          onPress={() => pickAndUploadKhs(sem)}
                        />
                      )}
                    </View>
                  );
                })}
                {khsError ? <Text style={styles.errorText}>{khsError}</Text> : null}
              </Card>

              {/* 7. Unggahan Pernyataan */}
              <Text style={styles.sectionTitle}>Unggahan Pernyataan</Text>
              <Card style={styles.gapBottom}>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>Pernyataan Komitmen Partisipan</Text>
                  {commitment?.participantStmtFileId ? (
                    <Badge status="approved" label="Sudah diunggah" />
                  ) : (
                    <Button
                      label={uploadingStmt === 'participant' ? 'Mengunggah...' : 'Unggah'}
                      variant="ghost"
                      style={styles.uploadBtn}
                      disabled={uploadingStmt !== null}
                      loading={uploadingStmt === 'participant'}
                      onPress={() => pickAndUploadStatement('participant')}
                    />
                  )}
                </View>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>Pernyataan Komitmen Orang Tua/Wali</Text>
                  {commitment?.guardianStmtFileId ? (
                    <Badge status="approved" label="Sudah diunggah" />
                  ) : (
                    <Button
                      label={uploadingStmt === 'guardian' ? 'Mengunggah...' : 'Unggah'}
                      variant="ghost"
                      style={styles.uploadBtn}
                      disabled={uploadingStmt !== null}
                      loading={uploadingStmt === 'guardian'}
                      onPress={() => pickAndUploadStatement('guardian')}
                    />
                  )}
                </View>
                {stmtError ? <Text style={styles.errorText}>{stmtError}</Text> : null}
              </Card>

              {/* 8. Catatan dan Dokumentasi */}
              <Text style={styles.sectionTitle}>Catatan dan Dokumentasi</Text>
              <Text style={styles.headerInfo}>
                Pilih minimal 5 Laporan Bulanan sebagai dokumentasi kegiatan semester ini.
              </Text>
              <Card style={styles.gapBottom}>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>+ Kegiatan / Aktifitas</Text>
                  <Button
                    label="Unggah"
                    variant="ghost"
                    style={styles.uploadBtn}
                    onPress={() => setActivityModalOpen(true)}
                  />
                </View>
                {activityError ? <Text style={styles.errorText}>{activityError}</Text> : null}

                {!activeReport ? (
                  <Text style={styles.lockedNote}>
                    Simpan laporan semester ini terlebih dahulu untuk memilih Laporan Bulanan.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.lockedNote}>{linkedCount}/5 kegiatan dipilih</Text>

                    {!monthlyReports || monthlyReports.length === 0 ? (
                      <EmptyState
                        icon="camera-outline"
                        title="Belum ada Laporan Bulanan"
                        subtitle="Tambahkan Kegiatan/Aktifitas di atas untuk mulai dokumentasi."
                      />
                    ) : (
                      monthlyReports.map((m) => {
                        const linked = linkedActivityIds.has(m.id);
                        return (
                          <Pressable
                            key={m.id}
                            style={styles.activityCard}
                            onPress={() => toggleActivityLink(m.id, linked)}
                          >
                            <Ionicons
                              name={linked ? 'checkbox' : 'square-outline'}
                              size={20}
                              color={linked ? colors.royal : colors.muted}
                            />
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
                          </Pressable>
                        );
                      })
                    )}

                    {canFinalize ? (
                      <>
                        {!finalizeReady ? (
                          <Text style={styles.lockedNote}>
                            Lengkapi sebelum mengirim: {missingItems.join(', ')}.
                          </Text>
                        ) : null}
                        {finalizeError ? <Text style={styles.errorText}>{finalizeError}</Text> : null}
                        <Button
                          label={finalizeReport.isPending ? 'Mengirim...' : 'Kirim Laporan Semester Lengkap'}
                          variant="navy"
                          style={styles.sendDocsBtn}
                          disabled={!finalizeReady || finalizeReport.isPending}
                          loading={finalizeReport.isPending}
                          onPress={handleFinalize}
                        />
                      </>
                    ) : null}

                    {pdfError ? <Text style={styles.errorText}>{pdfError}</Text> : null}
                    <Button
                      label={pdfGenerating ? 'Membuat PDF...' : 'Buat Laporan PDF'}
                      variant="ghost"
                      style={styles.sendDocsBtn}
                      disabled={pdfGenerating}
                      loading={pdfGenerating}
                      onPress={handleGeneratePdf}
                    />
                  </>
                )}
              </Card>
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>

      <AddMonthlyReportModal
        visible={activityModalOpen}
        saving={addMonthlyReport.isPending || linkActivity.isPending}
        errorText={activityError}
        onSave={handleAddActivity}
        onClose={() => {
          setActivityModalOpen(false);
          setActivityError(null);
        }}
      />

      <EditAcademicInfoModal
        visible={academicInfoModalOpen}
        currentMajor={user?.major}
        currentUniversity={user?.university}
        saving={updateAcademicInfo.isPending}
        errorText={academicInfoError}
        onSave={handleSaveAcademicInfo}
        onClose={() => setAcademicInfoModalOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checklistRow}>
      <Text style={styles.checklistLabel}>{label}</Text>
      <Badge status={done ? 'approved' : 'rejected'} label={done ? 'Lengkap' : 'Belum Lengkap'} />
    </View>
  );
}

function TableRow({ label, values, header }: { label: string; values: string[]; header?: boolean }) {
  return (
    <View style={styles.tableRow}>
      <Text style={[styles.tableCell, styles.tableLabelCell, header && styles.tableHeaderText]}>
        {label}
      </Text>
      {values.map((v, i) => (
        <Text key={i} style={[styles.tableCell, header && styles.tableHeaderText]}>
          {v}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  semesterBanner: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  gapTop: {
    marginTop: 22,
  },
  gapBottom: {
    marginBottom: 20,
  },
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    marginRight: 8,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
  },
  myJournal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1,
  },
  charCounter: {
    fontSize: 10,
    color: colors.muted,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 8,
  },
  lockedNote: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 17,
    marginTop: 8,
  },
  headerInfo: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 12,
  },
  academicInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  academicInfoText: {
    flex: 1,
    fontSize: 11,
    color: colors.muted,
  },
  academicInfoEditBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  row2: {
    flexDirection: 'row',
    gap: 10,
  },
  row2Col: {
    flex: 1,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    width: 64,
    fontSize: 11,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  tableLabelCell: {
    width: 80,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'left',
  },
  tableHeaderText: {
    fontWeight: '700',
    color: colors.navy,
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  uploadLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.text,
    marginRight: 8,
  },
  uploadBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  sendDocsBtn: {
    marginTop: 10,
  },
  trackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10,
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabelCell: {
    width: SUMMARY_LABEL_W,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  summaryLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
  },
  summaryCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  summaryValueText: {
    fontSize: 10,
    color: colors.text,
  },
  summaryHeadCell: {
    backgroundColor: '#f6b989',
  },
  summaryHeadText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.navy,
  },
  summaryMetaLabelCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.navy,
  },
  summaryMetaLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryMetaValueCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  summaryMetaValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text,
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
});
