import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { z } from 'zod'
import { AdminStackParamList } from '../../app/AdminStack'
import { Button } from '../../components/Button'
import { Chip, ChipGroup } from '../../components/Chip'
import { Field } from '../../components/Field'
import { Header } from '../../components/Header'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { useAddParticipant } from '../../hooks/useAdminData'
import { colors } from '../../theme'
import { SCHOLARSHIP_TYPES } from '../../types/models'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Nama wajib diisi'),
  idNumber: z.string().trim().min(2, 'Nomor ID wajib diisi'),
  nim: z.string().trim().optional(),
  email: z.string().trim().email('Email tidak valid'),
  phone: z.string().trim().optional(),
  gender: z.enum(['L', 'P'], { message: 'Pilih jenis kelamin' }),
  university: z.string().trim().min(2, 'Universitas wajib diisi'),
  major: z.string().trim().optional(),
  semester: z
    .string()
    .trim()
    .min(1, 'Semester wajib diisi')
    .refine(v => Number(v) > 0, 'Semester harus berupa angka'),
  scholarshipType: z.enum(
    ['CIV P153', 'CIV Edu', 'BDP Support PPA', 'Lainnya'],
    {
      message: 'Pilih jenis bantuan dana'
    }
  )
})

type FormValues = z.infer<typeof schema>

const defaultValues: FormValues = {
  fullName: '',
  idNumber: '',
  nim: '',
  email: '',
  phone: '',
  gender: undefined as unknown as FormValues['gender'],
  university: '',
  major: '',
  semester: '',
  scholarshipType: undefined as unknown as FormValues['scholarshipType']
}

export function AddParticipantScreen () {
  const navigation =
    useNavigation<NativeStackNavigationProp<AdminStackParamList>>()
  const addParticipant = useAddParticipant()
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null)
    try {
      const { id } = await addParticipant.mutateAsync({
        fullName: values.fullName.trim(),
        idNumber: values.idNumber.trim(),
        nim: values.nim?.trim() || undefined,
        email: values.email.trim(),
        phone: values.phone?.trim() || undefined,
        gender: values.gender,
        university: values.university?.trim() || undefined,
        major: values.major?.trim() || undefined,
        semester: values.semester ? Number(values.semester) : undefined,
        scholarshipType: values.scholarshipType
      })
      reset(defaultValues)
      navigation.replace('ParticipantDetail', { participantId: id })
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Gagal menambah partisipan.'
      )
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header
        variant='admin'
        title='Tambah Partisipan'
        onBack={navigation.goBack}
      />
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps='handled'
      >
        <ResponsiveContainer>
          <Controller
            control={control}
            name='fullName'
            render={({ field }) => (
              <Field
                label='Nama Lengkap'
                placeholder='nama partisipan'
                value={field.value}
                onChangeText={field.onChange}
                error={errors.fullName?.message}
              />
            )}
          />
          <Controller
            control={control}
            name='idNumber'
            render={({ field }) => (
              <Field
                label='Nomor ID'
                placeholder='cth: ID022400127'
                hint='Ditentukan admin, dipakai partisipan untuk login.'
                value={field.value}
                onChangeText={field.onChange}
                error={errors.idNumber?.message}
              />
            )}
          />
          <Controller
            control={control}
            name='nim'
            render={({ field }) => (
              <Field
                label='NIM (Opsional)'
                placeholder='diisi oleh partisipan'
                hint='Opsional — akan diisi sendiri oleh partisipan nanti.'
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name='email'
            render={({ field }) => (
              <Field
                label='Email'
                placeholder='nama@ppa.sample'
                autoCapitalize='none'
                keyboardType='email-address'
                value={field.value}
                onChangeText={field.onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name='phone'
            render={({ field }) => (
              <Field
                label='No. HP / WA (Opsional)'
                placeholder='081234567890'
                keyboardType='phone-pad'
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />

          <Text style={styles.fieldLabel}>Jenis Kelamin</Text>
          <Controller
            control={control}
            name='gender'
            render={({ field }) => (
              <ChipGroup>
                <Chip
                  label='Laki-laki'
                  active={field.value === 'L'}
                  onPress={() => field.onChange('L')}
                />
                <Chip
                  label='Perempuan'
                  active={field.value === 'P'}
                  onPress={() => field.onChange('P')}
                />
              </ChipGroup>
            )}
          />
          {errors.gender ? (
            <Text style={styles.errorText}>{errors.gender.message}</Text>
          ) : null}

          <Text style={[styles.fieldLabel, styles.gap]}>
            Jenis Bantuan Dana
          </Text>
          <Controller
            control={control}
            name='scholarshipType'
            render={({ field }) => (
              <ChipGroup>
                {SCHOLARSHIP_TYPES.map(type => (
                  <Chip
                    key={type}
                    label={type}
                    active={field.value === type}
                    onPress={() => field.onChange(type)}
                  />
                ))}
              </ChipGroup>
            )}
          />
          {errors.scholarshipType ? (
            <Text style={styles.errorText}>
              {errors.scholarshipType.message}
            </Text>
          ) : null}

          <View style={styles.gap}>
            <Controller
              control={control}
              name='university'
              render={({ field }) => (
                <Field
                  label='Universitas / Perguruan Tinggi'
                  placeholder=''
                  value={field.value}
                  onChangeText={field.onChange}
                  error={errors.university?.message}
                />
              )}
            />
          </View>
          <Controller
            control={control}
            name='major'
            render={({ field }) => (
              <Field
                label='Jurusan / Program Studi (Opsional)'
                placeholder='cth: Fakultas Ekonomi'
                value={field.value}
                onChangeText={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name='semester'
            render={({ field }) => (
              <Field
                label='Semester'
                placeholder=''
                keyboardType='numeric'
                value={field.value}
                onChangeText={field.onChange}
                error={errors.semester?.message}
              />
            )}
          />

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              PIN Awal: 000000{'\n'}Beri tahu partisipan untuk segera
              menggantinya — mereka akan diwajibkan mengganti PIN saat pertama
              kali login.
            </Text>
          </View>

          {submitError ? (
            <Text style={styles.errorText}>{submitError}</Text>
          ) : null}

          <Button
            label={
              addParticipant.isPending ? 'Menyimpan...' : 'Simpan Partisipan'
            }
            variant='navy'
            onPress={handleSubmit(onSubmit)}
            disabled={addParticipant.isPending}
            loading={addParticipant.isPending}
          />
        </ResponsiveContainer>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8
  },
  gap: {
    marginTop: 13
  },
  notice: {
    backgroundColor: '#fff3dc',
    borderRadius: 12,
    padding: 14,
    marginTop: 13,
    marginBottom: 8
  },
  noticeText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 17
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8
  }
})
