import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AuthStackParamList } from '../../app/AuthStack'
import { Button } from '../../components/Button'
import { Field } from '../../components/Field'
import { Header } from '../../components/Header'
import { api } from '../../lib/api'
import { colors } from '../../theme'
import { Role } from '../../types/models'

export function ForgotPinScreen () {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
  const [identifier, setIdentifier] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const canSubmit = identifier.trim().length > 0 && !checking

  const onSubmit = async () => {
    const trimmed = identifier.trim()
    setError(null)
    setChecking(true)
    try {
      const result = await api.get<{ exists: boolean; role: Role | null }>(
        `/auth/lookup?identifier=${encodeURIComponent(trimmed)}`
      )
      if (!result.exists) {
        setError('Email/Nomor ID tidak terdaftar.')
        return
      }
      if (result.role !== 'participant') {
        setError('Akun ini bukan akun partisipan. Reset PIN mandiri hanya tersedia untuk partisipan.')
        return
      }
      navigation.navigate('PinResetSelfie', { identifier: trimmed })
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header variant='participant' title='Lupa PIN?' onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Masukkan Email atau Nomor ID yang terdaftar. Anda akan diminta mengambil 3 foto
          swafoto (depan, samping kiri, samping kanan) untuk diverifikasi admin
          sebelum PIN Anda direset ke PIN default.
        </Text>

        <Field
          label='Email / Nomor ID'
          placeholder='nama@kampus.ac.id'
          autoCapitalize='none'
          value={identifier}
          onChangeText={text => {
            setIdentifier(text)
            setError(null)
          }}
          error={error ?? undefined}
        />

        <Button
          label='Lanjutkan'
          onPress={onSubmit}
          loading={checking}
          disabled={!canSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  intro: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 18
  }
})
