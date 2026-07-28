import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Header } from '../../components/Header'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { colors } from '../../theme'

export function HelpFaqScreen () {
  const navigation = useNavigation()
  const currentYear = new Date().getFullYear()

  return (
    <View style={styles.screen}>
      <Header title='Bantuan & FAQ' onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer style={styles.responsive}>
          <Text style={styles.sectionTitle}>
            Pertanyaan yang Sering Diajukan
          </Text>

          {/* Item FAQ 1 */}
          <View style={styles.faqCard}>
            <Text style={styles.question}>
              Q: Bagaimana cara mengajukan reimbursement?
            </Text>
            <Text style={styles.answer}>
              A: Buka menu Reimbursement, isi nominal pengeluaran, lalu unggah
              foto bukti transfer atau nota fisik yang sah sebelum mengirim
              pengajuan.
            </Text>
          </View>

          {/* Item FAQ 2 */}
          <View style={styles.faqCard}>
            <Text style={styles.question}>
              Q: Kapan batas akhir pengunggahan laporan akademik?
            </Text>
            <Text style={styles.answer}>
              A: Laporan perkembangan IPK dan KRS wajib diunggah maksimal 2
              minggu setelah nilai semester berjalan resmi dikeluarkan oleh
              pihak kampus.
            </Text>
          </View>

          {/* Item FAQ 3 */}
          <View style={styles.faqCard}>
            <Text style={styles.question}>
              Q: Bagaimana jika pencairan dana beasiswa terkendala?
            </Text>
            <Text style={styles.answer}>
              A: Pastikan nomor rekening atau e-wallet Anda sudah benar di menu
              akun. Jika masih terkendala, hubungi pihak pengelola melalui
              kontak bantuan admin. Melalui email id224ms.portal1a@gmail.com
              atau nomor whatsapp 085241819904 (koordinator PPA)
            </Text>
          </View>
        </ResponsiveContainer>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {currentYear} My CIV Project. Hak Cipta Dilindungi.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  responsive: { width: '100%' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 16,
    marginTop: 8
  },
  faqCard: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  question: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.navy,
    marginBottom: 6
  },
  answer: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 18,
    textAlign: 'justify'
  },
  footer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg
  },
  footerText: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center'
  }
})
