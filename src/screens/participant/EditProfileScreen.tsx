import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { AvatarPicker, PickedPhoto } from '../../components/AvatarPicker';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useUpdateAcademicInfo, useUpdateNim, useUpdateProfile } from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { GENDER_LABEL } from './ProfileScreen';

const schema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().optional(),
  university: z.string().trim().min(1, 'Universitas wajib diisi'),
  major: z.string().trim().min(1, 'Jurusan wajib diisi'),
  nim: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

type ReadOnlyRow = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  filled: boolean;
};

export function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParticipantStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateProfile = useUpdateProfile();
  const updateAcademicInfo = useUpdateAcademicInfo();
  const updateNim = useUpdateNim();
  const initial = user?.fullName?.charAt(0) ?? '?';

  const [photo, setPhoto] = React.useState<PickedPhoto | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      university: user?.university ?? '',
      major: user?.major ?? '',
      nim: user?.nim ?? '',
    },
  });

  const saving = updateProfile.isPending || updateAcademicInfo.isPending || updateNim.isPending;

  const readOnlyRows: ReadOnlyRow[] = [
    {
      icon: 'id-card-outline',
      label: 'Nomor ID',
      value: user?.idNumber ?? '-',
      filled: !!user?.idNumber,
    },
    {
      icon: 'person-outline',
      label: 'Nama',
      value: user?.fullName ?? '-',
      filled: !!user?.fullName,
    },
    {
      icon: 'male-female-outline',
      label: 'Jenis Kelamin',
      value: user?.gender ? GENDER_LABEL[user.gender] : '-',
      filled: !!user?.gender,
    },
    {
      icon: 'school-outline',
      label: 'Semester',
      value: user?.semester ? `Semester ${user.semester}` : '-',
      filled: !!user?.semester,
    },
  ];

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setSubmitError(null);
    try {
      let photoFileId: string | undefined;
      if (photo) {
        const uploaded = await uploadFile(photo, 'profile-photo', token, user.id);
        photoFileId = uploaded.fileId;
      }
      await updateProfile.mutateAsync({
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        photoFileId,
      });
      await updateAcademicInfo.mutateAsync({
        major: values.major.trim(),
        university: values.university.trim(),
      });
      if (values.nim?.trim()) {
        await updateNim.mutateAsync(values.nim.trim());
      }
      navigation.navigate('Tabs', { screen: 'Profil' });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Gagal menyimpan profil.');
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Edit Profil" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
          <View style={styles.avatarSection}>
            <AvatarPicker
              initial={initial}
              localUri={photo?.uri}
              remoteFileId={user?.photoUrl}
              token={token}
              onPick={setPhoto}
              size={84}
            />
            <Text style={styles.readOnlyName}>{user?.fullName ?? '-'}</Text>
            <Text style={styles.readOnlyId}>No. ID : {user?.idNumber ?? '-'}</Text>
          </View>

          <Text style={styles.sectionTitle}>Data Diri</Text>
          <Card style={styles.infoCard}>
            {readOnlyRows.map((row) => (
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

          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Field
                label="Email"
                placeholder="nama@kampus.ac.id"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field }) => (
              <Field
                label="No. HP / WA"
                placeholder="081234567890"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="university"
            render={({ field }) => (
              <Field
                label="Universitas"
                placeholder="cth: Universitas Negeri Manado"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.university?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="major"
            render={({ field }) => (
              <Field
                label="Jurusan"
                placeholder="cth: Teknik Informatika"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.major?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="nim"
            render={({ field }) => (
              <Field
                label="NIM"
                placeholder="cth: 22400166"
                keyboardType="numeric"
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <Button
            label={saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            variant="navy"
            onPress={handleSubmit(onSubmit)}
            disabled={saving}
            loading={saving}
          />
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  readOnlyName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  readOnlyId: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  infoCard: {
    marginBottom: 20,
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
    fontSize: 10,
    color: colors.muted,
  },
  infoV: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  errorText: {
    fontSize: 10,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
});
