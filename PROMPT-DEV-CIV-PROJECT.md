# PROMPT PENGEMBANGAN — My CIV-Project (Portal Beasiswa PPA)

> **Cara pakai:** Salin blok prompt ini ke AI coding assistant di VSCode (Copilot Chat / Cursor / Claude Code). Kerjakan **bertahap per milestone** — jangan minta generate semua sekaligus. Referensi visual final ada di `civ-mockup.html` (buka di browser untuk melihat semua 14 layar).

---

## 0. RINGKASAN PRODUK

**Nama aplikasi:** My CIV-Project
**Tagline:** Portal Beasiswa PPA (Peningkatan Prestasi Akademik)
**Platform:** Mobile Android (utamakan Android; boleh cross-platform)
**Bahasa UI:** Bahasa Indonesia
**Tujuan:** Menjembatani penerima beasiswa (Partisipan) dengan pengelola (Admin/Staf) untuk penyaluran dana, pertanggungjawaban (reimbursement), pelaporan akademik, dan bukti transfer yang transparan.

**Dua peran (role):**
1. **Partisipan** — penerima beasiswa
2. **Admin / Staf PPA** — pengelola

---

## 1. TECH STACK YANG DIINGINKAN

- **Framework:** React Native + **Expo** (managed workflow) + **TypeScript**
- **Navigasi:** React Navigation
  - Native Stack Navigator (root: Splash → Auth → App)
  - Bottom Tab Navigator terpisah untuk Partisipan dan Admin
- **State/Data:** Zustand (global auth/user state) + React Query/TanStack Query (server state) — atau Context bila ingin ringan
- **Backend (rekomendasi MVP):** **Supabase**
  - Auth (email + PIN custom, lihat catatan keamanan di §7)
  - Postgres (tabel di §6)
  - Storage (upload bukti reimbursement, KHS/transkrip PDF, bukti transfer)
  - Row Level Security (RLS) untuk memisahkan data per-partisipan & akses admin
- **Form & validasi:** React Hook Form + Zod
- **Komponen:** buat komponen sendiri (bukan UI library berat) agar sesuai desain mockup. Boleh pakai `react-native-svg` untuk ikon; emoji di mockup adalah placeholder — ganti dengan ikon (Lucide / Ionicons) di produksi.
- **Format uang:** helper `formatRupiah(number)` → `Rp 6.000.000`

> Jika kamu (developer) lebih memilih Firebase, boleh — sesuaikan §6 ke Firestore + Firebase Storage + Firebase Auth. Struktur data tetap sama.

---

## 1B. ALTERNATIF BACKEND (GRATIS/RINGAN): Google Sheets + Google Drive + Apps Script

> Cocok untuk MVP/pilot dengan jumlah partisipan kecil–menengah (puluhan–ratusan) dan tanpa budget backend. **Bukan pengganti langsung Supabase** — beberapa jaminan (RLS, transaksi, hashing PIN kuat) harus ditulis manual. Jika program tumbuh besar / menyangkut audit dana ketat, migrasi ke Supabase/Firebase.

### Komponen

- **Google Sheets** = "database". 1 spreadsheet, tiap tab = 1 tabel (lihat mapping §6B).
- **Google Apps Script** (bound ke spreadsheet, deploy sebagai **Web App**) = satu-satunya lapisan API. App mobile **tidak pernah** bicara langsung ke Sheets/Drive API — selalu lewat Web App ini, supaya kontrol akses & validasi terpusat.
- **Google Drive** = penyimpanan file (bukti reimbursement, KHS/transkrip, bukti transfer, foto profil), diorganisir per partisipan: `/CIV-Project/{participant_id}/{kategori}/`.
- **App (Expo/RN):** ganti `lib/supabase.ts` → `lib/api.ts` yang memanggil URL Web App via `fetch`/`axios`, dengan pola `POST { action, token, payload }`.

### Alur Auth (PIN)

