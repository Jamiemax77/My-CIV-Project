import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React from 'react'
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { ParticipantStackParamList } from '../../app/ParticipantStack'
import { Badge } from '../../components/Badge'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { EditNimModal } from '../../components/EditNimModal'
import { Header } from '../../components/Header'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { useUpdateNim } from '../../hooks/useParticipantData'
import { api, buildFileUrl } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { colors, radius } from '../../theme'
import { UserProfile } from '../../types/models'

export const GENDER_LABEL: Record<'L' | 'P', string> = {
  L: 'Laki-laki',
  P: 'Perempuan'
}

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  filled: boolean
  onPress?: () => void
}

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap
  iconBg: string
  label: string
  onPress?: () => void
}

export function ProfileScreen () {
  const navigation =
    useNavigation<NativeStackNavigationProp<ParticipantStackParamList>>()
  const user = useAuthStore(s => s.user)
  const token = useAuthStore(s => s.token)
  const logout = useAuthStore(s => s.logout)
  const updateNim = useUpdateNim()
  const [nimModalOpen, setNimModalOpen] = React.useState(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(true)
  const initial = user?.fullName?.charAt(0) ?? '?'

  const onRefresh = React.useCallback(async () => {
    if (!token) return
    setRefreshing(true)
    try {
      const { profile } = await api.get<{ profile: UserProfile }>(
        '/auth/me',
        token
      )
      useAuthStore.getState().updateUser(profile)
    } catch {
      // Ignore transient errors — user can just pull again.
    } finally {
      setRefreshing(false)
    }
  }, [token])

  const infoRows: InfoRow[] = [
    {
      icon: 'id-card-outline',
      label: 'Nomor ID',
      value: user?.idNumber ?? '-',
      filled: !!user?.idNumber
    },

    {
      icon: 'person-outline',
      label: 'Nama',
      value: user?.fullName ?? '-',
      filled: !!user?.fullName
    },
    {
      icon: 'mail-outline',
      label: 'Email',
      value: user?.email ?? '-',
      filled: !!user?.email
    },
    {
      icon: 'call-outline',
      label: 'No. HP / WA',
      value: user?.phone ?? '-',
      filled: !!user?.phone
    },
    {
      icon: 'male-female-outline',
      label: 'Jenis Kelamin',
      value: user?.gender ? GENDER_LABEL[user.gender] : '-',
      filled: !!user?.gender
    },
    {
      icon: 'business-outline',
      label: 'Universitas',
      value: user?.university ?? '-',
      filled: !!user?.university
    },
    {
      icon: 'card-outline',
      label: 'NIM',
      value: user?.nim ?? '-',
      filled: !!user?.nim,
      onPress: () => setNimModalOpen(true)
    },
    {
      icon: 'school-outline',
      label: 'Semester',
      value: user?.semester ? `Semester ${user.semester}` : '-',
      filled: !!user?.semester
    }
  ]

  const menuItems: MenuItem[] = [
    {
      icon: 'create-outline',
      iconBg: colors.skySoft,
      label: 'Edit Profil',
      onPress: () => navigation.navigate('EditProfile')
    },
    {
      icon: 'business-outline',
      iconBg: colors.skySoft,
      label: 'Rekening & E-Wallet',
      onPress: () => navigation.navigate('Accounts')
    },
    {
      icon: 'lock-closed-outline',
      iconBg: '#fff3dc',
      label: 'Ubah PIN',
      onPress: () => navigation.navigate('ChangePin')
    },
    {
      icon: 'notifications-outline',
      iconBg: colors.skySoft,
      label: 'Notifikasi'
    },
    {
      icon: 'information-circle-outline',
      iconBg: colors.skySoft,
      label: 'Tentang My CIV-Project',
      onPress: () => navigation.navigate('About')
    },
    {
      icon: 'help-circle-outline',
      iconBg: colors.skySoft,
      label: 'Bantuan & FAQ',
      onPress: () => navigation.navigate('HelpFaq')
    }
  ]

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.navy}
            colors={[colors.navy]}
          />
        }
      >
        <View style={styles.hero}>
          <Pressable
            style={styles.photoWrap}
            onPress={() => navigation.navigate('EditProfile')}
          >
            {user?.photoUrl ? (
              <Image
                source={{
                  uri: buildFileUrl(user.photoUrl),
                  headers: token
                    ? { Authorization: `Bearer ${token}` }
                    : undefined
                }}
                style={styles.photoImage}
              />
            ) : (
              <Text style={styles.photoInitial}>{initial}</Text>
            )}
            <View style={styles.camBadge}>
              <Ionicons name='camera' size={12} color='#ffffff' />
            </View>
          </Pressable>
          <Text style={styles.heroName}>{user?.fullName ?? '-'}</Text>
          <Text style={styles.heroId}>Nomor ID - {user?.idNumber ?? '-'}</Text>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>PENERIMA BEASISWA PPA</Text>
          </View>
        </View>

        <ResponsiveContainer style={styles.body}>
          <Text style={styles.sectionTitle}>Data Diri</Text>
          <Card style={styles.infoCard}>
            {infoRows.map(row => {
              const rowContent = (
                <View style={styles.infoRow}>
                  <View style={styles.infoIco}>
                    <Ionicons name={row.icon} size={15} color={colors.navy} />
                  </View>
                  <View style={styles.infoMain}>
                    <Text style={styles.infoK}>{row.label}</Text>
                    {row.filled ? (
                      <Text style={styles.infoV}>{row.value}</Text>
                    ) : (
                      <Badge status='rejected' label='Belum diisi' />
                    )}
                  </View>
                  {row.onPress ? (
                    <Ionicons
                      name='chevron-forward'
                      size={16}
                      color={colors.muted}
                    />
                  ) : null}
                </View>
              )
              return row.onPress ? (
                <Pressable key={row.label} onPress={row.onPress}>
                  {rowContent}
                </Pressable>
              ) : (
                <View key={row.label}>{rowContent}</View>
              )
            })}
          </Card>

          <Pressable
            style={styles.sectionHeader}
            onPress={() => setSettingsOpen(o => !o)}
          >
            <Text style={styles.sectionTitle}>Pengaturan</Text>
            <Ionicons
              name={settingsOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.muted}
            />
          </Pressable>
          {settingsOpen ? (
            <Card style={styles.menuCard}>
              {menuItems.map(item => (
                <Pressable
                  key={item.label}
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View
                    style={[styles.menuIco, { backgroundColor: item.iconBg }]}
                  >
                    <Ionicons name={item.icon} size={15} color={colors.navy} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons
                    name='chevron-forward'
                    size={16}
                    color={colors.muted}
                  />
                </Pressable>
              ))}
            </Card>
          ) : null}

          <Button label='Keluar' variant='navy' onPress={logout} />
        </ResponsiveContainer>
      </ScrollView>

      <EditNimModal
        visible={nimModalOpen}
        currentNim={user?.nim}
        saving={updateNim.isPending}
        onSave={nim =>
          updateNim.mutate(nim, {
            onSuccess: () => setNimModalOpen(false)
          })
        }
        onClose={() => setNimModalOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 8 },
  hero: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl
  },
  photoWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  photoInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff'
  },
  photoImage: {
    width: 76,
    height: 76,
    borderRadius: 38
  },
  camBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.royal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.navy
  },
  heroName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  heroId: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2
  },
  heroTag: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20
  },
  heroTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff'
  },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
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
  menuCard: {
    marginBottom: 20
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8
  },
  menuIco: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center'
  },
  menuLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  }
})
