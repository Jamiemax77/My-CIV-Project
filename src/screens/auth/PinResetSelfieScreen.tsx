import { Ionicons } from '@expo/vector-icons'
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import * as ImagePicker from 'expo-image-picker'
import React, { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AuthStackParamList } from '../../app/AuthStack'
import { Button } from '../../components/Button'
import { Header } from '../../components/Header'
import { ApiError, submitPinResetRequest } from '../../lib/api'
import { colors, radius, spacing } from '../../theme'

type SelfieKey = 'front' | 'left' | 'right'
type SelfieFile = { uri: string; name: string }

const STEPS: { key: SelfieKey; label: string; instruction: string }[] = [
  { key: 'front', label: 'Depan', instruction: 'Hadapkan wajah lurus ke depan kamera.' },
  { key: 'left', label: 'Samping Kiri', instruction: 'Miringkan wajah ke arah kiri Anda.' },
  { key: 'right', label: 'Samping Kanan', instruction: 'Miringkan wajah ke arah kanan Anda.' }
]

type PinResetSelfieRoute = RouteProp<AuthStackParamList, 'PinResetSelfie'>

export function PinResetSelfieScreen () {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>()
  const { params } = useRoute<PinResetSelfieRoute>()
  const [selfies, setSelfies] = useState<Partial<Record<SelfieKey, SelfieFile>>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const allCaptured = STEPS.every(step => selfies[step.key])

  const captureStep = async (key: SelfieKey) => {
    setError(null)
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      setError('Izin kamera ditolak. Aktifkan izin kamera untuk melanjutkan.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.7
    })
    if (result.canceled) return
    const asset = result.assets[0]
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? `${key}.jpg`
    setSelfies(prev => ({ ...prev, [key]: { uri: asset.uri, name } }))
  }

  const onSubmit = async () => {
    if (!allCaptured) return
    setError(null)
    setSubmitting(true)
    try {
      await submitPinResetRequest(params.identifier, {
        front: selfies.front as SelfieFile,
        left: selfies.left as SelfieFile,
        right: selfies.right as SelfieFile
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal mengirim permintaan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <View style={styles.screen}>
        <Header variant='participant' title='Permintaan Terkirim' />
        <View style={styles.doneBody}>
          <View style={styles.doneIcon}>
            <Ionicons name='checkmark-circle' size={48} color={colors.accent} />
          </View>
          <Text style={styles.doneTitle}>Permintaan reset PIN terkirim</Text>
          <Text style={styles.doneMessage}>
            Admin akan meninjau foto Anda terlebih dahulu sebelum PIN direset ke PIN
            default. Silakan cek kembali secara berkala atau hubungi admin jika
            reset ini mendesak.
          </Text>
          <Button
            label='Kembali ke Login'
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <Header variant='participant' title='Verifikasi Wajah' onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.intro}>
          Ambil 3 foto swafoto sesuai instruksi di bawah ini. Foto akan dikirim ke
          admin untuk diverifikasi sebelum PIN Anda direset.
        </Text>

        {STEPS.map(step => {
          const captured = selfies[step.key]
          return (
            <View key={step.key} style={styles.stepCard}>
              <View style={styles.stepRow}>
                {captured ? (
                  <Image source={{ uri: captured.uri }} style={styles.thumb} />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <Ionicons name='camera-outline' size={20} color={colors.blue} />
                  </View>
                )}
                <View style={styles.stepMain}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepInstruction}>{step.instruction}</Text>
                </View>
              </View>
              <Button
                label={captured ? 'Ambil Ulang' : 'Ambil Foto'}
                variant={captured ? 'ghost' : 'navy'}
                onPress={() => captureStep(step.key)}
              />
            </View>
          )
        })}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          label='Kirim Permintaan'
          onPress={onSubmit}
          loading={submitting}
          disabled={!allCaptured}
        />
      </ScrollView>
    </View>
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
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: radius.sm
  },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.skySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepMain: { flex: 1 },
  stepLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  stepInstruction: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2
  },
  error: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: 8
  },
  doneBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 26
  },
  doneIcon: { marginBottom: 12 },
  doneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: 8
  },
  doneMessage: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20
  }
})