1. Login: app kirim `{ id_number, pin }` → Apps Script `action=login`.
2. Apps Script cari baris di sheet `profiles`, cocokkan `pin_hash` = `SHA-256(pin + salt)` (pakai `Utilities.computeDigest`; Apps Script **tidak punya bcrypt/argon2 native** — ini lebih lemah dari rekomendasi §7, mitigasi: salt unik per user + rate-limit percobaan gagal, lihat §7B).
3. Sukses → Apps Script buat **session token** ber-signature HMAC (`Utilities.computeHmacSha256Signature` + secret di Script Properties) berisi `{profile_id, role, exp}`.
4. App simpan token (AsyncStorage/SecureStore), sertakan di tiap request berikutnya. Apps Script **selalu verifikasi HMAC + expiry** dulu sebelum proses apa pun — token inilah yang dipakai untuk emulasi RLS (lihat di bawah).

### Emulasi "RLS" (karena Sheets tak punya row-level security)

Setiap action di Apps Script **wajib** filter manual berdasarkan `profile_id`/`role` dari token:

- Partisipan hanya boleh baca/tulis baris dengan `participant_id === token.profile_id`.
- Admin (`role==='admin'`) boleh akses semua baris.
- Ini semua logika kode, bukan jaminan platform — bug di satu action = kebocoran data lintas partisipan. Review tiap endpoint dengan teliti.

### Konkurensi & integritas data

- Sheets tidak punya transaction. **Wajib** bungkus tiap action tulis (approve reimbursement, input dana, dll) dengan `LockService.getScriptLock()` supaya tidak ada race condition saat dua request nulis bersamaan (mis. dua admin approve klaim yang sama, atau saldo dihitung dari data basi).
- "Sisa Dana" tetap dihitung on-the-fly dari SUM(disbursements) − SUM(reimbursements disetujui) di sisi Apps Script, bukan disimpan sebagai field lepas — hindari data yang tidak sinkron.

### Upload file ke Drive

1. App: pilih file → validasi tipe & ukuran (maks 5MB) di client → convert base64 → kirim ke `action=uploadFile { participant_id, category, filename, base64 }`.
2. Apps Script: cek ulang ukuran (base64 length), decode ke `Blob`, simpan ke folder Drive partisipan, **jangan set sharing "anyone with link"** — lebih aman: file tetap privat, dan akses baca selalu lewat `action=getFile { fileId }` di Web App (Apps Script yang verifikasi token dulu baru stream isi file/return short-lived URL). Simpan `fileId` ke kolom `*_drive_id` di sheet terkait.

### Batasan yang perlu disadari (bandingkan dengan §7)

- **PIN hashing lebih lemah** dari bcrypt/argon2 → wajib salt unik + lockout setelah N kali gagal (tambahkan sheet `login_attempts` atau kolom counter di `profiles`).
- **Tidak ada RLS platform-level** — seluruh isolasi data partisipan bergantung pada kebenaran kode Apps Script.
- **Kuota Apps Script**: eksekusi maks 6 menit/panggilan (akun konsumen) atau 30 menit (Workspace), plus kuota harian UrlFetch/trigger — aman untuk skala puluhan–ratusan partisipan, tapi jadi masalah kalau tumbuh besar.
- **Tidak ada realtime/offline sync** bawaan seperti Supabase — app perlu polling/manual refresh (React Query) sendiri.
- **Backup**: 1 spreadsheet = single point of failure. Aktifkan Drive version history, dan pertimbangkan export berkala (mis. trigger harian yang salin snapshot ke spreadsheet lain).

---

## 2. DESIGN SYSTEM (WAJIB IKUTI — dari mockup)

Buat file `theme.ts` berisi token berikut:

```ts
export const colors = {
  navy:     '#06345c',
  navy2:    '#0a2a47',
  steel:    '#5e8bb0',
  blue:     '#0e5fa4',
  royal:    '#1f49f5',  // warna aksi utama (tombol primary)
  sky:      '#aeebff',
  skySoft:  '#e6f7ff',
  accent:   '#00c48c',  // sukses / positif
  danger:   '#ff5a5f',
  warning:  '#ffb020',
  bg:       '#eef3f8',  // background layar
  card:     '#ffffff',
  text:     '#0c2233',
  muted:    '#7a8ca0',
  line:     '#dde6ef',  // border
};

export const badge = {
  pending:  { bg: '#fff3dc', fg: '#b4790a' }, // "Menunggu"
  approved: { bg: '#dbf8ee', fg: '#02875d' }, // "Disetujui/Terverifikasi/Aktif"
  rejected: { bg: '#ffe3e4', fg: '#c23a3f' }, // "Ditolak"
};

export const radius = { sm: 10, md: 12, lg: 14, xl: 18, pill: 20 };
export const spacing = { xs: 6, sm: 8, md: 12, lg: 16, xl: 22 };
```

