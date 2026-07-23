import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import React, { useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { AdminStackParamList } from '../../app/AdminStack'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { ConfirmModal } from '../../components/ConfirmModal'
import { EmptyState } from '../../components/EmptyState'
import { Header } from '../../components/Header'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { ScholarshipTypeModal } from '../../components/ScholarshipTypeModal'
import {
  useAdminParticipants,
  useResetParticipantPin,
  useSetScholarshipType
} from '../../hooks/useAdminData'
import { formatRupiah } from '../../lib/format'
import { colors, radius } from '../../theme'

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
  const resetPin = useResetParticipantPin()
  const [modalOpen, setModalOpen] = useState(false)
  const [resetPinConfirmOpen, setResetPinConfirmOpen] = useState(false)
  const [resetPinDone, setResetPinDone] = useState(false)

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
              <Text style={styles.avatarText}>{initial}</Text>
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

          <Text style={styles.sectionTitle}>Keamanan</Text>
          <Button
            label='Reset PIN ke Default'
            variant='ghost'
            onPress={() => {
              setResetPinDone(false)
              setResetPinConfirmOpen(true)
            }}
          />
          {resetPinDone ? (
            <Text style={styles.resetPinSuccess}>
              PIN berhasil direset ke 000000. Beri tahu partisipan untuk login
              lalu membuat PIN baru.
            </Text>
          ) : null}
        </ResponsiveContainer>
      </ScrollView>

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

      <ConfirmModal
        visible={resetPinConfirmOpen}
        title='Reset PIN Partisipan?'
        message={`PIN ${profile.fullName} akan direset ke 000000. Partisipan wajib membuat PIN baru saat login berikutnya.`}
        confirmLabel='Reset PIN'
        cancelLabel='Batal'
        destructive
        onConfirm={() => {
          setResetPinConfirmOpen(false)
          resetPin.mutate(profile.id, {
            onSuccess: () => setResetPinDone(true)
          })
        }}
        onCancel={() => setResetPinConfirmOpen(false)}
      />
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
    marginBottom: 10
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff'
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  heroId: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10
  },
  balanceCard: {
    alignItems: 'center',
    marginBottom: 20
  },
  balanceValue: {
    fontSize: 20,
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
    fontSize: 10,
    color: colors.muted
  },
  infoV: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1
  },
  resetPinSuccess: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8
  }
})
