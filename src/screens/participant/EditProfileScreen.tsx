import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';
import { ParticipantStackParamList } from '../../app/ParticipantStack';
import { AvatarPicker, PickedPhoto } from '../../components/AvatarPicker';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { Header } from '../../components/Header';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useUpdateProfile } from '../../hooks/useParticipantData';
import { uploadFile } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

const schema = z.object({
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

export function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ParticipantStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateProfile = useUpdateProfile();
  const initial = user?.fullName?.charAt(0) ?? '?';

  const [photo, setPhoto] = React.useState<PickedPhoto | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email ?? '', phone: user?.phone ?? '' },
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
  errorText: {
    fontSize: 10,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8,
  },
});