**Aturan gaya:**
- Font: system default (Segoe UI / Roboto / San Francisco).
- Tombol primary: background `royal`, teks putih, radius 12, bold.
- Tombol `ghost`: putih, teks `royal`, border `royal`.
- Tombol `navy`: background `navy`.
- Tombol `approve`: background `accent`; tombol `reject`: putih, teks & border `danger`.
- Header partisipan: background `navy`. Header admin: gradient `navy → blue`.
- Kartu (card): putih, border `line` 1px, radius 12–18, shadow lembut.
- Bottom nav: putih, tinggi ~58, border-top `line`, item aktif berwarna `navy`/bold.
- Badge status pakai token `badge` di atas.

---

## 3. STRUKTUR FOLDER

```
src/
  app/            # navigator + entry
    RootNavigator.tsx
    ParticipantTabs.tsx
    AdminTabs.tsx
  components/      # Button, Card, Field, Chip, Badge, UploadBox, ListItem, StatCard,
                  # BalanceCard, ReviewCard, Receipt, BottomNav, Header, PinInput
  screens/
    SplashScreen.tsx
    auth/LoginScreen.tsx
    participant/
      DashboardScreen.tsx
      ReimbursementScreen.tsx
      ReportScreen.tsx
      ProfileScreen.tsx
      AccountsScreen.tsx
      TransferProofScreen.tsx
      AboutScreen.tsx
    admin/
      AdminDashboardScreen.tsx
      InputFundScreen.tsx
      VerifyReimbursementScreen.tsx
      VerifyReportScreen.tsx
      UploadTransferProofScreen.tsx
  lib/            # supabase.ts, format.ts, validation (zod schemas)
  store/          # authStore.ts (zustand)
  types/          # models.ts
  theme.ts
```

---

## 4. DAFTAR LAYAR (14 layar + splash) — SPESIFIKASI DETAIL

### 0 · Splash — "Puzzle CIV"
- Background radial gradient biru gelap (`#0a4c86 → #06345c → #04263f`).
- Animasi: 4 kepingan puzzle (C, I, V, dan kotak titik) meluncur dari 4 sudut dan menyatu (durasi ±1,7s), lalu muncul brand text "My CIV-Project" / "PORTAL BEASISWA PPA" dan loader 3 titik memantul.
- Gunakan `react-native-reanimated` untuk animasi. Setelah selesai (± 2,5s) → cek sesi login → arahkan ke Login atau Dashboard sesuai role.

### AUTH

**P1 · Login (PIN)**
- Logo "CIV", judul, tagline.
- **Role toggle:** "Partisipan" / "Admin / Staf" (segmented control).
- Field: Email / NIM.
- **PIN input 6 digit** (6 kotak, terisi = border `royal`). Hint: "6 digit angka rahasia Anda".
- Tombol "Masuk". Link "Lupa PIN?".
- Setelah login → arahkan ke tab sesuai role.

### SISI PARTISIPAN (bottom nav: Beranda · Klaim · Laporan · Profil)

**P2 · Dashboard Beasiswa**
- Header: "Selamat datang, {nama}" + avatar inisial.
- **Balance card** (gradient navy→blue): Total Beasiswa Diterima, dengan baris Digunakan & Sisa Dana.
- Ringkasan: 2 stat card (Klaim Disetujui, Menunggu Verifikasi).
- Riwayat Pencairan: list item (judul, tanggal, nominal `+`).

**P3 · Pengajuan Reimbursement**
- Header back "Ajukan Pengembalian".
- Chip jenis: **Reimbursement** / **Pengembalian Sisa**.
- Field: Kategori (dropdown: UKT/Kuliah, Buku, Alat/Perlengkapan, Lainnya), Nominal (Rp), Keterangan (textarea).
- **Upload box** bukti (Kamera/Galeri/PDF, maks 5MB) + file pill preview + tombol hapus (✕).
- Tombol "Kirim Pengajuan".

**P4 · Upload Laporan Semester**
- Header back "Laporan Semester".
- Progress bar (mis. 3/4).
- Form unggah baru: Semester (dropdown), IPK Semester Ini, Berkas KHS/Transkrip (upload PDF).
- Tombol "Kirim Laporan".
- Riwayat Laporan: list (semester, IPK) + badge status (Terverifikasi/Menunggu).

