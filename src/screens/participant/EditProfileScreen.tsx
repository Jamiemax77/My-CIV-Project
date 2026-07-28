import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { AvatarPicker, PickedPhoto } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip, ChipGroup } from '../../components/Chip';
import { DatePickerField } from '../../components/DatePickerField';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useUpdateAcademicInfo, useUpdateNim, useUpdateProfile } from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';
import { GENDER_LABEL } from './ProfileScreen';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nama wajib diisi'),
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().optional(),
  gender: z.enum(['L', 'P']).optional(),
  semester: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) > 0), 'Semester harus berupa angka'),
  targetIpk: z
    .string()
    .trim()
    .optional()
    .refine((v) => {
      if (!v) return true;
      const n = Number(v.replace(',', '.'));
      return n > 0 && n <= 4;
    }, 'Target IPK harus di antara 0 dan 4'),
  targetGraduationDate: z.string().trim().optional(),
  ppaCompletionDate: z.string().trim().optional(),
  university: z.string().trim().min(1, 'Universitas wajib diisi'),
  major: z.string().trim().min(1, 'Jurusan wajib diisi'),
  nim: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

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
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      gender: user?.gender,
      semester: user?.semester ? String(user.semester) : '',
      targetIpk: user?.targetIpk !== undefined ? user.targetIpk.toFixed(2) : '',
      targetGraduationDate: user?.targetGraduationDate ?? '',
      ppaCompletionDate: user?.ppaCompletionDate ?? '',
      university: user?.university ?? '',
      major: user?.major ?? '',
      nim: user?.nim ?? '',
    },
  });

  const saving = updateProfile.isPending || updateAcademicInfo.isPending || updateNim.isPending;

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
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        gender: values.gender,
        semester: values.semester ? Number(values.semester) : undefined,
        targetIpk: values.targetIpk ? Number(values.targetIpk.replace(',', '.')) : undefined,
        targetGraduationDate: values.targetGraduationDate || undefined,
        ppaCompletionDate: values.ppaCompletionDate || undefined,
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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header title="Edit Profil" onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
            <View style={styles.infoRow}>
              <View style={styles.infoIco}>
                <Ionicons name="id-card-outline" size={15} color={colors.navy} />
              </View>
              <View style={styles.infoMain}>
                <Text style={styles.infoK}>Nomor ID</Text>
                <Text style={styles.infoV}>{user?.idNumber ?? '-'}</Text>
              </View>
            </View>
          </Card>

          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <Field
                label="Nama Lengkap"
                placeholder="nama lengkap"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.fullName?.message}
              />
            )}
          />
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
          <Text style={[styles.fieldLabel, styles.gap]}>Jenis Kelamin</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <ChipGroup>
                <Chip
                  label={GENDER_LABEL.L}
                  active={field.value === 'L'}
                  onPress={() => field.onChange('L')}
                />
                <Chip
                  label={GENDER_LABEL.P}
                  active={field.value === 'P'}
                  onPress={() => field.onChange('P')}
                />
              </ChipGroup>
            )}
          />
          {errors.gender ? <Text style={styles.errorText}>{errors.gender.message}</Text> : null}

          <View style={styles.gap}>
            <Controller
              control={control}
              name="semester"
              render={({ field }) => (
                <Field
                  label="Semester"
                  placeholder="cth: 5"
                  keyboardType="numeric"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.semester?.message}
                />
              )}
            />
          </View>

          <Controller
            control={control}
            name="targetIpk"
            render={({ field }) => (
              <Field
                label="Target IPK (saat lulus)"
                placeholder="cth: 3.70"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.targetIpk?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="targetGraduationDate"
            render={({ field }) => (
              <DatePickerField
                label="Tanggal Lulus Kuliah"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.targetGraduationDate?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="ppaCompletionDate"
            render={({ field }) => (
              <DatePickerField
                label="Tanggal Lulus PPA (Completion Date)"
                value={field.value ?? ''}
                onChange={field.onChange}
                error={errors.ppaCompletionDate?.message}
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
    </KeyboardAvoidingView>
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  readOnlyId: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
  },
  gap: {
    marginTop: 13,
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
    fontSize: 12,
    color: colors.muted,
  },
  infoV: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 1,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
});
