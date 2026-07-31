import { Ionicons } from '@expo/vector-icons'
import { zodResolver } from '@hookform/resolvers/zod'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { z } from 'zod'
import { ParticipantStackParamList } from '../../app/ParticipantStack'
import {
  AddBudgetItemModal,
  NewBudgetItemInput
} from '../../components/AddBudgetItemModal'
import {
  AddMonthlyReportModal,
  NewMonthlyReportInput
} from '../../components/AddMonthlyReportModal'
import { AuthImage } from '../../components/AuthImage'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmModal } from '../../components/ConfirmModal'
import {
  DocPickerModal,
  DocPickerOption
} from '../../components/DocPickerModal'
import { EditAcademicInfoModal } from '../../components/EditAcademicInfoModal'
import { EmptyState } from '../../components/EmptyState'
import { Field } from '../../components/Field'
import { FilePreviewModal } from '../../components/FilePreviewModal'
import { Header } from '../../components/Header'
import { LineChart } from '../../components/LineChart'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { Skeleton } from '../../components/Skeleton'
import { SuccessModal } from '../../components/SuccessModal'
import { YearPickerField } from '../../components/YearPickerField'
import {
  useAddBudgetItem,
  useAddMonthlyReport,
  useBudgetItems,
  useCommitmentStatements,
  useDeleteBudgetItem,
  useDeleteCommitmentStatement,
  useDeleteKhsUpload,
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
  useUpdateKontribusi,
  useUploadCommitmentStatement,
  useUploadKhs
} from '../../hooks/useParticipantData'
import { uploadFile } from '../../lib/api'
import {
  formatAmountInput,
  formatDate,
  formatRupiah,
  parseAmountInput
} from '../../lib/format'
import { generateFullSemesterReportPdf, openLocalFile } from '../../lib/pdf'
import { useAuthStore } from '../../store/authStore'
import { colors, radius } from '../../theme'

type DeleteTarget =
  | { kind: 'statement'; type: 'participant' | 'guardian' }
  | { kind: 'khs'; semester: number; docType: 'khs' | 'krs' }
  | { kind: 'budget'; itemId: string }

const KHS_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]
const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII'
]
const SUMMARY_CELL_W = 46
const SUMMARY_LABEL_W = 70

const schema = z.object({
  year: z.string().trim().min(4, 'Tahun wajib diisi'),
  sks: z
    .string()
    .trim()
    .min(1, 'SKS wajib diisi')
    .refine(v => Number(v) > 0, 'SKS harus berupa angka'),
  ips: z
    .string()
    .trim()
    .min(1, 'IPS wajib diisi')
    .refine(v => {
      const n = Number(v.replace(',', '.'))
      return n > 0 && n <= 4
    }, 'IPS harus di antara 0 dan 4'),
  ipk: z
    .string()
    .trim()
    .min(1, 'IPK wajib diisi')
    .refine(v => {
      const n = Number(v.replace(',', '.'))
      return n > 0 && n <= 4
    }, 'IPK harus di antara 0 dan 4'),
  coverLetter: z
    .string()
    .trim()
    .min(10, 'Kata pengantar minimal 10 karakter')
    .max(200, 'Maksimal 200 karakter')
})

type FormValues = z.infer<typeof schema>

const emptyValues: FormValues = {
  year: '',
  sks: '',
  ips: '',
  ipk: '',
  coverLetter: ''
}