**P5 · Profil Partisipan**
- Hero gradient: foto (inisial) + ikon kamera untuk ganti foto, nama, No. ID, tag "PENERIMA BEASISWA PPA".
- Card Data Diri: Nomor ID, Nama, Email, No. HP/WA, Jenis Kelamin, Universitas, Semester.
- Menu Pengaturan: Edit Profil, Rekening & E-Wallet (→ P6), Ubah PIN, Notifikasi, Tentang (→ P8), Bantuan & FAQ.
- Tombol "Keluar".

**P6 · Rekening & E-Wallet**
- Header back.
- Daftar rekening tujuan: **Kartu bank** (gradient navy→blue, tag "UTAMA", nomor tersamar `•••• 4821`) & **kartu e-wallet** (gradient royal→ungu).
- Form Tambah/Ubah: Jenis (Bank / E-Wallet), Nama Bank/E-Wallet, Nomor, Atas Nama.
- Hint verifikasi + tombol "Simpan Rekening".

**P7 · Bukti Transfer (dari Admin)**
- Header back.
- **Receipt card:** header hijau (✓ "Dana Berhasil Ditransfer" + nominal besar), body baris: Tanggal & Jam, Untuk, Dari, Bank Pengirim, Rekening Tujuan, No. Referensi, Status (Berhasil, warna accent).
- Lampiran bukti transfer (thumbnail gambar).
- Tombol "Unduh" (ghost) + "Konfirmasi Terima" (navy).

**P8 · Tentang My CIV-Project**
- Logo + nama, deskripsi, Visi, Misi, Apa yang Kami Tawarkan, Komitmen Kami. (Ambil teks dari mockup baris terkait — boleh persis.)

### SISI ADMIN / STAF (bottom nav: Dashboard · Input Dana · Verifikasi · Profil)

**A1 · Dashboard Admin**
- Header admin gradient + tag "ADMIN".
- Hero: Total Dana Tersalurkan + "45 partisipan aktif · Periode 2025/2026".
- 2 stat card: Klaim Perlu Verifikasi, Laporan Perlu Verifikasi.
- Search "Cari nama / NIM".
- Daftar Partisipan: list item (avatar inisial berwarna, nama, sisa dana, badge Aktif/Belum Lapor).

**A2 · Input Dana Beasiswa**
- Form: Pilih Partisipan (dropdown), Program Beasiswa, Periode, Nominal (Rp), Tanggal Pencairan, Catatan.
- Tombol "Simpan Draf" (ghost) + "Simpan & Cairkan" (navy).

**A3 · Verifikasi Reimbursement**
- Chip filter: Menunggu (n) / Disetujui / Ditolak.
- **Review card** per pengajuan: nama, ID, jenis, nominal, baris Kategori/Tanggal, thumbnail dokumen bukti.
- Tombol "Tolak" (reject) + "Setujui" (approve).

**A4 · Verifikasi Laporan Semester**
- Chip filter: Menunggu (n) / Terverifikasi / Revisi.
- Review card: nama, ID, semester, IPK, Status Kuliah, thumbnail KHS/transkrip.
- Tombol "Minta Revisi" (reject) + "Verifikasi" (approve).

**A5 · Unggah Bukti Transfer**
- Form: Kepada Partisipan (dropdown), Untuk Pencairan (dropdown), Nominal, Bank Pengirim, Rekening Tujuan, Tanggal Transfer, No. Referensi.
- Upload lampiran bukti (JPG/PNG/PDF maks 5MB) + file pill.
- Tombol "Kirim ke Partisipan" (navy) → muncul di P7 milik partisipan.

---

## 5. ALUR UTAMA (USER FLOWS)

1. **Pencairan:** Admin A2 (Input Dana) → dana masuk ke saldo partisipan (P2) → Admin A5 (upload bukti transfer) → Partisipan lihat di P7 → "Konfirmasi Terima".
2. **Reimbursement:** Partisipan P3 (ajukan + bukti) → status "Menunggu" → Admin A3 (Setujui/Tolak) → status update di P2 & riwayat.
3. **Laporan akademik:** Partisipan P4 (upload KHS + IPK) → Admin A4 (Verifikasi/Minta Revisi) → badge status update.

