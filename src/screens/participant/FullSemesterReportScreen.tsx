import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { LineChart } from '../../components/LineChart';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { Skeleton } from '../../components/Skeleton';
import {
  useCommitmentStatements,
  useFullSemesterReports,
  useKhsUploads,
  useLinkActivity,
  useMonthlyReports,
  useReportActivityLinks,
  useSubmitFullSemesterReport,
  useUnlinkActivity,
  useUploadCommitmentStatement,
  useUploadKhs,
} from '../../hooks/useParticipantData';
import { buildFileUrl, uploadFile } from '../../lib/api';
import { formatAmountInput, formatDate, parseAmountInput } from '../../lib/format';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

const KHS_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

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

  const sortedReports = reports ?? [];
  const lastReport = sortedReports[sortedReports.length - 1];
  const activeReport = lastReport && lastReport.status !== 'verified' ? lastReport : undefined;
  const targetSemesterNumber = activeReport
    ? activeReport.semesterNumber
    : (lastReport?.semesterNumber ?? 0) + 1;
  const academicLocked = activeReport?.status === 'pending';
  const canEditAcademic = !activeReport || activeReport.status === 'revision';

  const { data: monthlyReports } = useMonthlyReports();
  const activityLinksQuery = useReportActivityLinks(activeReport?.id);
  const linkActivity = useLinkActivity(activeReport?.id);
  const unlinkActivity = useUnlinkActivity(activeReport?.id);
  const linkedActivityIds = new Set(activityLinksQuery.data ?? []);

  const [academicError, setAcademicError] = React.useState<string | null>(null);
  const [khsError, setKhsError] = React.useState<string | null>(null);
  const [uploadingKhsSemester, setUploadingKhsSemester] = React.useState<number | null>(null);
  const [stmtError, setStmtError] = React.useState<string | null>(null);
  const [uploadingStmt, setUploadingStmt] = React.useState<'participant' | 'guardian' | null>(null);

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
      setAcademicError(err instanceof Error ? err.message : 'Gagal mengirim laporan.');
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

  const fileName = `LS-${targetSemesterNumber}-${user?.fullName ?? ''}`;

  const ipkChartData = sortedReports
    .filter((r) => r.semesterNumber <= 8 && r.ipk !== undefined)
    .map((r) => ({ label: ROMAN[r.semesterNumber - 1] ?? String(r.semesterNumber), value: r.ipk as number }));

  const refreshAll = () =>
    Promise.all([refetchReports(), refetchKhs(), refetchCommitment()]);

  return (
    <View style={styles.screen}>
      <Header title="Laporan Semester Lengkap" onBack={navigation.goBack} />
      <ScrollView
        contentContainerStyle={styles.body}
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

              {/* 3. File name */}
              <Text style={styles.sectionTitle}>Nama File</Text>
              <Card style={styles.gapBottom}>
                <Text style={styles.fileName}>{fileName}</Text>
                <Text style={styles.myJournal}>MY JURNAL</Text>
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
                  <Text style={styles.headerInfo}>
                    Jurusan: {user?.major ?? '-'} · Universitas: {user?.university ?? '-'}
                  </Text>
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
                    label={submitReport.isPending ? 'Mengirim...' : 'Kirim Laporan Semester Ini'}
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
              )}

              {/* 6. TRACK IPA chart */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>Track IPK (Semester I–VIII)</Text>
              <Card style={styles.gapBottom}>
                <LineChart data={ipkChartData} />
              </Card>

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
              {!activeReport ? (
                <Text style={styles.lockedNote}>
                  Simpan laporan semester ini terlebih dahulu untuk memilih Laporan Bulanan.
                </Text>
              ) : !monthlyReports || monthlyReports.length === 0 ? (
                <EmptyState
                  icon="camera-outline"
                  title="Belum ada Laporan Bulanan"
                  subtitle="Buat Laporan Bulanan dulu di halaman Laporan Saya, lalu pilih di sini."
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
            </>
          )}
        </ResponsiveContainer>
      </ScrollView>
    </View>
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
    fontSize: 10,
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
