import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useUnreadNotificationCount } from '../../hooks/useNotifications';
import { useAuthStore } from '../../store/authStore';
import { colors, radius } from '../../theme';

type InfoRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  filled: boolean;
};

export function AdminProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const { data: unreadData } = useUnreadNotificationCount();
  const initial = user?.fullName?.charAt(0) ?? '?';

  const infoRows: InfoRow[] = [
    { icon: 'id-card-outline', label: 'ID Staf', value: user?.idNumber ?? '-', filled: !!user?.idNumber },
    { icon: 'person-outline', label: 'Nama', value: user?.fullName ?? '-', filled: !!user?.fullName },
    { icon: 'mail-outline', label: 'Email', value: user?.email ?? '-', filled: !!user?.email },
    { icon: 'call-outline', label: 'No. HP / WA', value: user?.phone ?? '-', filled: !!user?.phone },
  ];

  return (
    <View style={styles.screen}>
      <Header
        variant="admin"
        greeting="Profil"
        name={user?.fullName ?? '-'}
        roleTag="ADMIN"
        avatarInitial={initial}
        avatarFileId={user?.photoUrl}
        token={token}
        onAvatarPress={() => navigation.navigate('EditAdminProfile')}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
        <Text style={styles.sectionTitle}>Data Akun</Text>
        <Card style={styles.infoCard}>
          {infoRows.map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIco}>
                <Ionicons name={row.icon} size={15} color={colors.navy} />
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoK}>{row.label}</Text>
                {row.filled ? (
                  <Text style={styles.infoV}>{row.value}</Text>
                ) : (
                  <Badge status="rejected" label="Belum diisi" />
                )}
              </View>
            </View>
          ))}
        </Card>

        <Text style={styles.sectionTitle}>Lainnya</Text>
        <Pressable onPress={() => navigation.navigate('Notifications')}>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIco}>
                <Ionicons name="notifications-outline" size={15} color={colors.navy} />
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoV}>Notifikasi</Text>
              </View>
              {unreadData?.count ? (
                <View style={styles.badgeDot}>
                  <Text style={styles.badgeDotText}>
                    {unreadData.count > 9 ? '9+' : unreadData.count}
                  </Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Card>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Archive')}>
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIco}>
                <Ionicons name="document-lock-outline" size={15} color={colors.navy} />
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoV}>Arsip Laporan (Cashier)</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </View>
          </Card>
        </Pressable>

        <Button
          label="Edit Profil"
          variant="ghost"
          onPress={() => navigation.navigate('EditAdminProfile')}
        />
        <Button label="Keluar" variant="navy" onPress={logout} />
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  infoIco: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMain: { flex: 1 },
  infoK: {
    fontSize: 12,
    color: colors.muted,
  },
  infoV: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  badgeDot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  badgeDotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