---

## 6. MODEL DATA (Supabase / Postgres)

```
profiles        (id, role['participant'|'admin'], full_name, id_number,
                 email, phone, gender, university, semester, photo_url, pin_hash)
scholarships    (id, participant_id, program, period, total_amount, created_by)
disbursements   (id, participant_id, scholarship_id, amount, period,
                 disbursed_at, note, status['draft'|'disbursed'])
reimbursements  (id, participant_id, type['reimburse'|'return'], category,
                 amount, description, proof_url,
                 status['pending'|'approved'|'rejected'], reviewed_by, reviewed_at)
reports         (id, participant_id, semester, gpa, file_url,
                 status['pending'|'verified'|'revision'], reviewed_by, reviewed_at)
accounts        (id, participant_id, kind['bank'|'ewallet'], provider,
                 number, holder_name, is_primary)
transfer_proofs (id, participant_id, disbursement_id, amount, sender_bank,
                 dest_account, transferred_at, reference_no, proof_url,
                 confirmed_by_participant bool)
```

**Turunan yang dihitung:** Sisa Dana = total pencairan − total reimbursement disetujui − penggunaan; "Total Beasiswa Diterima" = SUM(disbursements.disbursed).

**RLS:** partisipan hanya akses baris dengan `participant_id = auth.uid()`; admin (role='admin') akses semua.

---

## 7. CATATAN KEAMANAN (PENTING)

- **PIN JANGAN disimpan plaintext.** Hash PIN (bcrypt/argon2) di sisi server/edge function. Jangan pernah kirim/simpan PIN mentah.
- Nomor rekening ditampilkan tersamar (`•••• 4821`) di UI; simpan lengkap hanya di DB dengan akses terbatas.
- File upload: batasi tipe & ukuran (maks 5MB), gunakan signed URL untuk akses bukti/dokumen.
- Jangan taruh data sensitif di parameter URL / log.

---

## 8. MILESTONE PENGERJAAN (kerjakan berurutan)

- **M1 — Setup:** init Expo + TS, React Navigation, theme.ts, komponen dasar (Button, Card, Field, Badge, Header, BottomNav). Splash statis dulu.
- **M2 — Auth & navigasi:** LoginScreen + PinInput + role toggle, RootNavigator, ParticipantTabs, AdminTabs (pakai data dummy/mock).
- **M3 — UI Partisipan:** P2–P8 dengan data mock sesuai mockup (belum ada backend).
- **M4 — UI Admin:** A1–A5 dengan data mock.
- **M5 — Backend:** integrasi Supabase (auth, tabel §6, storage, RLS), ganti mock jadi query nyata.
- **M6 — Alur end-to-end:** hubungkan flow §5 (pencairan, reimbursement, laporan, bukti transfer).
- **M7 — Polish:** animasi splash puzzle, empty state, loading skeleton, validasi form (Zod), error handling, format Rupiah.

**Untuk tiap milestone:** tampilkan struktur file yang dibuat/diubah, lalu kode per file. Konfirmasi build jalan sebelum lanjut milestone berikutnya.

---

## 9. ACCEPTANCE / DEFINITION OF DONE

- [ ] Semua 14 layar + splash tampil sesuai `civ-mockup.html` (warna, layout, komponen).
- [ ] Navigasi 2 role berjalan (partisipan & admin) via bottom nav.
- [ ] Data mengalir sesuai 3 flow di §5.
- [ ] Format Rupiah konsisten, badge status benar.
- [ ] PIN di-hash; upload file tervalidasi; RLS aktif.
- [ ] Jalan di Android (Expo Go / build).

---

### Prompt pembuka singkat (tempel di VSCode untuk mulai M1)

> "Buatkan proyek Expo + React Native + TypeScript untuk aplikasi 'My CIV-Project' (portal beasiswa PPA). Ikuti design system dan struktur folder pada file `PROMPT-DEV-CIV-PROJECT.md`. Kerjakan **Milestone M1** saja dulu: setup proyek, `theme.ts`, dan komponen dasar (Button, Card, Field, Badge, Header, BottomNav). Referensi visual: `civ-mockup.html`. Tampilkan struktur file lalu isi tiap file. Jangan lanjut ke M2 sebelum saya konfirmasi."
