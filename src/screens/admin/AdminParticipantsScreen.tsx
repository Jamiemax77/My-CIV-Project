import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AdminStackParamList } from '../../app/AdminStack';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { ScholarshipTypeModal } from '../../components/ScholarshipTypeModal';
import { Skeleton } from '../../components/Skeleton';
import { useAdminParticipants, useSetScholarshipType } from '../../hooks/useAdminData';
import { formatRupiah } from '../../lib/format';
import { colors, radius } from '../../theme';
import { AdminParticipant } from '../../types/models';

const AVATAR_COLORS = [colors.navy, colors.steel, colors.blue];

export function AdminParticipantsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { data: participants, isLoading, isError, refetch, isRefetching } = useAdminParticipants();
  const setScholarshipType = useSetScholarshipType();

  const [search, setSearch] = useState('');
  const [scholarshipTarget, setScholarshipTarget] = useState<AdminParticipant | null>(null);

  const filtered = useMemo(
    () =>
      (participants ?? []).filter((p) =>
        `${p.profile.fullName} ${p.profile.idNumber}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      ),
    [participants, search]
  );

  return (
    <View style={styles.screen}>
      <Header variant="admin" title="Daftar Partisipan" />
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
          <Button
            label="+ Tambah Partisipan"
            variant="navy"
            onPress={() => navigation.navigate('AddParticipant')}
            style={styles.addBtn}
          />

          <TextInput
            style={styles.search}
            placeholder="Cari nama / NIM..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />

          {isLoading ? (
            <View>
              <Skeleton height={72} radiusSize={radius.md} style={styles.skeletonGap} />
              <Skeleton height={72} radiusSize={radius.md} style={styles.skeletonGap} />
              <Skeleton height={72} radiusSize={radius.md} style={styles.skeletonGap} />
            </View>
          ) : isError ? (
            <View>
              <EmptyState
                icon="cloud-offline-outline"
                title="Gagal memuat data"
                subtitle="Coba lagi sebentar lagi."
              />
              <Button label="Coba Lagi" variant="ghost" onPress={() => refetch()} />
            </View>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="Partisipan tidak ditemukan"
              subtitle="Coba kata kunci nama atau NIM yang lain, atau tambahkan partisipan baru."
            />
          ) : (
            filtered.map((item, index) => (
              <Pressable
                key={item.profile.id}
                style={styles.row}
                onPress={() =>
                  navigation.navigate('ParticipantDetail', { participantId: item.profile.id })
                }
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] },
                  ]}
                >
                  <Ionicons name="person" size={15} color="#ffffff" />
                </View>
                <View style={styles.rowMain}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      {item.profile.fullName}
                    </Text>
                    <Badge
                      status={item.status === 'aktif' ? 'approved' : 'pending'}
                      label={item.status === 'aktif' ? 'Aktif' : 'Belum Lapor'}
                    />
                  </View>
                  <Text style={styles.rowSubtitle}>
                    {item.profile.idNumber} · Sisa: {formatRupiah(item.remaining)}
                  </Text>
                  <Pressable
                    style={[
                      styles.scholarshipTag,
                      !item.profile.scholarshipType && styles.scholarshipTagEmpty,
                    ]}
                    onPress={() => setScholarshipTarget(item)}
                  >
                    <Ionicons
                      name="ribbon-outline"
                      size={11}
                      color={item.profile.scholarshipType ? colors.royal : colors.muted}
                    />
                    <Text
                      style={[
                        styles.scholarshipTagText,
                        !item.profile.scholarshipType && styles.scholarshipTagTextEmpty,
                      ]}
                    >
                      {item.profile.scholarshipType ?? 'Pilih Jenis Bantuan'}
                    </Text>
                  </Pressable>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))
          )}
        </ResponsiveContainer>
      </ScrollView>

      <ScholarshipTypeModal
        visible={!!scholarshipTarget}
        participantName={scholarshipTarget?.profile.fullName ?? ''}
        currentType={scholarshipTarget?.profile.scholarshipType}
        saving={setScholarshipType.isPending}
        onSelect={(type) => {
          if (!scholarshipTarget) return;
          setScholarshipType.mutate({ id: scholarshipTarget.profile.id, scholarshipType: type });
        }}
        onClose={() => setScholarshipTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  addBtn: {
    marginBottom: 14,
  },
  skeletonGap: {
    marginTop: 8,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#ffffff',
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 12,
    color: colors.text,
    marginBottom: 12,
  },
  row: {
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
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowMain: {
    flex: 1,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rowName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  scholarshipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: colors.skySoft,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  scholarshipTagEmpty: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  scholarshipTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.royal,
  },
  scholarshipTagTextEmpty: {
    fontWeight: '600',
    color: colors.muted,
  },
});
