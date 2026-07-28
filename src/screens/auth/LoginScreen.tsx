import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { z } from 'zod'
import { AuthStackParamList } from '../../app/AuthStack'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { PinInput } from '../../components/PinInput'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { useResponsive } from '../../hooks/useResponsive'
import { api } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { colors, radius } from '../../theme'
import { Role } from '../../types/models'

const schema = z.object({
  identifier: z.string().trim().min(1, 'Email/Nomor ID wajib diisi'),
  pin: z.string().length(6, 'PIN harus 6 digit angka')
})

type FormValues = z.infer<typeof schema>

export function LoginScreen () {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
  const [role, setRole] = useState<Role>('participant')
  const [formError, setFormError] = useState<string | null>(null)
  const [checkingIdentifier, setCheckingIdentifier] = useState(false)
  const [pinUnlocked, setPinUnlocked] = useState(false)
  const [identifierNotice, setIdentifierNotice] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState('')
  const login = useAuthStore(s => s.login)
  const { isTablet } = useResponsive()

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', pin: '' }
  })

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    const result = await login(role, values.identifier, values.pin)
    if (!result.ok) {
      setFormError(result.error)
    }
  }

  const runIdentifierCheck = async (rawValue: string) => {
    const trimmed = rawValue.trim()
    if (!trimmed) {
      setPinUnlocked(false)
      setIdentifierNotice(null)
      setLastChecked('')
      return
    }
    if (trimmed === lastChecked) return

    setCheckingIdentifier(true)
    setIdentifierNotice(null)
    setFormError(null)
    try {
      const result = await api.get<{ exists: boolean; role: Role | null }>(
        `/auth/lookup?identifier=${encodeURIComponent(trimmed)}`
      )
      if (!result.exists) {
        setPinUnlocked(false)
        setIdentifierNotice('Email/Nomor ID tidak terdaftar.')
      } else {
        setPinUnlocked(true)
        if (result.role && result.role !== role) {
          setRole(result.role)
        }
      }
    } catch {
      // Network hiccup — don't trap the user, let them try submitting normally.
      setPinUnlocked(true)
    } finally {
      setCheckingIdentifier(false)
      setLastChecked(trimmed)
    }
  }

  const identifierField = (
    <Controller
      control={control}
      name='identifier'
      render={({ field }) => (
        <Field
          label='Email / Nomor ID'
          placeholder='nama@kampus.ac.id'
          autoCapitalize='none'
          value={field.value}
          onChangeText={text => {
            field.onChange(text)
            if (text.trim() !== lastChecked) {
              setPinUnlocked(false)
              setIdentifierNotice(null)
            }
          }}
          onBlur={() => {
            field.onBlur()
            runIdentifierCheck(field.value)
          }}
          error={errors.identifier?.message ?? identifierNotice ?? undefined}
        />
      )}
    />
  )

  const pinField = (
    <View>
      <Text style={styles.pinLabel}>Masukkan PIN</Text>
      <Controller
        control={control}
        name='pin'
        render={({ field }) => (
          <PinInput
            value={field.value}
            onChange={field.onChange}
            disabled={!pinUnlocked}
          />
        )}
      />
      {checkingIdentifier ? (
        <View style={styles.checkingRow}>
          <ActivityIndicator size='small' color={colors.royal} />
          <Text style={styles.checkingText}>Memeriksa akun...</Text>
        </View>
      ) : (
        <Text style={styles.pinHint}>
          {pinUnlocked
            ? '6 digit angka rahasia Anda'
            : 'Masukkan Email / Nomor ID yang terdaftar terlebih dahulu'}
        </Text>
      )}
    </View>
  )

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ResponsiveContainer style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>CIV</Text>
        </View>
        <Text style={styles.title}>My CIV-Project</Text>
        <Text style={styles.tag}>Portal Beasiswa PPA Mawar Saron</Text>

        <View style={styles.roleToggle}>
          {(
            [
              { key: 'participant', label: 'Partisipan' },
              { key: 'admin', label: 'Admin / Staf' }
            ] as const
          ).map(opt => (
            <Pressable
              key={opt.key}
              onPress={() => setRole(opt.key)}
              style={[
                styles.roleOption,
                role === opt.key && styles.roleOptionActive
              ]}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === opt.key && styles.roleOptionTextActive
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {isTablet ? (
          <View style={styles.fieldsRow}>
            <View style={styles.fieldsCol}>{identifierField}</View>
            <View style={styles.fieldsCol}>{pinField}</View>
          </View>
        ) : (
          <>
            {identifierField}
            {pinField}
          </>
        )}

        {(errors.pin?.message || formError) && (
          <Text style={styles.errorText}>
            {errors.pin?.message ?? formError}
          </Text>
        )}

        <Button
          label='Masuk'
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={checkingIdentifier}
        />

        <Pressable onPress={() => navigation.navigate('ForgotPin')}>
          <Text style={styles.forgotPin}>Lupa PIN?</Text>
        </Pressable>
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 26
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
    shadowColor: colors.navy,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4
  },
  logoText: {
    fontSize: 37,
    fontWeight: '800',
    color: '#ffffff'
  },
  title: {
    textAlign: 'center',
    fontSize: 23,
    fontWeight: '800',
    color: colors.navy
  },
  tag: {
    textAlign: 'center',
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 22
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: colors.skySoft,
    borderRadius: radius.sm,
    padding: 4,
    marginBottom: 16
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm - 2
  },
  roleOptionActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted
  },
  roleOptionTextActive: {
    color: colors.navy
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start'
  },
  fieldsCol: {
    flex: 1
  },
  pinLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
    textAlign: 'center'
  },
  pinHint: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 8
  },
  checkingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  checkingText: {
    fontSize: 12,
    color: colors.royal,
    fontWeight: '600'
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8
  },
  forgotPin: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.blue,
    marginTop: 14
  }
})