export function FullSemesterReportScreen () {
  const navigation = useNavigation()
  const route =
    useRoute<RouteProp<ParticipantStackParamList, 'FullSemesterReport'>>()
  const requestedReportId = route.params?.reportId
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)

  const {
    data: reports,
    isLoading: reportsLoading,
    isError: reportsError,
    refetch: refetchReports,
    isRefetching: reportsRefetching
  } = useFullSemesterReports()
  const submitReport = useSubmitFullSemesterReport()
  const { data: khsUploads, refetch: refetchKhs } = useKhsUploads()
  const uploadKhs = useUploadKhs()
  const deleteKhsUpload = useDeleteKhsUpload()
  const { data: commitment, refetch: refetchCommitment } =
    useCommitmentStatements()
  const uploadCommitment = useUploadCommitmentStatement()
  const deleteCommitment = useDeleteCommitmentStatement()
  const addMonthlyReport = useAddMonthlyReport()
  const updateAcademicInfo = useUpdateAcademicInfo()
  const finalizeReport = useFinalizeFullSemesterReport()
  const savePdf = useSaveFullSemesterReportPdf()

  const sortedReports = reports ?? []
  const lastReport = sortedReports[sortedReports.length - 1]
  // "Perbaiki"/"Lengkapi" on ReportScreen's history pass a specific reportId to target —
  // takes priority over the auto-detect-"last non-verified" heuristic below, since that
  // heuristic assumes only the most recent semester can ever be reopened for editing.
  const requestedReport = requestedReportId
    ? sortedReports.find(r => r.id === requestedReportId)
    : undefined
  const activeReport =
    requestedReport ??
    (lastReport && lastReport.status !== 'verified' ? lastReport : undefined)
  const targetSemesterNumber = activeReport
    ? activeReport.semesterNumber
    : (lastReport?.semesterNumber ?? 0) + 1
  const academicLocked = activeReport?.status === 'pending'
  const canEditAcademic =
    !activeReport ||
    activeReport.status === 'revision' ||
    activeReport.status === 'draft'
  const canFinalize =
    activeReport?.status === 'draft' || activeReport?.status === 'revision'

  const { data: monthlyReports } = useMonthlyReports()
  const activityLinksQuery = useReportActivityLinks(activeReport?.id)
  const linkActivity = useLinkActivity(activeReport?.id)
  const unlinkActivity = useUnlinkActivity(activeReport?.id)
  const { data: budgetItems } = useBudgetItems(activeReport?.id)
  const addBudgetItem = useAddBudgetItem(activeReport?.id)
  const deleteBudgetItem = useDeleteBudgetItem(activeReport?.id)
  const updateKontribusi = useUpdateKontribusi(activeReport?.id)
  const linkedActivityIds = new Set(activityLinksQuery.data ?? [])
  const linkedReports = (monthlyReports ?? []).filter(m =>
    linkedActivityIds.has(m.id)
  )

  const [academicError, setAcademicError] = React.useState<string | null>(null)
  const [khsError, setKhsError] = React.useState<string | null>(null)
  const [khsSuccessMessage, setKhsSuccessMessage] = React.useState<
    string | null
  >(null)
  const [uploadingKhs, setUploadingKhs] = React.useState<{
    semester: number
    docType: 'khs' | 'krs'
  } | null>(null)
  const [stmtError, setStmtError] = React.useState<string | null>(null)
  const [uploadingStmt, setUploadingStmt] = React.useState<
    'participant' | 'guardian' | null
  >(null)
  const [filePreview, setFilePreview] = React.useState<{
    title: string
    fileId?: string
    deleteTarget?: DeleteTarget
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<DeleteTarget | null>(
    null
  )
  const [deleteSuccessMessage, setDeleteSuccessMessage] = React.useState<
    string | null
  >(null)
  const [khsDocPicker, setKhsDocPicker] = React.useState<{
    semester: number
  } | null>(null)
  const [activityModalOpen, setActivityModalOpen] = React.useState(false)
  const [activityError, setActivityError] = React.useState<string | null>(null)
  const [finalizeError, setFinalizeError] = React.useState<string | null>(null)
  const [pdfGenerating, setPdfGenerating] = React.useState(false)
  const [pdfError, setPdfError] = React.useState<string | null>(null)
  const [academicInfoModalOpen, setAcademicInfoModalOpen] =
    React.useState(false)
  const [academicInfoError, setAcademicInfoError] = React.useState<
    string | null
  >(null)
  const [budgetModalOpen, setBudgetModalOpen] = React.useState(false)
  const [budgetError, setBudgetError] = React.useState<string | null>(null)
  const [kontribusiInput, setKontribusiInput] = React.useState('')

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues
  })

  React.useEffect(() => {
    if (activeReport && activeReport.status === 'revision') {
      reset({
        year: activeReport.year ?? '',
        sks: activeReport.sks !== undefined ? String(activeReport.sks) : '',
        ips: activeReport.ips !== undefined ? activeReport.ips.toFixed(2) : '',
        ipk: activeReport.ipk !== undefined ? activeReport.ipk.toFixed(2) : '',
        coverLetter: activeReport.coverLetter ?? ''
      })
    } else if (!activeReport) {
      reset(emptyValues)
    }
    // Only re-sync when the target report identity/status actually changes.
  }, [activeReport?.id, activeReport?.status])

  React.useEffect(() => {
    setKontribusiInput(
      activeReport?.kontribusiOrtu
        ? formatAmountInput(String(activeReport.kontribusiOrtu))
        : ''
    )
  }, [activeReport?.id, activeReport?.kontribusiOrtu])

  const coverLetterValue = watch('coverLetter')

  const onSubmitAcademic = async (values: FormValues) => {
    setAcademicError(null)
    try {
      await submitReport.mutateAsync({
        semesterNumber: targetSemesterNumber,
        year: values.year.trim(),
        sks: Number(values.sks),
        ips: Number(values.ips.replace(',', '.')),
        ipk: Number(values.ipk.replace(',', '.')),
        coverLetter: values.coverLetter.trim()
      })
    } catch (err) {
      setAcademicError(
        err instanceof Error ? err.message : 'Gagal menyimpan data akademik.'
      )
    }
  }

  const pickAndUploadKhs = async (
    semesterNumber: number,
    docType: 'khs' | 'krs'
  ) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true
    })
    if (result.canceled) return
    const asset = result.assets[0]
    const label = `Semester ${ROMAN[semesterNumber - 1]} - ${
      docType === 'khs' ? 'KHS' : 'KRS'
    }`
    setKhsError(null)
    setKhsSuccessMessage(null)
    setUploadingKhs({ semester: semesterNumber, docType })
    try {
      const uploaded = await uploadFile(
        { uri: asset.uri, name: asset.name },
        docType,
        token,
        user?.id
      )
      await uploadKhs.mutateAsync({
        semesterNumber,
        fileId: docType === 'khs' ? uploaded.fileId : undefined,
        krsFileId: docType === 'krs' ? uploaded.fileId : undefined
      })
      // Explicit confirmation independent of the badge — the badge only appears once the
      // khsUploads query refetches, which isn't always instant/obvious, and this is exactly
      // what left participants unsure whether an upload (esp. KRS) actually went through.
      setKhsSuccessMessage(`${label} berhasil diunggah.`)
    } catch (err) {
      setKhsError(
        `${label}: ${err instanceof Error ? err.message : 'Gagal mengunggah.'}`
      )
    } finally {
      setUploadingKhs(null)
    }
  }

  const pickAndUploadStatement = async (type: 'participant' | 'guardian') => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true
    })
    if (result.canceled) return
    const asset = result.assets[0]
    setStmtError(null)
    setUploadingStmt(type)
    try {
      const uploaded = await uploadFile(
        { uri: asset.uri, name: asset.name },
        'commitment-statement',
        token,
        user?.id
      )
      await uploadCommitment.mutateAsync({ type, fileId: uploaded.fileId })
    } catch (err) {
      setStmtError(
        err instanceof Error ? err.message : 'Gagal mengunggah pernyataan.'
      )
    } finally {
      setUploadingStmt(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    if (target.kind === 'statement') {
      setStmtError(null)
      try {
        await deleteCommitment.mutateAsync(target.type)
        setDeleteSuccessMessage('Berkas pernyataan berhasil dihapus.')
      } catch (err) {
        setStmtError(
          err instanceof Error ? err.message : 'Gagal menghapus berkas.'
        )
      }
    } else if (target.kind === 'khs') {
      setKhsError(null)
      try {
        await deleteKhsUpload.mutateAsync({
          semesterNumber: target.semester,
          docType: target.docType
        })
        setDeleteSuccessMessage(
          `Berkas ${target.docType === 'khs' ? 'KHS' : 'KRS'} berhasil dihapus.`
        )
      } catch (err) {
        setKhsError(
          err instanceof Error ? err.message : 'Gagal menghapus berkas.'
        )
      }
    } else {
      setBudgetError(null)
      try {
        await deleteBudgetItem.mutateAsync(target.itemId)
        setDeleteSuccessMessage('Item rincian dana berhasil dihapus.')
      } catch (err) {
        setBudgetError(
          err instanceof Error ? err.message : 'Gagal menghapus item.'
        )
      }
    }
  }

  const deleteConfirmMessage =
    deleteTarget?.kind === 'statement'
      ? 'Berkas ini akan dihapus dan status kembali ke belum diunggah. Anda dapat mengunggah ulang berkas yang benar setelahnya.'
      : deleteTarget?.kind === 'khs'
      ? `Berkas ${deleteTarget.docType === 'khs' ? 'KHS' : 'KRS'} Semester ${
          ROMAN[deleteTarget.semester - 1]
        } akan dihapus dan status kembali ke belum diunggah.`
      : deleteTarget?.kind === 'budget'
      ? 'Item rincian dana ini akan dihapus.'
      : ''

  const handleAddBudgetItem = async (input: NewBudgetItemInput) => {
    setBudgetError(null)
    try {
      await addBudgetItem.mutateAsync(input)
      setBudgetModalOpen(false)
    } catch (err) {
      setBudgetError(
        err instanceof Error ? err.message : 'Gagal menyimpan item.'
      )
    }
  }

  const handleKontribusiBlur = async () => {
    if (!activeReport) return
    const value = parseAmountInput(kontribusiInput)
    if (value === (activeReport.kontribusiOrtu ?? 0)) return
    setBudgetError(null)
    try {
      await updateKontribusi.mutateAsync(value)
    } catch (err) {
      setBudgetError(
        err instanceof Error ? err.message : 'Gagal menyimpan kontribusi.'
      )
    }
  }

  // "Hapus" now only lives inside the Lihat preview (FilePreviewModal's onDelete) — this picker
  // exists purely to resolve "Lihat" when both KHS and KRS are uploaded for a semester and it's
  // ambiguous which one to open; when only one exists, it opens directly with no picker.
  const openKhsDocPicker = (semester: number) => {
    const entry = khsUploads?.find(k => k.semesterNumber === semester)
    const options: Array<'khs' | 'krs'> = [
      entry?.fileId ? ('khs' as const) : null,
      entry?.krsFileId ? ('krs' as const) : null
    ].filter((o): o is 'khs' | 'krs' => !!o)

    if (options.length <= 1) {
      const docType = options[0]
      if (!docType) return
      const fileId = docType === 'khs' ? entry?.fileId : entry?.krsFileId
      setFilePreview({
        title: `Semester ${ROMAN[semester - 1]} - ${
          docType === 'khs' ? 'KHS' : 'KRS'
        }`,
        fileId,
        deleteTarget: { kind: 'khs', semester, docType }
      })
      return
    }

    setKhsDocPicker({ semester })
  }

  const khsDocPickerEntry = khsDocPicker
    ? khsUploads?.find(k => k.semesterNumber === khsDocPicker.semester)
    : undefined
  const khsDocPickerOptions: DocPickerOption[] = [
    khsDocPickerEntry?.fileId ? { key: 'khs', label: 'KHS' } : null,
    khsDocPickerEntry?.krsFileId ? { key: 'krs', label: 'KRS' } : null
  ].filter((opt): opt is DocPickerOption => !!opt)

  const handleKhsDocPick = (key: string) => {
    if (!khsDocPicker) return
    const { semester } = khsDocPicker
    const docType = key as 'khs' | 'krs'
    setKhsDocPicker(null)
    const fileId =
      docType === 'khs'
        ? khsDocPickerEntry?.fileId
        : khsDocPickerEntry?.krsFileId
    setFilePreview({
      title: `Semester ${ROMAN[semester - 1]} - ${
        docType === 'khs' ? 'KHS' : 'KRS'
      }`,
      fileId,
      deleteTarget: { kind: 'khs', semester, docType }
    })
  }

  const handleAddActivity = async (input: NewMonthlyReportInput) => {
    if (!user || !input.file) return
    setActivityError(null)
    try {
      const uploaded = await uploadFile(
        input.file,
        'monthly-report',
        token,
        user.id
      )
      const created = await addMonthlyReport.mutateAsync({
        description: input.description.trim(),
        category: input.category,
        reportDate: input.reportDate,
        fileId: uploaded.fileId
      })
      if (activeReport) {
        await linkActivity.mutateAsync(created.id)
      }
      setActivityModalOpen(false)
    } catch (err) {
      setActivityError(
        err instanceof Error ? err.message : 'Gagal menyimpan kegiatan.'
      )
    }
  }

  const handleSaveAcademicInfo = (input: {
    major: string
    university: string
  }) => {
    setAcademicInfoError(null)
    updateAcademicInfo.mutate(input, {
      onSuccess: () => setAcademicInfoModalOpen(false),
      onError: err =>
        setAcademicInfoError(
          err instanceof Error ? err.message : 'Gagal menyimpan data akademik.'
        )
    })
  }

  const linkedCount = linkedActivityIds.size

  const handleFinalize = async () => {
    if (!activeReport) return
    setFinalizeError(null)
    try {
      await finalizeReport.mutateAsync(activeReport.id)
    } catch (err) {
      setFinalizeError(
        err instanceof Error ? err.message : 'Gagal mengirim laporan semester.'
      )
    }
  }

  const handleGeneratePdf = async () => {
    if (!activeReport || !user) return
    setPdfError(null)
    setPdfGenerating(true)
    try {
      const { uri, name } = await generateFullSemesterReportPdf(
        activeReport,
        user,
        linkedReports
      )
      const uploaded = await uploadFile(
        { uri, name },
        'full-semester-report-pdf',
        token,
        user.id
      )
      await savePdf.mutateAsync({
        id: activeReport.id,
        fileId: uploaded.fileId
      })
      await openLocalFile(uri, name)
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : 'Gagal membuat laporan PDF.'
      )
    } finally {
      setPdfGenerating(false)
    }
  }

  const toggleActivityLink = (monthlyReportId: string, linked: boolean) => {
    if (linked) {
      unlinkActivity.mutate(monthlyReportId)
    } else {
      linkActivity.mutate(monthlyReportId)
    }
  }

  const checklist = activeReport?.checklist ?? {
    commitment: !!(
      commitment?.participantStmtFileId && commitment?.guardianStmtFileId
    ),
    khs: !!khsUploads?.some(
      k => k.semesterNumber === targetSemesterNumber && k.fileId
    ),
    activities: false,
    budget: false
  }
  const finalizeReady =
    checklist.commitment &&
    checklist.khs &&
    checklist.activities &&
    checklist.budget
  const missingItems = [
    !checklist.commitment ? 'pernyataan komitmen' : null,
    !checklist.khs ? 'KHS semester ini' : null,
    !checklist.activities ? 'minimal 5 kegiatan' : null,
    !checklist.budget ? 'rincian penggunaan dana' : null
  ].filter((item): item is string => !!item)

  const budgetItemsList = budgetItems ?? []
  const jumlahKebutuhan = budgetItemsList.reduce(
    (sum, item) => sum + item.jumlah,
    0
  )
  const kontribusiOrtu = activeReport?.kontribusiOrtu ?? 0
  const totalBiayaCiv = activeReport
    ? activeReport.totalAmount ?? 0
    : Math.max(0, jumlahKebutuhan - kontribusiOrtu)
  const canEditBudget = canEditAcademic

  const fileName = `LS-${targetSemesterNumber}-${user?.fullName ?? ''}`

  const ipkChartData = sortedReports
    .filter(r => r.semesterNumber <= 8 && r.ipk !== undefined)
    .map(r => ({
      label: ROMAN[r.semesterNumber - 1] ?? String(r.semesterNumber),
      value: r.ipk as number
    }))

  const reportBySemester = new Map(
    sortedReports.map(r => [r.semesterNumber, r])
  )
  const SUMMARY_SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1)

  const refreshAll = () =>
    Promise.all([refetchReports(), refetchKhs(), refetchCommitment()])

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title='Laporan Semester Lengkap' onBack={navigation.goBack} />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps='handled'
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
                icon='cloud-offline-outline'
                title='Gagal memuat data'
                subtitle='Coba lagi sebentar lagi.'
              />
              <Button
                label='Coba Lagi'
                variant='ghost'
                onPress={() => refetchReports()}
              />
            </View>
          ) : (
            <>
              <Text style={styles.semesterBanner}>
                Melaporkan Semester{' '}
                {ROMAN[targetSemesterNumber - 1] ?? targetSemesterNumber}
              </Text>

              {/* 3. File name */}
              <Text style={styles.sectionTitle}>Nama File</Text>
              <Card style={styles.gapBottom}>
                <Text style={styles.fileName}>{fileName}</Text>
                <Text style={styles.myJournal}>MY JURNAL</Text>
              </Card>

              {/* 3b. Academic summary table */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.gapBottom}
              >
                <View style={styles.summaryTable}>
                  <View style={styles.summaryRow}>
                    <View
                      style={[
                        styles.summaryMetaLabelCell,
                        { width: SUMMARY_LABEL_W }
                      ]}
                    >
                      <Text style={styles.summaryMetaLabelText}>JURUSAN :</Text>
                    </View>
                    <View
                      style={[
                        styles.summaryMetaValueCell,
                        { width: SUMMARY_CELL_W * 5 }
                      ]}
                    >
                      <Text
                        style={styles.summaryMetaValueText}
                        numberOfLines={1}
                      >
                        {user?.major || '-'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.summaryMetaLabelCell,
                        { width: SUMMARY_CELL_W * 2 }
                      ]}
                    >
                      <Text style={styles.summaryMetaLabelText}>
                        UNIVERSITAS :
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.summaryMetaValueCell,
                        { width: SUMMARY_CELL_W * 5 }
                      ]}
                    >
                      <Text
                        style={styles.summaryMetaValueText}
                        numberOfLines={1}
                      >
                        {user?.university || '-'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.summaryRow}>
                    <View
                      style={[styles.summaryLabelCell, styles.summaryHeadCell]}
                    >
                      <Text style={styles.summaryHeadText}>Semester</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map(sem => (
                      <View
                        key={sem}
                        style={[
                          styles.summaryCell,
                          styles.summaryHeadCell,
                          { width: SUMMARY_CELL_W }
                        ]}
                      >
                        <Text style={styles.summaryHeadText}>{sem}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.summaryRow}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>Tahun</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map(sem => (
                      <View
                        key={sem}
                        style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}
                      >
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
                    {SUMMARY_SEMESTERS.map(sem => (
                      <View
                        key={sem}
                        style={[styles.summaryCell, { width: SUMMARY_CELL_W }]}
                      >
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
                    {SUMMARY_SEMESTERS.map(sem => {
                      const ips = reportBySemester.get(sem)?.ips
                      return (
                        <View
                          key={sem}
                          style={[
                            styles.summaryCell,
                            { width: SUMMARY_CELL_W }
                          ]}
                        >
                          <Text style={styles.summaryValueText}>
                            {ips !== undefined ? ips.toFixed(2) : '-'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>

                  <View style={[styles.summaryRow, styles.summaryRowLast]}>
                    <View style={styles.summaryLabelCell}>
                      <Text style={styles.summaryLabelText}>IPK</Text>
                    </View>
                    {SUMMARY_SEMESTERS.map(sem => {
                      const ipk = reportBySemester.get(sem)?.ipk
                      return (
                        <View
                          key={sem}
                          style={[
                            styles.summaryCell,
                            { width: SUMMARY_CELL_W }
                          ]}
                        >
                          <Text style={styles.summaryValueText}>
                            {ipk !== undefined ? ipk.toFixed(2) : '-'}
                          </Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* 2. Checklist */}
              <Text style={styles.sectionTitle}>Kelengkapan Lampiran</Text>
              <Card style={styles.gapBottom}>
                <ChecklistRow
                  label='Komitmen Partisipan & Orang Tua/Wali'
                  done={checklist.commitment}
                />
                <ChecklistRow
                  label='Kartu Hasil Studi (KHS)'
                  done={checklist.khs}
                />
                <ChecklistRow
                  label='Laporan Kegiatan (min. 5)'
                  done={checklist.activities}
                />
                <ChecklistRow
                  label='Rincian Penggunaan Dana'
                  done={checklist.budget}
                />
              </Card>

              {/* 1. Cover letter + total */}
              {academicLocked ? (
                <>
                  <Text style={styles.sectionTitle}>
                    Status Laporan Semester Ini
                  </Text>
                  <Card style={styles.gapBottom}>
                    <Badge status='pending' label='Menunggu Verifikasi' />
                    <Text style={styles.lockedNote}>
                      Laporan Semester {targetSemesterNumber} sudah dikirim
                      {activeReport
                        ? ` pada ${formatDate(activeReport.createdAt)}`
                        : ''}{' '}
                      dan menunggu verifikasi admin. Anda tetap dapat melengkapi
                      KHS, pernyataan, dan catatan kegiatan di bawah selama
                      menunggu.
                    </Text>
                  </Card>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Kata Pengantar</Text>
                  <Controller
                    control={control}
                    name='coverLetter'
                    render={({ field }) => (
                      <Field
                        label='Kata Pengantar (maks. 200 karakter)'
                        multiline
                        placeholder='Kepada Yth Pengurus & Staf PPA Mawar Saron...'
                        value={field.value}
                        onChangeText={t => field.onChange(t.slice(0, 200))}
                        error={errors.coverLetter?.message}
                      />
                    )}
                  />
                  <Text style={styles.charCounter}>
                    {coverLetterValue?.length ?? 0}/200
                  </Text>

                  {/* 4. Academic figures for this semester */}
                  <Text style={[styles.sectionTitle, styles.gapTop]}>
                    Data Akademik Semester {targetSemesterNumber}
                  </Text>
                  <Card style={styles.academicInfoCard}>
                    <Text style={styles.academicInfoText}>
                      Jurusan: {user?.major ?? '-'} · Universitas:{' '}
                      {user?.university ?? '-'}
                    </Text>
                    <Button
                      label='Edit'
                      variant='ghost'
                      style={styles.academicInfoEditBtn}
                      onPress={() => {
                        setAcademicInfoError(null)
                        setAcademicInfoModalOpen(true)
                      }}
                    />
                  </Card>
                  <View style={styles.row2}>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name='year'
                        render={({ field }) => (
                          <YearPickerField
                            label='Tahun'
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.year?.message}
                          />
                        )}
                      />
                    </View>
                    <View style={styles.row2Col}>
                      <Controller
                        control={control}
                        name='sks'
                        render={({ field }) => (
                          <Field
                            label='SKS'
                            placeholder='20'
                            keyboardType='numeric'
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
                        name='ips'
                        render={({ field }) => (
                          <Field
                            label='IPS'
                            placeholder='3.45'
                            keyboardType='decimal-pad'
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
                        name='ipk'
                        render={({ field }) => (
                          <Field
                            label='IPK'
                            placeholder='3.45'
                            keyboardType='decimal-pad'
                            value={field.value}
                            onChangeText={field.onChange}
                            error={errors.ipk?.message}
                          />
                        )}
                      />
                    </View>
                  </View>

                  {academicError ? (
                    <Text style={styles.errorText}>{academicError}</Text>
                  ) : null}
                  <Button
                    label={
                      submitReport.isPending
                        ? 'Menyimpan...'
                        : 'Simpan Data Akademik'
                    }
                    variant='navy'
                    onPress={handleSubmit(onSubmitAcademic)}
                    disabled={submitReport.isPending}
                    loading={submitReport.isPending}
                  />
                </>
              )}

              {/* Rincian Penggunaan Dana */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>
                Rincian Penggunaan Dana
              </Text>
              <Card style={styles.gapBottom}>
                {!activeReport ? (
                  <Text style={styles.lockedNote}>
                    Simpan data akademik terlebih dahulu untuk mengisi rincian
                    penggunaan dana.
                  </Text>
                ) : (
                  <>
                    {budgetItemsList.length === 0 ? (
                      <EmptyState
                        icon='cash-outline'
                        title='Belum ada rincian'
                        subtitle='Tambahkan item kebutuhan dana semester ini.'
                      />
                    ) : (
                      budgetItemsList.map((item, i) => (
                        <View key={item.id} style={styles.budgetRow}>
                          <View style={styles.budgetMain}>
                            <Text
                              style={styles.budgetKeterangan}
                              numberOfLines={2}
                            >
                              {i + 1}. {item.keterangan}
                            </Text>
                            <Text style={styles.budgetDetail}>
                              {item.unit} × {formatRupiah(item.satuan)} ={' '}
                              {formatRupiah(item.jumlah)}
                            </Text>
                          </View>
                          {canEditBudget ? (
                            <Button
                              label='Hapus'
                              variant='reject'
                              style={styles.uploadSmallBtn}
                              onPress={() =>
                                setDeleteTarget({
                                  kind: 'budget',
                                  itemId: item.id
                                })
                              }
                            />
                          ) : null}
                        </View>
                      ))
                    )}

                    {canEditBudget ? (
                      <Button
                        label='+ Tambah Item'
                        variant='ghost'
                        style={styles.sendDocsBtn}
                        onPress={() => {
                          setBudgetError(null)
                          setBudgetModalOpen(true)
                        }}
                      />
                    ) : null}

                    <View style={[styles.row2, styles.gapTop]}>
                      <View style={styles.row2Col}>
                        <Field
                          label='Kontribusi Orangtua/Wali (Rp)'
                          keyboardType='numeric'
                          placeholder='0'
                          editable={canEditBudget}
                          value={kontribusiInput}
                          onChangeText={t =>
                            setKontribusiInput(formatAmountInput(t))
                          }
                          onBlur={handleKontribusiBlur}
                        />
                      </View>
                    </View>

                    {budgetError ? (
                      <Text style={styles.errorText}>{budgetError}</Text>
                    ) : null}

                    <View style={styles.budgetTotalsCard}>
                      <View style={styles.budgetTotalRow}>
                        <Text style={styles.budgetTotalLabel}>
                          Jumlah Kebutuhan
                        </Text>
                        <Text style={styles.budgetTotalValue}>
                          {formatRupiah(jumlahKebutuhan)}
                        </Text>
                      </View>
                      <View style={styles.budgetTotalRow}>
                        <Text style={styles.budgetTotalLabel}>
                          Kontribusi Orangtua/Wali
                        </Text>
                        <Text style={styles.budgetTotalValue}>
                          {formatRupiah(kontribusiOrtu)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.budgetTotalRow,
                          styles.budgetTotalRowFinal
                        ]}
                      >
                        <Text style={styles.budgetTotalLabelFinal}>
                          Total Biaya CIV
                        </Text>
                        <Text style={styles.budgetTotalValueFinal}>
                          {formatRupiah(totalBiayaCiv)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </Card>

              {/* Academic history table */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>
                Riwayat Akademik
              </Text>
              {sortedReports.length === 0 ? (
                <EmptyState
                  icon='school-outline'
                  title='Belum ada riwayat'
                  subtitle='Riwayat semester akan muncul setelah laporan pertama dikirim.'
                />
              ) : (
                <>
                  <Card style={styles.gapBottom}>
                    <Text style={styles.trackTitle}>TRACK IPK</Text>
                    <LineChart data={ipkChartData} />
                  </Card>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.gapBottom}
                  >
                    <View>
                      <TableRow
                        label='Semester'
                        values={sortedReports.map(
                          r =>
                            ROMAN[r.semesterNumber - 1] ??
                            String(r.semesterNumber)
                        )}
                        header
                      />
                      <TableRow
                        label='Tahun'
                        values={sortedReports.map(r => r.year ?? '-')}
                      />
                      <TableRow
                        label='SKS'
                        values={sortedReports.map(r =>
                          (r.sks ?? '-').toString()
                        )}
                      />
                      <TableRow
                        label='IPS'
                        values={sortedReports.map(r =>
                          r.ips !== undefined ? r.ips.toFixed(2) : '-'
                        )}
                      />
                      <TableRow
                        label='IPK'
                        values={sortedReports.map(r =>
                          r.ipk !== undefined ? r.ipk.toFixed(2) : '-'
                        )}
                      />
                    </View>
                  </ScrollView>
                </>
              )}

              {/* 5. Unggah KHS/KRS */}
              <Text style={[styles.sectionTitle, styles.gapTop]}>
                Unggah KHS/KRS
              </Text>
              <Card style={styles.gapBottom}>
                {KHS_SEMESTERS.map(sem => {
                  const entry = khsUploads?.find(k => k.semesterNumber === sem)
                  const khsDone = !!entry?.fileId
                  const krsDone = !!entry?.krsFileId
                  return (
                    <View key={sem} style={styles.khsKrsRow}>
                      <Text style={styles.uploadLabel}>
                        Semester {ROMAN[sem - 1]}
                      </Text>
                      <View style={styles.khsKrsBtnRow}>
                        {khsDone ? (
                          <Badge status='approved' label='KHS ✓' />
                        ) : (
                          <Button
                            label={
                              uploadingKhs?.semester === sem &&
                              uploadingKhs.docType === 'khs'
                                ? 'Mengunggah...'
                                : 'Unggah KHS'
                            }
                            variant='ghost'
                            style={styles.khsKrsBtn}
                            disabled={uploadingKhs !== null}
                            loading={
                              uploadingKhs?.semester === sem &&
                              uploadingKhs.docType === 'khs'
                            }
                            onPress={() => pickAndUploadKhs(sem, 'khs')}
                          />
                        )}
                        {krsDone ? (
                          <Badge status='approved' label='KRS ✓' />
                        ) : (
                          <Button
                            label={
                              uploadingKhs?.semester === sem &&
                              uploadingKhs.docType === 'krs'
                                ? 'Mengunggah...'
                                : 'Unggah KRS'
                            }
                            variant='ghost'
                            style={styles.khsKrsBtn}
                            disabled={uploadingKhs !== null}
                            loading={
                              uploadingKhs?.semester === sem &&
                              uploadingKhs.docType === 'krs'
                            }
                            onPress={() => pickAndUploadKhs(sem, 'krs')}
                          />
                        )}
                        {khsDone || krsDone ? (
                          <Button
                            label='Lihat'
                            variant='ghost'
                            style={styles.uploadSmallBtn}
                            onPress={() => openKhsDocPicker(sem)}
                          />
                        ) : null}
                      </View>
                    </View>
                  )
                })}
                {khsError ? (
                  <Text style={styles.errorText}>{khsError}</Text>
                ) : null}
              </Card>

              {/* 7. Unggahan Pernyataan */}
              <Text style={styles.sectionTitle}>Unggahan Pernyataan</Text>
              <Card style={styles.gapBottom}>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>
                    Pernyataan Komitmen Partisipan
                  </Text>
                  {commitment?.participantStmtFileId ? (
                    <View style={styles.uploadedActions}>
                      <Badge status='approved' label='Sudah diunggah' />
                      <Button
                        label='Lihat'
                        variant='ghost'
                        style={styles.uploadSmallBtn}
                        onPress={() =>
                          setFilePreview({
                            title: 'Pernyataan Komitmen Partisipan',
                            fileId: commitment.participantStmtFileId,
                            deleteTarget: { kind: 'statement', type: 'participant' }
                          })
                        }
                      />
                      <Button
                        label='Hapus'
                        variant='reject'
                        style={styles.uploadSmallBtn}
                        onPress={() =>
                          setDeleteTarget({
                            kind: 'statement',
                            type: 'participant'
                          })
                        }
                      />
                    </View>
                  ) : (
                    <Button
                      label={
                        uploadingStmt === 'participant'
                          ? 'Mengunggah...'
                          : 'Unggah'
                      }
                      variant='ghost'
                      style={styles.uploadBtn}
                      disabled={uploadingStmt !== null}
                      loading={uploadingStmt === 'participant'}
                      onPress={() => pickAndUploadStatement('participant')}
                    />
                  )}
                </View>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>
                    Pernyataan Komitmen Orang Tua/Wali
                  </Text>
                  {commitment?.guardianStmtFileId ? (
                    <View style={styles.uploadedActions}>
                      <Badge status='approved' label='Sudah diunggah' />
                      <Button
                        label='Lihat'
                        variant='ghost'
                        style={styles.uploadSmallBtn}
                        onPress={() =>
                          setFilePreview({
                            title: 'Pernyataan Komitmen Orang Tua/Wali',
                            fileId: commitment.guardianStmtFileId,
                            deleteTarget: { kind: 'statement', type: 'guardian' }
                          })
                        }
                      />
                      <Button
                        label='Hapus'
                        variant='reject'
                        style={styles.uploadSmallBtn}
                        onPress={() =>
                          setDeleteTarget({
                            kind: 'statement',
                            type: 'guardian'
                          })
                        }
                      />
                    </View>
                  ) : (
                    <Button
                      label={
                        uploadingStmt === 'guardian'
                          ? 'Mengunggah...'
                          : 'Unggah'
                      }
                      variant='ghost'
                      style={styles.uploadBtn}
                      disabled={uploadingStmt !== null}
                      loading={uploadingStmt === 'guardian'}
                      onPress={() => pickAndUploadStatement('guardian')}
                    />
                  )}
                </View>
                {stmtError ? (
                  <Text style={styles.errorText}>{stmtError}</Text>
                ) : null}
              </Card>

              {/* 8. Catatan dan Dokumentasi */}
              <Text style={styles.sectionTitle}>Catatan dan Dokumentasi</Text>
              <Text style={styles.headerInfo}>
                Pilih minimal 5 Laporan Bulanan sebagai dokumentasi kegiatan
                semester ini.
              </Text>
              <Card style={styles.gapBottom}>
                <View style={styles.uploadRow}>
                  <Text style={styles.uploadLabel}>+ Kegiatan / Aktifitas</Text>
                  <Button
                    label='Unggah'
                    variant='ghost'
                    style={styles.uploadBtn}
                    onPress={() => setActivityModalOpen(true)}
                  />
                </View>
                {activityError ? (
                  <Text style={styles.errorText}>{activityError}</Text>
                ) : null}

                {!activeReport ? (
                  <Text style={styles.lockedNote}>
                    Simpan laporan semester ini terlebih dahulu untuk memilih
                    Laporan Bulanan.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.lockedNote}>
                      {linkedCount}/5 kegiatan dipilih
                    </Text>

                    {!monthlyReports || monthlyReports.length === 0 ? (
                      <EmptyState
                        icon='camera-outline'
                        title='Belum ada Laporan Bulanan'
                        subtitle='Tambahkan Kegiatan/Aktifitas di atas untuk mulai dokumentasi.'
                      />
                    ) : (
                      monthlyReports.map(m => {
                        const linked = linkedActivityIds.has(m.id)
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
                              <AuthImage
                                fileId={m.fileId}
                                token={token}
                                style={styles.activityPhoto}
                              />
                            ) : null}
                            <View style={styles.activityMain}>
                              <Text style={styles.activityDate}>
                                {formatDate(m.reportDate)}
                              </Text>
                              <Text
                                style={styles.activityDesc}
                                numberOfLines={2}
                              >
                                {m.description}
                              </Text>
                            </View>
                          </Pressable>
                        )
                      })
                    )}

                    {canFinalize ? (
                      <>
                        {!finalizeReady ? (
                          <Text style={styles.lockedNote}>
                            Lengkapi sebelum mengirim: {missingItems.join(', ')}
                            .
                          </Text>
                        ) : null}
                        {finalizeError ? (
                          <Text style={styles.errorText}>{finalizeError}</Text>
                        ) : null}
                        <Button
                          label={
                            finalizeReport.isPending
                              ? 'Mengirim...'
                              : 'Kirim Laporan Semester Lengkap'
                          }
                          variant='navy'
                          style={styles.sendDocsBtn}
                          disabled={!finalizeReady || finalizeReport.isPending}
                          loading={finalizeReport.isPending}
                          onPress={handleFinalize}
                        />
                      </>
                    ) : null}

                    {pdfError ? (
                      <Text style={styles.errorText}>{pdfError}</Text>
                    ) : null}
                    <Button
                      label={
                        pdfGenerating ? 'Membuat PDF...' : 'Buat Laporan PDF'
                      }
                      variant='ghost'
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
          setActivityModalOpen(false)
          setActivityError(null)
        }}
      />

      <AddBudgetItemModal
        visible={budgetModalOpen}
        saving={addBudgetItem.isPending}
        errorText={budgetError}
        onSave={handleAddBudgetItem}
        onClose={() => {
          setBudgetModalOpen(false)
          setBudgetError(null)
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

      <FilePreviewModal
        visible={!!filePreview}
        title={filePreview?.title}
        fileId={filePreview?.fileId}
        token={token}
        onClose={() => setFilePreview(null)}
        onDelete={
          filePreview?.deleteTarget
            ? () => {
                const target = filePreview.deleteTarget!
                setFilePreview(null)
                setDeleteTarget(target)
              }
            : undefined
        }
      />

      <DocPickerModal
        visible={!!khsDocPicker}
        title='Pilih berkas untuk dilihat'
        options={khsDocPickerOptions}
        onSelect={handleKhsDocPick}
        onClose={() => setKhsDocPicker(null)}
      />

      <ConfirmModal
        visible={!!deleteTarget}
        title='Hapus Berkas'
        message={deleteConfirmMessage}
        confirmLabel='Hapus'
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <SuccessModal
        visible={!!deleteSuccessMessage}
        title='Berhasil Dihapus'
        message={deleteSuccessMessage ?? ''}
        onClose={() => setDeleteSuccessMessage(null)}
      />

      <SuccessModal
        visible={!!khsSuccessMessage}
        title='Berhasil Diunggah'
        message={khsSuccessMessage ?? ''}
        onClose={() => setKhsSuccessMessage(null)}
      />
    </KeyboardAvoidingView>
  )
}

function ChecklistRow ({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.checklistRow}>
      <Text style={styles.checklistLabel}>{label}</Text>
      <Badge
        status={done ? 'approved' : 'rejected'}
        label={done ? 'Lengkap' : 'Belum Lengkap'}
      />
    </View>
  )
}

function TableRow ({
  label,
  values,
  header
}: {
  label: string
  values: string[]
  header?: boolean
}) {
  return (
    <View style={styles.tableRow}>
      <Text
        style={[
          styles.tableCell,
          styles.tableLabelCell,
          header && styles.tableHeaderText
        ]}
      >
        {label}
      </Text>
      {values.map((v, i) => (
        <Text
          key={i}
          style={[styles.tableCell, header && styles.tableHeaderText]}
        >
          {v}
        </Text>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  semesterBanner: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10
  },
  gapTop: {
    marginTop: 22
  },
  gapBottom: {
    marginBottom: 20
  },
  checklistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6
  },
  checklistLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8
  },
  fileName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center'
  },
  myJournal: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 1
  },
  charCounter: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
    marginTop: -8,
    marginBottom: 8
  },
  lockedNote: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 17,
    marginTop: 8
  },
  headerInfo: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 12
  },
  academicInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12
  },
  academicInfoText: {
    flex: 1,
    fontSize: 13,
    color: colors.muted
  },
  academicInfoEditBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  row2: {
    flexDirection: 'row',
    gap: 10
  },
  row2Col: {
    flex: 1
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    marginBottom: 4
  },
  tableRow: {
    flexDirection: 'row'
  },
  tableCell: {
    width: 64,
    fontSize: 13,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  tableLabelCell: {
    width: 80,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'left'
  },
  tableHeaderText: {
    fontWeight: '700',
    color: colors.navy
  },
  uploadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    rowGap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  uploadLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    marginRight: 8
  },
  uploadBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 6
  },
  uploadedActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  uploadSmallBtn: {
    marginTop: 0,
    width: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  khsKrsRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  khsKrsBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 6
  },
  khsKrsBtn: {
    width: 'auto',
    marginTop: 0,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  sendDocsBtn: {
    marginTop: 10
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 10
  },
  summaryTable: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.card
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  summaryRowLast: {
    borderBottomWidth: 0
  },
  summaryLabelCell: {
    width: SUMMARY_LABEL_W,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line
  },
  summaryLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy
  },
  summaryCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line
  },
  summaryValueText: {
    fontSize: 12,
    color: colors.text
  },
  summaryHeadCell: {
    backgroundColor: '#f6b989'
  },
  summaryHeadText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy
  },
  summaryMetaLabelCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.navy
  },
  summaryMetaLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff'
  },
  summaryMetaValueCell: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderColor: colors.line
  },
  summaryMetaValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
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
    marginBottom: 8
  },
  activityPhoto: {
    width: 44,
    height: 44,
    borderRadius: radius.sm
  },
  activityMain: {
    flex: 1
  },
  activityDate: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.navy
  },
  activityDesc: {
    fontSize: 13,
    color: colors.text,
    marginTop: 2
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.line
  },
  budgetMain: {
    flex: 1
  },
  budgetKeterangan: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  budgetDetail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2
  },
  budgetTotalsCard: {
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    padding: 12,
    marginTop: 12
  },
  budgetTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3
  },
  budgetTotalRowFinal: {
    marginTop: 4,
    paddingTop: 7,
    borderTopWidth: 1,
    borderColor: colors.line
  },
  budgetTotalLabel: {
    fontSize: 13,
    color: colors.muted
  },
  budgetTotalValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  budgetTotalLabelFinal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy
  },
  budgetTotalValueFinal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navy
  }
})
