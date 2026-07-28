import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { AdminStackParamList } from '../../app/AdminStack';
import { AvatarPicker, PickedPhoto } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useUpdateAdminProfile } from '../../hooks/useAdminData';
import { uploadFile } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nama wajib diisi'),
  idNumber: z.string().trim().min(2, 'ID Staf wajib diisi'),
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditAdminProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateProfile = useUpdateAdminProfile();
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
      idNumber: user?.idNumber ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
    },
  });

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
        idNumber: values.idNumber.trim(),
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        photoFileId,
      });
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
      <Header variant="admin" title="Edit Profil" onBack={navigation.goBack} />
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
          </View>

          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <Field
                label="Nama Lengkap"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.fullName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="idNumber"
            render={({ field }) => (
              <Field
                label="ID Staf"
                value={field.value}
                onChangeText={field.onChange}
                error={errors.idNumber?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <Field
                label="Email"
                placeholder="nama@ppa.sample"
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

          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

          <Button
            label={updateProfile.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            variant="navy"
            onPress={handleSubmit(onSubmit)}
            disabled={updateProfile.isPending}
            loading={updateProfile.isPending}
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
  errorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
});
