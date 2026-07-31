import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useState } from 'react'
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { AdminStackParamList } from '../../app/AdminStack'
import { AuthImage } from '../../components/AuthImage'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { Header } from '../../components/Header'
import { ListItem } from '../../components/ListItem'
import { MonthlyReportDetailModal } from '../../components/MonthlyReportDetailModal'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { ScholarshipTypeModal } from '../../components/ScholarshipTypeModal'
import { Skeleton } from '../../components/Skeleton'
import {
  useAdminParticipants,
  useParticipantMonthlyReports,
  useParticipantPinResetRequests,
  useReviewPinResetRequest,
  useSetScholarshipType
} from '../../hooks/useAdminData'
import { useAuthStore } from '../../store/authStore'
import { formatDate, formatRupiah } from '../../lib/format'
import { colors, radius, spacing } from '../../theme'
import { MonthlyReport } from '../../types/models'

const GENDER_LABEL: Record<'L' | 'P', string> = {
  L: 'Laki-laki',
  P: 'Perempuan'
}

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}

type ParticipantDetailRoute = RouteProp<
  AdminStackParamList,
  'ParticipantDetail'
>

export function ParticipantDetailScreen () {
  const navigation = useNavigation()
  const { params } = useRoute<ParticipantDetailRoute>()
  const { data: participants, refetch, isRefetching } = useAdminParticipants()
  const setScholarshipType = useSetScholarshipType()
  const { data: pinResetRequests } = useParticipantPinResetRequests(params.participantId)
  const reviewPinReset = useReviewPinResetRequest()
  const token = useAuthStore(s => s.token)
  const {
    data: monthlyReports,
    isLoading: monthlyReportsLoading
  } = useParticipantMonthlyReports(params.participantId)
  const [modalOpen, setModalOpen] = useState(false)
  const [pinReviewOpen, setPinReviewOpen] = useState(false)
  const [pinResetDone, setPinResetDone] = useState(false)
  const [reportPreview, setReportPreview] = useState<MonthlyReport | null>(null)

  const pendingPinReset = pinResetRequests?.find(r => r.status === 'pending')

  const item = participants?.find(p => p.profile.id === params.participantId)

  if (!item) {
    return (
      <View style={styles.screen}>
        <Header
          variant='admin'
          title='Detail Partisipan'
          onBack={navigation.goBack}
        />
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.navy}
              colors={[colors.navy]}
            />
          }
        >
          <EmptyState
            icon='person-outline'
            title='Data tidak ditemukan'
            subtitle='Partisipan ini mungkin sudah tidak tersedia.'
          />
        </ScrollView>
      </View>
    )
  }

  const { profile } = item
  const initial = profile.fullName.charAt(0) || '?'

  const infoRows: InfoRow[] = [
    { icon: 'id-card-outline', label: 'Nomor ID', value: profile.idNumber },
    {
      icon: 'card-outline',
      label: 'NIM',
      value: profile.nim ?? 'Belum diisi partisipan'
    },
    { icon: 'mail-outline', label: 'Email', value: profile.email },
    { icon: 'call-outline', label: 'No. HP / WA', value: profile.phone ?? '-' },
    {
      icon: 'male-female-outline',
      label: 'Jenis Kelamin',
      value: profile.gender ? GENDER_LABEL[profile.gender] : '-'
    },
    {
      icon: 'business-outline',
      label: 'Universitas',
      value: profile.university ?? '-'
    },
    {
      icon: 'library-outline',
      label: 'Jurusan',
      value: profile.major ?? '-'
    },
    {
      icon: 'school-outline',
      label: 'Semester',
      value: profile.semester ? `Semester ${profile.semester}` : '-'
    }
  ]

  return (
    <View style={styles.screen}>
      <Header
        variant='admin'
        title='Detail Partisipan'
        onBack={navigation.goBack}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.navy}
            colors={[colors.navy]}
          />
        }
      >
        <ResponsiveContainer>
          <View style={styles.hero}>
            <View style={styles.avatar}>
              {profile.photoUrl ? (
                <AuthImage
                  fileId={profile.photoUrl}
                  token={token}
                  style={styles.avatarPhoto}
                />
              ) : (
                <Text style={styles.avatarText}>{initial}</Text>
              )}
            </View>
            <Text style={styles.heroName}>{profile.fullName}</Text>
            <Text style={styles.heroId}>Nomor ID-{profile.idNumber}</Text>
            <Badge
              status={item.status === 'aktif' ? 'approved' : 'pending'}
              label={item.status === 'aktif' ? 'Aktif' : 'Belum Lapor'}
            />
          </View>

          <Text style={styles.sectionTitle}>Sisa Dana</Text>
          <Card style={styles.balanceCard}>
            <Text style={styles.balanceValue}>
              {formatRupiah(item.remaining)}
            </Text>
          </Card>

          <Text style={styles.sectionTitle}>Jenis Bantuan Dana</Text>
          <Pressable onPress={() => setModalOpen(true)}>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIco}>
                  <Ionicons
                    name='ribbon-outline'
                    size={15}
                    color={colors.navy}
                  />
                </View>
                <View style={styles.infoMain}>
                  <Text style={styles.infoV}>
                    {profile.scholarshipType ?? 'Belum diatur'}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={16}
                  color={colors.muted}
                />
              </View>
            </Card>
          </Pressable>

          <Text style={styles.sectionTitle}>Data Diri</Text>
          <Card style={styles.infoCard}>
            {infoRows.map(row => (
              <View key={row.label} style={styles.infoRow}>
                <View style={styles.infoIco}>
                  <Ionicons name={row.icon} size={15} color={colors.navy} />
                </View>
                <View style={styles.infoMain}>
                  <Text style={styles.infoK}>{row.label}</Text>
                  <Text style={styles.infoV}>{row.value}</Text>
                </View>
              </View>
            ))}
          </Card>

          <Text style={styles.sectionTitle}>Laporan Bulanan</Text>
          {monthlyReportsLoading ? (
            <Skeleton height={54} radiusSize={radius.md} style={styles.infoCard} />
          ) : !monthlyReports || monthlyReports.length === 0 ? (
            <View style={styles.infoCard}>
              <EmptyState
                icon='document-text-outline'
                title='Belum ada laporan bulanan'
                subtitle='Partisipan ini belum mencatat aktivitas bulanan.'
              />
            </View>
          ) : (
            <View style={styles.infoCard}>
              {monthlyReports.map(r => (
                <ListItem
                  key={r.id}
                  icon='camera'
                  iconBg={colors.skySoft}
                  iconColor={colors.blue}
                  title={formatDate(r.reportDate)}
                  subtitle={r.description ?? '-'}
                  onPress={() => setReportPreview(r)}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Keamanan</Text>
          <Button
            label='Reset PIN ke Default'
            variant='ghost'
            disabled={!pendingPinReset}
            onPress={() => {
              setPinResetDone(false)
              setPinReviewOpen(true)
            }}
          />
          {!pendingPinReset ? (
            <Text style={styles.resetPinHint}>
              Tombol aktif setelah partisipan mengajukan permintaan reset PIN
              (verifikasi wajah) dari layar login.
            </Text>
          ) : null}
          {pinResetDone ? (
            <Text style={styles.resetPinSuccess}>
              PIN berhasil direset ke 000000. Beri tahu partisipan untuk login
              lalu membuat PIN baru.
            </Text>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>

      <MonthlyReportDetailModal
        visible={!!reportPreview}
        report={reportPreview}
        token={token}
        onClose={() => setReportPreview(null)}
      />

      <ScholarshipTypeModal
        visible={modalOpen}
        participantName={profile.fullName}
        currentType={profile.scholarshipType}
        saving={setScholarshipType.isPending}
        onSelect={type =>
          setScholarshipType.mutate({ id: profile.id, scholarshipType: type })
        }
        onClose={() => setModalOpen(false)}
      />

      <Modal
        visible={pinReviewOpen}
        transparent
        animationType='fade'
        onRequestClose={() => setPinReviewOpen(false)}
      >
        <View style={styles.reviewBackdrop}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewTitle}>Verifikasi Permintaan Reset PIN</Text>
            <Text style={styles.reviewSubtitle}>
              {profile.fullName} mengajukan reset PIN. Periksa 3 foto swafoto
              berikut sebelum menyetujui.
            </Text>
            {pendingPinReset ? (
              <View style={styles.selfieRow}>
                {(
                  [
                    { label: 'Depan', fileId: pendingPinReset.selfieFrontFileId },
                    { label: 'Kiri', fileId: pendingPinReset.selfieLeftFileId },
                    { label: 'Kanan', fileId: pendingPinReset.selfieRightFileId }
                  ] as const
                ).map(s => (
                  <View key={s.label} style={styles.selfieCol}>
                    <AuthImage fileId={s.fileId} token={token} style={styles.selfieImg} />
                    <Text style={styles.selfieLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.reviewBtnRow}>
              <Button
                label='Tolak'
                variant='reject'
                style={styles.reviewBtn}
                loading={reviewPinReset.isPending}
                onPress={() => {
                  if (!pendingPinReset) return
                  reviewPinReset.mutate(
                    { id: pendingPinReset.id, status: 'rejected' },
                    { onSuccess: () => setPinReviewOpen(false) }
                  )
                }}
              />
              <Button
                label='Setujui & Reset'
                variant='approve'
                style={styles.reviewBtn}
                loading={reviewPinReset.isPending}
                onPress={() => {
                  if (!pendingPinReset) return
                  reviewPinReset.mutate(
                    { id: pendingPinReset.id, status: 'approved' },
                    {
                      onSuccess: () => {
                        setPinReviewOpen(false)
                        setPinResetDone(true)
                      }
                    }
                  )
                }}
              />
            </View>
            <Button label='Batal' variant='ghost' onPress={() => setPinReviewOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  hero: {
    alignItems: 'center',
    marginBottom: 20
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden'
  },
  avatarPhoto: {
    width: '100%',
    height: '100%'
  },
  avatarText: {
    fontSize: 25,
    fontWeight: '800',
    color: '#ffffff'
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  heroId: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10
  },
  balanceCard: {
    alignItems: 'center',
    marginBottom: 20
  },
  balanceValue: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.navy
  },
  infoCard: {
    marginBottom: 20
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  infoIco: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoMain: { flex: 1 },
  infoK: {
    fontSize: 12,
    color: colors.muted
  },
  infoV: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1
  },
  resetPinSuccess: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8
  },
  resetPinHint: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8
  },
  reviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,34,51,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl
  },
  reviewCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl
  },
  reviewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  reviewSubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 18
  },
  selfieRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 16
  },
  selfieCol: {
    flex: 1,
    alignItems: 'center'
  },
  selfieImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.skySoft,
    marginBottom: 4
  },
  selfieLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.navy
  },
  reviewBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8
  },
  reviewBtn: {
    flex: 1,
    marginTop: 0
  }
})
