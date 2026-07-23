import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Header } from '../../components/Header'
import { ResponsiveContainer } from '../../components/ResponsiveContainer'
import { colors, radius } from '../../theme'

export function AboutScreen () {
  const navigation = useNavigation()

  return (
    <View style={styles.screen}>
      <Header title='Tentang Aplikasi' onBack={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <ResponsiveContainer style={styles.responsive}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>CIV</Text>
          </View>
          <Text style={styles.appName}>My CIV-Project</Text>

          <Text style={styles.paragraph}>
            My CIV-Project adalah aplikasi mobile berbasis Android yang
            dirancang untuk mempermudah pengelolaan beasiswa PPA (Peningkatan
            Prestasi Akademik). Aplikasi ini menjadi jembatan antara penerima
            beasiswa dan pihak pengelola, menghadirkan proses penyaluran dana,
            pertanggungjawaban penggunaan, dan pelaporan akademik yang
            transparan, rapi, dan mudah diakses dari genggaman tangan.
          </Text>
          <Text style={styles.paragraph}>
            Kami percaya bahwa pengelolaan beasiswa yang baik dimulai dari
            kemudahan dan keterbukaan. Karena itu, My CIV-Project menyatukan
            semua kebutuhan administrasi beasiswa, mulai dari memantau dana,
            mengajukan reimbursement, hingga melaporkan progres kuliah, ke dalam
            satu platform yang sederhana dan tepercaya.
          </Text>

          <Text style={styles.sectionTitle}>Visi</Text>
          <Text style={styles.paragraph}>
            Menjadi platform digital yang mendukung transparansi dan
            akuntabilitas dalam pengelolaan beasiswa, sekaligus membantu para
            penerima berfokus pada prestasi akademik mereka tanpa terbebani
            proses administrasi yang rumit.
          </Text>

          <Text style={styles.sectionTitle}>Misi</Text>
          <Text style={styles.paragraph}>
            Kami berkomitmen menyederhanakan proses administrasi beasiswa
            melalui teknologi, menghadirkan keterbukaan penuh antara pengelola
            dan penerima dalam setiap penyaluran dan penggunaan dana, mendorong
            kedisiplinan pelaporan akademik penerima beasiswa, serta menjaga
            keamanan data dan kenyamanan pengguna di setiap interaksi.
          </Text>

          <Text style={styles.sectionTitle}>Apa yang Kami Tawarkan</Text>
          <Text style={styles.paragraph}>
            Bagi partisipan, My CIV-Project memudahkan pemantauan jumlah
            beasiswa yang diterima beserta rincian penggunaannya, pengajuan
            reimbursement atau pengembalian dana dengan melampirkan bukti,
            pengunggahan laporan akademik tiap semester, serta pengelolaan
            rekening dan e-wallet untuk pencairan. Bagi pihak pengelola,
            aplikasi ini menyediakan sarana untuk menginput dana, memverifikasi
            pengajuan dan laporan, memantau keaktifan penerima, serta
            mengirimkan bukti transfer sebagai konfirmasi penyaluran dana yang
            sah dan terdokumentasi.
          </Text>

          <Text style={styles.sectionTitle}>Komitmen Kami</Text>
          <Text style={[styles.paragraph, styles.lastParagraph]}>
            Setiap fitur dalam My CIV-Project dibangun dengan mengutamakan
            keamanan, kemudahan, dan transparansi. Akses pengguna dilindungi
            dengan autentikasi PIN, dan seluruh proses pencairan dana tercatat
            dan dapat ditelusuri oleh kedua belah pihak, sehingga kepercayaan
            antara pengelola dan penerima beasiswa selalu terjaga.
          </Text>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  responsive: { alignItems: 'center' },
  logo: {
    width: 64,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff'
  },
  appName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 14
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '700',
    color: colors.navy,
    marginTop: 6,
    marginBottom: 8
  },
  paragraph: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 19,
    textAlign: 'justify',
    marginBottom: 14
  },
  lastParagraph: {
    marginBottom: 4
  }
})
