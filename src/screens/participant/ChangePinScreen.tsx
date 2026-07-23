import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Header } from '../../components/Header';
import { PinInput } from '../../components/PinInput';
import { ResponsiveContainer } from '../../components/ResponsiveContainer';
import { useChangePin } from '../../hooks/useParticipantData';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme';

type ChangePinScreenProps = {
  /** True when shown as a mandatory gate right after login with the default PIN — no back/cancel affordance. */
  forced?: boolean;
};

export function ChangePinScreen({ forced }: ChangePinScreenProps) {
  const navigation = useNavigation();
  const logout = useAuthStore((s) => s.logout);
  const changePin = useChangePin();
  const [currentPin, setCurrentPin] = React.useState('');
  const [newPin, setNewPin] = React.useState('');
  const [confirmPin, setConfirmPin] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (currentPin.length !== 6) {
      setError('PIN saat ini harus 6 digit angka.');
      return;
    }
    if (newPin.length !== 6) {
      setError('PIN baru harus 6 digit angka.');
      return;
    }
    if (newPin === '000000') {
      setError('PIN baru tidak boleh 000000.');
      return;
    }
    if (newPin !== confirmPin) {
      setError('Konfirmasi PIN baru tidak cocok.');
      return;
    }
    try {
      await changePin.mutateAsync({ currentPin, newPin });
      if (!forced) navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengganti PIN.');
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="Ubah PIN" onBack={forced ? undefined : navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer>
          {forced ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                PIN Anda masih PIN default (000000). Untuk keamanan akun, buat PIN baru sebelum
                melanjutkan.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>PIN Saat Ini</Text>
          <PinInput value={currentPin} onChange={setCurrentPin} autoFocus />

          <Text style={[styles.label, styles.gap]}>PIN Baru</Text>
          <PinInput value={newPin} onChange={setNewPin} />

          <Text style={[styles.label, styles.gap]}>Konfirmasi PIN Baru</Text>
          <PinInput value={confirmPin} onChange={setConfirmPin} />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label={changePin.isPending ? 'Menyimpan...' : 'Simpan PIN Baru'}
            variant="navy"
            onPress={submit}
            disabled={changePin.isPending}
            loading={changePin.isPending}
          />

          {forced ? (
            <Button label="Keluar" variant="ghost" onPress={logout} />
          ) : null}
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  notice: {
    backgroundColor: '#fff3dc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  noticeText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  gap: {
    marginTop: 13,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
});
