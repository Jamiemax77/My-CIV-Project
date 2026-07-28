import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import {
  BudgetItem,
  DisbursementStatus,
  FullSemesterReport,
  KhsUpload,
  MonthlyReport,
  MonthlyReportCategory,
  ReimbursementItem,
  UserProfile,
} from '../types/models';
import { buildFileUrl, guessMimeType } from './api';
import { isImageFileId } from './fileType';
import { formatDate, formatRupiah } from './format';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** expo-print's web implementation is a bare `window.print()` stub — it never returns
 * `{ uri }` the way native does, so `printToFileAsync` would otherwise fail deep inside with
 * an opaque destructuring error. Surface a clear message instead, before attempting it. */
function assertPdfGenerationSupported(): void {
  if (Platform.OS === 'web') {
    throw new Error('Export PDF hanya didukung di aplikasi Android/iOS, belum tersedia di web.');
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildFullSemesterReportHtml(
  report: FullSemesterReport,
  user: UserProfile,
  activities: MonthlyReport[]
): string {
  const semesterLabel = ROMAN[report.semesterNumber - 1] ?? String(report.semesterNumber);
  const activityRows = activities.length
    ? activities
        .map(
          (a) =>
            `<tr><td>${formatDate(a.reportDate)}</td><td>${escapeHtml(a.description ?? '-')}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="2" class="muted">Belum ada kegiatan terpilih.</td></tr>';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0c2233; padding: 24px; }
      h1 { font-size: 18px; text-align: center; color: #06345c; margin-bottom: 2px; }
      h2 { font-size: 11px; text-align: center; color: #7a8ca0; font-weight: normal; margin-top: 0; letter-spacing: 1px; }
      .section-title { font-size: 12px; font-weight: 700; color: #06345c; margin-top: 20px; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #dde6ef; padding: 6px 8px; text-align: left; }
      th { background: #e6f7ff; color: #06345c; }
      .muted { color: #7a8ca0; }
      .cover-letter { font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
      .meta-table td:first-child { width: 35%; font-weight: 700; color: #06345c; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(report.fileName || `Laporan Semester ${semesterLabel}`)}</h1>
    <h2>MY JURNAL &middot; PORTAL BEASISWA PPA</h2>

    <div class="section-title">Data Partisipan</div>
    <table class="meta-table">
      <tr><td>Nama</td><td>${escapeHtml(user.fullName)}</td></tr>
      <tr><td>Nomor ID</td><td>${escapeHtml(user.idNumber)}</td></tr>
      <tr><td>Jurusan</td><td>${escapeHtml(user.major || '-')}</td></tr>
      <tr><td>Universitas</td><td>${escapeHtml(user.university || '-')}</td></tr>
      <tr><td>Semester</td><td>${semesterLabel}</td></tr>
    </table>

    <div class="section-title">Data Akademik</div>
    <table class="meta-table">
      <tr><td>Tahun</td><td>${escapeHtml(report.year || '-')}</td></tr>
      <tr><td>SKS</td><td>${report.sks ?? '-'}</td></tr>
      <tr><td>IPS</td><td>${report.ips !== undefined ? report.ips.toFixed(2) : '-'}</td></tr>
      <tr><td>IPK</td><td>${report.ipk !== undefined ? report.ipk.toFixed(2) : '-'}</td></tr>
      <tr><td>Total Pengajuan</td><td>${report.totalAmount !== undefined ? formatRupiah(report.totalAmount) : '-'}</td></tr>
    </table>

    <div class="section-title">Kata Pengantar</div>
    <p class="cover-letter">${escapeHtml(report.coverLetter || '-')}</p>

    <div class="section-title">Catatan dan Dokumentasi (${activities.length} kegiatan)</div>
    <table>
      <thead><tr><th>Tanggal</th><th>Deskripsi</th></tr></thead>
      <tbody>${activityRows}</tbody>
    </table>
  </body>
</html>`;
}

/** Renders the full semester report to a local PDF file via `expo-print` (on-device, no server round trip). */
export async function generateFullSemesterReportPdf(
  report: FullSemesterReport,
  user: UserProfile,
  activities: MonthlyReport[]
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const html = buildFullSemesterReportHtml(report, user, activities);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const name = `${report.fileName || `Laporan-Semester-${report.semesterNumber}`}.pdf`;
  return { uri, name };
}

/** Opens a local file's share sheet so the participant can review/save it with any installed PDF viewer. */
export async function openLocalFile(uri: string, name: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
}

/** Downloads a previously-generated PDF from the backend's file store, then opens it the same way. */
export async function openRemotePdf(
  fileId: string,
  token: string | null,
  name: string
): Promise<void> {
  const localUri = `${FileSystem.cacheDirectory}${name}`;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  await FileSystem.downloadAsync(buildFileUrl(fileId), localUri, { headers });
  await openLocalFile(localUri, name);
}

/**
 * Downloads an authenticated file and returns it as a `data:` URI — `expo-print`'s HTML
 * renderer can't attach an Authorization header to an `<img src="...">` request the way
 * `AuthImage`/`openRemotePdf` do for on-screen previews, so embedding an image *inside* a
 * generated PDF needs the bytes inlined as base64 up front instead.
 *
 * The mime type is always derived from `fileId` itself (its `{category}__{participantId}__
 * {uuid}__{originalName}` format preserves the real extension) rather than trusting a
 * caller-supplied label — several call sites here pass a generic description ('dokumentasi',
 * 'pernyataan-partisipan', ...) that has no extension, which previously made every one of
 * those images embed as `application/octet-stream` and silently fail to render.
 */
async function fetchFileAsDataUri(fileId: string, token: string | null): Promise<string> {
  const localUri = `${FileSystem.cacheDirectory}${fileId}`;
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  await FileSystem.downloadAsync(buildFileUrl(fileId), localUri, { headers });
  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  return `data:${guessMimeType(fileId)};base64,${base64}`;
}

// ---------------------------------------------------------------------------
// Cashier documents (Voucher Pencairan, Bukti Transfer, Berita Acara Verifikasi)
// ---------------------------------------------------------------------------

type PersonRef = { fullName: string; idNumber: string };

const DOC_STYLE = `
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0c2233; padding: 24px; }
  h1 { font-size: 18px; text-align: center; color: #06345c; margin-bottom: 2px; }
  h2 { font-size: 11px; text-align: center; color: #7a8ca0; font-weight: normal; margin-top: 0; letter-spacing: 1px; }
  .section-title { font-size: 12px; font-weight: 700; color: #06345c; margin-top: 20px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #dde6ef; padding: 6px 8px; text-align: left; }
  .meta-table td:first-child { width: 35%; font-weight: 700; color: #06345c; }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #dde6ef; font-size: 10px; color: #7a8ca0; }
  .footer div { margin-top: 2px; }
`;

function docHeader(title: string): string {
  return `<h1>${escapeHtml(title)}</h1><h2>PORTAL BEASISWA PPA</h2>`;
}

function docFooter(admin: PersonRef, docNumber: string): string {
  return `<div class="footer">
    <div>Dicetak oleh: ${escapeHtml(admin.fullName)} (${escapeHtml(admin.idNumber)})</div>
    <div>Tanggal cetak: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    <div>No. Dokumen: ${escapeHtml(docNumber)}</div>
  </div>`;
}

/** Short, unique-enough-for-a-printed-document id — not a database key, just something a
 * cashier can quote back if a printed copy needs to be traced later. */
function generateDocNumber(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function sanitizeForFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '') || 'X';
}

/** `{JENIS}_{NomorID}_{YYYYMMDD}_{Nominal}.pdf`, e.g. PENCAIRAN_022410902_20260728_250000.pdf */
function buildArchiveFileName(jenis: string, idNumber: string, dateIso: string, amount: number): string {
  const d = new Date(dateIso);
  const yyyymmdd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${jenis}_${sanitizeForFilename(idNumber)}_${yyyymmdd}_${Math.round(amount)}.pdf`;
}

/**
 * Moves a freshly `printToFileAsync`-generated PDF (which otherwise lives wherever Print's
 * temp cache happens to be) into the permanent `laporan-cashier/` archive folder under
 * documentDirectory, using the naming convention cashiers can sort/search by.
 *
 * Web has no real filesystem (`FileSystem.documentDirectory` is null there), so on web this
 * just keeps the original blob URI — good enough for immediate share/download in the same
 * session, but it won't survive a page reload. Native (Android/iOS) gets a real permanent copy.
 */
async function archiveGeneratedPdf(
  tempUri: string,
  params: { jenis: string; idNumber: string; dateIso: string; amount: number }
): Promise<{ uri: string; name: string }> {
  const name = buildArchiveFileName(params.jenis, params.idNumber, params.dateIso, params.amount);
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return { uri: tempUri, name };
  }
  const dir = `${FileSystem.documentDirectory}laporan-cashier/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const uri = `${dir}${name}`;
  await FileSystem.copyAsync({ from: tempUri, to: uri });
  return { uri, name };
}

/**
 * Shares a PDF via the OS share sheet (WhatsApp/Email/Drive — admin picks, nothing is sent
 * automatically). On web, `expo-sharing` has no share sheet, so this falls back to triggering
 * a browser download of the same file instead.
 */
export async function shareOrDownloadPdf(uri: string, name: string): Promise<void> {
  if (Platform.OS === 'web') {
    const link = document.createElement('a');
    link.href = uri;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  await openLocalFile(uri, name);
}

const DISBURSEMENT_STATUS_LABEL: Record<DisbursementStatus, string> = {
  draft: 'Draf',
  disbursed: 'Dicairkan',
  sent: 'Bukti Terkirim',
};

export type DisbursementVoucherInput = {
  disbursement: {
    title: string;
    program?: string;
    period?: string;
    amount: number;
    disbursedAt: string;
    note?: string;
    status: DisbursementStatus;
  };
  participant: PersonRef;
  admin: PersonRef;
};

function buildDisbursementVoucherHtml(input: DisbursementVoucherInput): { html: string; docNumber: string } {
  const { disbursement: d, participant, admin } = input;
  const docNumber = generateDocNumber('VCR');
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>${DOC_STYLE}</style></head>
  <body>
    ${docHeader('VOUCHER PENCAIRAN')}
    <div class="section-title">Data Partisipan</div>
    <table class="meta-table">
      <tr><td>Nama</td><td>${escapeHtml(participant.fullName)}</td></tr>
      <tr><td>Nomor ID</td><td>${escapeHtml(participant.idNumber)}</td></tr>
    </table>
    <div class="section-title">Data Pencairan</div>
    <table class="meta-table">
      <tr><td>Program</td><td>${escapeHtml(d.program || '-')}</td></tr>
      <tr><td>Periode</td><td>${escapeHtml(d.period || '-')}</td></tr>
      <tr><td>Nominal</td><td>${escapeHtml(formatRupiah(d.amount))}</td></tr>
      <tr><td>Tanggal</td><td>${escapeHtml(formatDate(d.disbursedAt))}</td></tr>
      <tr><td>Catatan</td><td>${escapeHtml(d.note || '-')}</td></tr>
      <tr><td>Status</td><td>${escapeHtml(DISBURSEMENT_STATUS_LABEL[d.status])}</td></tr>
    </table>
    ${docFooter(admin, docNumber)}
  </body>
</html>`;
  return { html, docNumber };
}

/** Renders, then archives into `laporan-cashier/` — see `archiveGeneratedPdf`. */
export async function generateDisbursementVoucherPdf(
  input: DisbursementVoucherInput
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const { html } = buildDisbursementVoucherHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'PENCAIRAN',
    idNumber: input.participant.idNumber,
    dateIso: input.disbursement.disbursedAt,
    amount: input.disbursement.amount,
  });
}

export type TransferProofPdfInput = {
  proof: {
    disbursementTitle?: string;
    amount: number;
    method: 'transfer' | 'tunai';
    senderBank: string;
    destAccount: string;
    referenceNo: string;
    transferredAt: string;
    proofFileName?: string;
  };
  participant: PersonRef;
  admin: PersonRef;
};

function buildTransferProofHtml(input: TransferProofPdfInput): { html: string; docNumber: string } {
  const { proof: p, participant, admin } = input;
  const docNumber = generateDocNumber('TRF');
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>${DOC_STYLE}</style></head>
  <body>
    ${docHeader('BUKTI TRANSFER')}
    <div class="section-title">Data Partisipan</div>
    <table class="meta-table">
      <tr><td>Nama</td><td>${escapeHtml(participant.fullName)}</td></tr>
      <tr><td>Nomor ID</td><td>${escapeHtml(participant.idNumber)}</td></tr>
    </table>
    <div class="section-title">Data Transfer</div>
    <table class="meta-table">
      <tr><td>Untuk Pencairan</td><td>${escapeHtml(p.disbursementTitle || 'Transaksi Lainnya')}</td></tr>
      <tr><td>Nominal</td><td>${escapeHtml(formatRupiah(p.amount))}</td></tr>
      <tr><td>Metode</td><td>${escapeHtml(p.method === 'tunai' ? 'Tunai' : 'Transfer Bank')}</td></tr>
      <tr><td>Bank Pengirim</td><td>${escapeHtml(p.senderBank)}</td></tr>
      <tr><td>Rekening Tujuan</td><td>${escapeHtml(p.destAccount)}</td></tr>
      <tr><td>No. Referensi</td><td>${escapeHtml(p.referenceNo)}</td></tr>
      <tr><td>Tanggal</td><td>${escapeHtml(formatDate(p.transferredAt))}</td></tr>
      <tr><td>Lampiran</td><td>${escapeHtml(p.proofFileName || '-')}</td></tr>
    </table>
    ${docFooter(admin, docNumber)}
  </body>
</html>`;
  return { html, docNumber };
}

export async function generateTransferProofPdf(
  input: TransferProofPdfInput
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const { html } = buildTransferProofHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'BUKTITRANSFER',
    idNumber: input.participant.idNumber,
    dateIso: input.proof.transferredAt,
    amount: input.proof.amount,
  });
}

export type VerificationActInput = {
  kind: 'Klaim' | 'Laporan' | 'Lengkap';
  category?: string;
  amount?: number;
  date: string;
  decision: 'Disetujui' | 'Ditolak';
  reason?: string;
  participant: PersonRef;
  admin: PersonRef;
};

function buildVerificationActHtml(input: VerificationActInput): { html: string; docNumber: string } {
  const { kind, category, amount, date, decision, reason, participant, admin } = input;
  const docNumber = generateDocNumber('BAV');
  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><style>${DOC_STYLE}</style></head>
  <body>
    ${docHeader('BERITA ACARA VERIFIKASI')}
    <div class="section-title">Data Partisipan</div>
    <table class="meta-table">
      <tr><td>Nama</td><td>${escapeHtml(participant.fullName)}</td></tr>
      <tr><td>Nomor ID</td><td>${escapeHtml(participant.idNumber)}</td></tr>
    </table>
    <div class="section-title">Data Verifikasi</div>
    <table class="meta-table">
      <tr><td>Jenis</td><td>${escapeHtml(kind)}</td></tr>
      <tr><td>Kategori</td><td>${escapeHtml(category || '-')}</td></tr>
      <tr><td>Nominal</td><td>${amount !== undefined ? escapeHtml(formatRupiah(amount)) : '-'}</td></tr>
      <tr><td>Tanggal Pengajuan</td><td>${escapeHtml(formatDate(date))}</td></tr>
      <tr><td>Keputusan</td><td>${escapeHtml(decision)}</td></tr>
      <tr><td>Alasan</td><td>${escapeHtml(reason || '-')}</td></tr>
    </table>
    ${docFooter(admin, docNumber)}
  </body>
</html>`;
  return { html, docNumber };
}

export async function generateVerificationActPdf(
  input: VerificationActInput
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const { html } = buildVerificationActHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'BERITAACARA',
    idNumber: input.participant.idNumber,
    dateIso: input.date,
    amount: input.amount ?? 0,
  });
}

// ---------------------------------------------------------------------------
// Laporan Penggunaan Dana — per-item reimbursement (Klaim) export, admin Verifikasi screen.
// Unlike the other three docs above, this one embeds the participant's actual uploaded
// photos (Nota/Kwitansi + Dokumentasi Kegiatan) rather than just describing them in a table.
// ---------------------------------------------------------------------------

export type ReimbursementLaporanInput = {
  nomorPengajuan: string;
  description: string;
  amount: number;
  /** The reimbursement's createdAt — used for the archive filename, not shown in the doc. */
  date: string;
  proofFileId?: string;
  proofFileName?: string;
  usageProofFileId?: string;
  usageProofFileName?: string;
  participant: PersonRef;
  admin: PersonRef;
  token: string | null;
};

function reportImageBlock(dataUri: string | null, fileName: string | undefined): string {
  if (dataUri) {
    return `<img src="${dataUri}" class="report-image" />`;
  }
  return `<div class="report-image-missing">${escapeHtml(
    fileName ? `Berkas bukan gambar (${fileName}) — buka terpisah di Arsip.` : 'Belum ada berkas.'
  )}</div>`;
}

function buildReimbursementLaporanHtml(
  input: ReimbursementLaporanInput,
  proofDataUri: string | null,
  usageProofDataUri: string | null,
  docNumber: string
): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      ${DOC_STYLE}
      .report-title { font-size: 20px; text-align: center; color: #06345c; font-weight: 800; margin-bottom: 4px; }
      .report-subtitle { font-size: 12px; text-align: center; color: #7a8ca0; margin-top: 0; }
      .report-divider { border: none; border-top: 1px solid #dde6ef; margin: 16px 0; }
      .report-section-title { font-size: 13px; font-weight: 700; color: #0c2233; margin-top: 18px; margin-bottom: 8px; }
      .report-image { width: 100%; max-height: 320px; object-fit: contain; border: 1px solid #dde6ef; border-radius: 4px; display: block; }
      .report-image-missing { border: 1px dashed #dde6ef; border-radius: 4px; padding: 24px; text-align: center; color: #7a8ca0; font-size: 12px; }
      .report-keterangan { font-size: 13px; font-style: italic; color: #0c2233; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="report-title">LAPORAN PENGGUNAAN DANA</div>
    <div class="report-subtitle">Nomor ID Pengajuan : ${escapeHtml(input.nomorPengajuan)}</div>
    <hr class="report-divider" />

    <div class="report-section-title">1. Nota / Kwitansi / Bukti Pembayaran</div>
    ${reportImageBlock(proofDataUri, input.proofFileName)}

    <div class="report-section-title">2. Dokumentasi Kegiatan / Barang yang Dibeli / Jasa</div>
    ${reportImageBlock(usageProofDataUri, input.usageProofFileName)}

    <div class="report-section-title">3. Keterangan :</div>
    <p class="report-keterangan">${escapeHtml(input.description)}</p>
    ${docFooter(input.admin, docNumber)}
  </body>
</html>`;
}

/** Renders one reimbursement (Klaim) item as a standalone "Laporan Penggunaan Dana" PDF —
 * always per-item, called once per ReviewCard, never as a bulk export of the whole list. */
export async function generateReimbursementLaporanPdf(
  input: ReimbursementLaporanInput
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const proofDataUri =
    input.proofFileId && isImageFileId(input.proofFileId)
      ? await fetchFileAsDataUri(input.proofFileId, input.token)
      : null;
  const usageProofDataUri =
    input.usageProofFileId && isImageFileId(input.usageProofFileId)
      ? await fetchFileAsDataUri(input.usageProofFileId, input.token)
      : null;
  const docNumber = generateDocNumber('LPD');
  const html = buildReimbursementLaporanHtml(input, proofDataUri, usageProofDataUri, docNumber);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'LAPORAN-RMB',
    idNumber: input.participant.idNumber,
    dateIso: input.date,
    amount: input.amount,
  });
}

// ---------------------------------------------------------------------------
// Laporan Semester Lengkap (combined, admin-generated) — assembles one participant's full
// semester report into the multi-sheet layout admin asked for: Lembar 1 (permohonan +
// checklist + riwayat IPS/IPK + grafik), Lembar 2 (Pernyataan Partisipan), Lembar 3 (Komitmen
// Ortu/Wali), Lembar 4+ (KHS/KRS per semester yang sudah diunggah), Lembar terakhir (tabel
// dokumentasi kegiatan). Every embedded photo goes through fetchFileAsDataUri the same way
// the other cashier docs do.
// ---------------------------------------------------------------------------

type ChartPoint = { label: string; value: number };

/** Same layout math as components/LineChart.tsx (react-native-svg), rebuilt as a raw <svg>
 * string — react-native-svg components can't render inside HTML printed by expo-print, but
 * plain SVG markup can. */
function buildIpkChartSvg(data: ChartPoint[]): string {
  const height = 160;
  if (data.length === 0) {
    return `<div class="chart-empty">Belum ada data IPK.</div>`;
  }
  const width = 320;
  const paddingX = 26;
  const paddingY = 22;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const maxValue = 4;

  const points = data.map((d, i) => {
    const x = paddingX + (data.length > 1 ? (i / (data.length - 1)) * chartWidth : chartWidth / 2);
    const y = paddingY + chartHeight - (Math.min(d.value, maxValue) / maxValue) * chartHeight;
    return { x, y, ...d };
  });
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const marks = points
    .map(
      (p) => `
      <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#1f49f5" />
      <text x="${p.x}" y="${height - paddingY + 14}" font-size="9" fill="#7a8ca0" text-anchor="middle">${escapeHtml(p.label)}</text>
      <text x="${p.x}" y="${p.y - 8}" font-size="9" fill="#06345c" font-weight="700" text-anchor="middle">${p.value.toFixed(2)}</text>`
    )
    .join('');

  return `<svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <line x1="${paddingX}" y1="${paddingY}" x2="${paddingX}" y2="${height - paddingY}" stroke="#dde6ef" stroke-width="1" />
    <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" stroke="#dde6ef" stroke-width="1" />
    ${points.length > 1 ? `<polyline points="${polylinePoints}" fill="none" stroke="#1f49f5" stroke-width="2" />` : ''}
    ${marks}
  </svg>`;
}

const LSL_STYLE = `
  .page { }
  .page-break { page-break-after: always; }
  .letter-text { font-size: 13px; line-height: 1.6; margin: 4px 0; }
  .checklist-table td { border: none; padding: 4px 0; }
  .checklist-box { display: inline-block; width: 14px; height: 14px; border: 1.5px solid #06345c; text-align: center; line-height: 13px; font-size: 11px; font-weight: 700; margin-right: 8px; }
  .full-page-image { width: 100%; max-height: 620px; object-fit: contain; border: 1px solid #dde6ef; border-radius: 4px; display: block; margin-top: 8px; }
  .image-missing { border: 1px dashed #dde6ef; border-radius: 4px; padding: 40px; text-align: center; color: #7a8ca0; font-size: 12px; margin-top: 8px; }
  .chart-empty { padding: 40px; text-align: center; color: #7a8ca0; font-size: 12px; }
  .doc-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .doc-table th, .doc-table td { border: 1px solid #dde6ef; padding: 6px; text-align: left; vertical-align: top; }
  .doc-table th { background: #e6f7ff; color: #06345c; }
  .doc-table .no-col { width: 28px; text-align: center; }
  .doc-thumb { width: 110px; height: 110px; object-fit: cover; border-radius: 4px; }
  .budget-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .budget-table th, .budget-table td { border: 1px solid #dde6ef; padding: 6px; text-align: left; }
  .budget-table th { background: #e6f7ff; color: #06345c; }
  .budget-total-label { text-align: right; font-weight: 700; color: #06345c; }
  .budget-total-value { font-weight: 700; }
  .budget-total-final { font-size: 12px; background: #e6f7ff; }
  .riwayat-table { width: 100%; border-collapse: collapse; font-size: 11px; table-layout: fixed; }
  .riwayat-table td { border: 1px solid #dde6ef; padding: 5px 6px; text-align: center; }
  .riwayat-meta-label { background: #06345c; color: #ffffff; font-weight: 700; text-align: left !important; }
  .riwayat-meta-value { text-align: left !important; }
  .riwayat-label-cell { font-weight: 700; color: #06345c; text-align: left !important; width: 60px; }
  .riwayat-head-cell { background: #f6b989; font-weight: 700; color: #06345c; }
`;

function checkbox(done: boolean | undefined): string {
  return `<span class="checklist-box">${done ? '✓' : ''}</span>`;
}

function fullPageImageBlock(dataUri: string | null, missingLabel: string): string {
  return dataUri
    ? `<img src="${dataUri}" class="full-page-image" />`
    : `<div class="image-missing">${escapeHtml(missingLabel)}</div>`;
}

export type FullSemesterReportAdminPdfInput = {
  /** The specific report being exported — carries coverLetter, checklist, and this semester's
   * commitment statement file ids. */
  report: FullSemesterReport;
  /** All of the participant's non-draft reports (any semester), sorted ascending — for the
   * IPS/IPK history table + chart on Lembar 1. */
  history: FullSemesterReport[];
  /** Every KHS/KRS upload the participant has, any semester, sorted ascending — Lembar 4+. */
  khsUploads: KhsUpload[];
  /** Linked documentation photos for this specific report — split into 3 category tables. */
  activities: MonthlyReport[];
  /** "Rincian Penggunaan Dana" line items behind this report's total_amount. */
  budgetItems: BudgetItem[];
  /** Approved reimbursements from this semester's reporting window — "Lampiran Nota & Kwitansi". */
  reimbursements: ReimbursementItem[];
  participant: PersonRef & {
    major?: string;
    university?: string;
    targetIpk?: number;
    targetGraduationDate?: string;
    ppaCompletionDate?: string;
  };
  admin: PersonRef;
  token: string | null;
};

/** Matches the paper "Laporan Semester Lengkap" form — a fixed Semester 1-10 grid, printed in
 * full even for semesters the participant hasn't reported yet, rather than only listing rows
 * for semesters actually submitted. */
const RIWAYAT_SEMESTER_COUNT = 10;

function buildRiwayatTableHtml(
  history: FullSemesterReport[],
  major: string | undefined,
  university: string | undefined
): string {
  const reportBySemester = new Map(history.map((r) => [r.semesterNumber, r]));
  const semesters = Array.from({ length: RIWAYAT_SEMESTER_COUNT }, (_, i) => i + 1);

  const rowValues = (pick: (r: FullSemesterReport) => string | undefined) =>
    semesters
      .map((sem) => {
        const r = reportBySemester.get(sem);
        const value = r ? pick(r) : undefined;
        return `<td>${value !== undefined ? escapeHtml(value) : '-'}</td>`;
      })
      .join('');

  return `<table class="riwayat-table">
    <tr>
      <td class="riwayat-meta-label" style="width:70px;">JURUSAN :</td>
      <td class="riwayat-meta-value" colspan="4">${escapeHtml(major || '-')}</td>
      <td class="riwayat-meta-label" style="width:90px;">UNIVERSITAS :</td>
      <td class="riwayat-meta-value" colspan="5">${escapeHtml(university || '-')}</td>
    </tr>
    <tr>
      <td class="riwayat-label-cell riwayat-head-cell">Semester</td>
      ${semesters.map((sem) => `<td class="riwayat-head-cell">${sem}</td>`).join('')}
    </tr>
    <tr>
      <td class="riwayat-label-cell">Tahun</td>
      ${rowValues((r) => r.year)}
    </tr>
    <tr>
      <td class="riwayat-label-cell">SKS</td>
      ${rowValues((r) => (r.sks !== undefined ? String(r.sks) : undefined))}
    </tr>
    <tr>
      <td class="riwayat-label-cell">IPS</td>
      ${rowValues((r) => (r.ips !== undefined ? r.ips.toFixed(2) : undefined))}
    </tr>
    <tr>
      <td class="riwayat-label-cell">IPK</td>
      ${rowValues((r) => (r.ipk !== undefined ? r.ipk.toFixed(2) : undefined))}
    </tr>
  </table>`;
}

const ACTIVITY_CATEGORY_TITLE: Record<MonthlyReportCategory, string> = {
  kampus: 'Catatan dan Dokumentasi Kegiatan Kampus',
  ppa_cluster: 'Catatan dan Dokumentasi Kegiatan di PPA & Cluster',
  mentoring: 'Catatan dan Dokumentasi Kegiatan Mentoring',
};

function buildBudgetTableHtml(items: BudgetItem[], kontribusiOrtu: number, totalAmount: number): string {
  const jumlahKebutuhan = items.reduce((sum, item) => sum + item.jumlah, 0);
  const rows = items
    .map(
      (item, i) => `<tr>
        <td class="no-col">${i + 1}</td>
        <td>${escapeHtml(item.keterangan)}</td>
        <td>${item.unit}</td>
        <td>${escapeHtml(formatRupiah(item.satuan))}</td>
        <td>${escapeHtml(formatRupiah(item.jumlah))}</td>
      </tr>`
    )
    .join('');
  return `<table class="budget-table">
    <thead><tr><th class="no-col">No</th><th>Keterangan</th><th>Unit</th><th>Satuan</th><th>Jumlah</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="muted">Belum ada rincian.</td></tr>'}</tbody>
    <tfoot>
      <tr><td colspan="4" class="budget-total-label">Jumlah Kebutuhan</td><td class="budget-total-value">${escapeHtml(formatRupiah(jumlahKebutuhan))}</td></tr>
      <tr><td colspan="4" class="budget-total-label">Kontribusi Orangtua/Wali</td><td class="budget-total-value">${escapeHtml(formatRupiah(kontribusiOrtu))}</td></tr>
      <tr><td colspan="4" class="budget-total-label budget-total-final">Total Biaya CIV</td><td class="budget-total-value budget-total-final">${escapeHtml(formatRupiah(totalAmount))}</td></tr>
    </tfoot>
  </table>`;
}

const KWITANSI_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

function kwitansiMonthLabel(iso: string): string {
  const d = new Date(iso);
  return `${KWITANSI_MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

async function buildFullSemesterReportAdminHtml(
  input: FullSemesterReportAdminPdfInput,
  docNumber: string
): Promise<string> {
  const { report, history, khsUploads, activities, budgetItems, reimbursements, participant, admin } = input;

  const [participantStmtUri, guardianStmtUri] = await Promise.all([
    report.commitmentParticipantFileId && isImageFileId(report.commitmentParticipantFileId)
      ? fetchFileAsDataUri(report.commitmentParticipantFileId, input.token)
      : Promise.resolve(null),
    report.commitmentGuardianFileId && isImageFileId(report.commitmentGuardianFileId)
      ? fetchFileAsDataUri(report.commitmentGuardianFileId, input.token)
      : Promise.resolve(null),
  ]);

  const khsPages = await Promise.all(
    khsUploads
      .filter((k) => k.fileId || k.krsFileId)
      .map(async (k) => {
        const semLabel = ROMAN[k.semesterNumber - 1] ?? String(k.semesterNumber);
        const [khsUri, krsUri] = await Promise.all([
          k.fileId && isImageFileId(k.fileId) ? fetchFileAsDataUri(k.fileId, input.token) : Promise.resolve(null),
          k.krsFileId && isImageFileId(k.krsFileId)
            ? fetchFileAsDataUri(k.krsFileId, input.token)
            : Promise.resolve(null),
        ]);
        let html = '';
        if (k.fileId) {
          html += `<div class="section-title">KHS Semester ${semLabel}</div>
            ${fullPageImageBlock(khsUri, 'Berkas KHS bukan gambar — buka terpisah di Arsip.')}
            <div class="page-break"></div>`;
        }
        if (k.krsFileId) {
          html += `<div class="section-title">KRS Semester ${semLabel}</div>
            ${fullPageImageBlock(krsUri, 'Berkas KRS bukan gambar — buka terpisah di Arsip.')}
            <div class="page-break"></div>`;
        }
        return html;
      })
  );

  const activityThumbEntries = await Promise.all(
    activities.map(
      async (a) =>
        [
          a.id,
          a.fileId && isImageFileId(a.fileId) ? await fetchFileAsDataUri(a.fileId, input.token) : null,
        ] as const
    )
  );
  const activityThumbById = new Map(activityThumbEntries);

  function buildActivityTableHtml(items: MonthlyReport[]): string {
    const rows = items
      .map(
        (a, i) => `<tr>
          <td class="no-col">${i + 1}</td>
          <td>${
            activityThumbById.get(a.id)
              ? `<img src="${activityThumbById.get(a.id)}" class="doc-thumb" />`
              : escapeHtml('Bukan gambar')
          }</td>
          <td>${escapeHtml(formatDate(a.reportDate))}</td>
          <td>${escapeHtml(a.description || '-')}</td>
        </tr>`
      )
      .join('');
    return `<table class="doc-table">
      <thead><tr><th class="no-col">No</th><th>Dokumentasi</th><th>Tanggal</th><th>Catatan Kegiatan</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted">Belum ada dokumentasi.</td></tr>'}</tbody>
    </table>`;
  }

  const activitiesByCategory: Record<MonthlyReportCategory, MonthlyReport[]> = {
    kampus: activities.filter((a) => a.category === 'kampus'),
    ppa_cluster: activities.filter((a) => a.category === 'ppa_cluster'),
    mentoring: activities.filter((a) => a.category === 'mentoring'),
  };

  const reimbursementProofUris = await Promise.all(
    reimbursements.map((r) =>
      r.proofFileId && isImageFileId(r.proofFileId)
        ? fetchFileAsDataUri(r.proofFileId, input.token)
        : Promise.resolve(null)
    )
  );
  const kwitansiRows = reimbursements
    .map(
      (r, i) => `<tr>
        <td>${
          reimbursementProofUris[i]
            ? `<img src="${reimbursementProofUris[i]}" class="doc-thumb" />`
            : escapeHtml('Bukan gambar')
        }</td>
        <td>${escapeHtml(kwitansiMonthLabel(r.createdAt))}</td>
      </tr>`
    )
    .join('');

  const chartData: ChartPoint[] = history
    .filter((r) => r.ipk !== undefined)
    .map((r) => ({ label: ROMAN[r.semesterNumber - 1] ?? String(r.semesterNumber), value: r.ipk as number }));

  const riwayatTableHtml = buildRiwayatTableHtml(history, participant.major, participant.university);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${DOC_STYLE}${LSL_STYLE}</style>
  </head>
  <body>
    <div class="page">
      ${docHeader('LAPORAN SEMESTER LENGKAP')}
      <div class="section-title">Permohonan</div>
      <p class="letter-text">Yth. Pengurus dan Staff PPA Mawar Saron,</p>
      <p class="letter-text">${escapeHtml(report.coverLetter || '-')}</p>

      <div class="section-title">Rincian Penggunaan Dana</div>
      ${buildBudgetTableHtml(budgetItems, report.kontribusiOrtu ?? 0, report.totalAmount ?? 0)}

      <div class="section-title">Kelengkapan Laporan</div>
      <table class="checklist-table">
        <tr><td>${checkbox(report.checklist?.commitment)} Pernyataan Komitmen Partisipan &amp; Orang Tua/Wali</td></tr>
        <tr><td>${checkbox(report.checklist?.khs)} Kartu Hasil Studi (KHS)</td></tr>
        <tr><td>${checkbox(report.checklist?.activities)} Dokumentasi Kegiatan (minimal 5)</td></tr>
        <tr><td>${checkbox(report.checklist?.budget)} Rincian Penggunaan Dana</td></tr>
      </table>

      <div class="section-title">Riwayat IPS / IPK</div>
      ${riwayatTableHtml}

      <div class="section-title">Grafik IPK</div>
      ${buildIpkChartSvg(chartData)}

      <div class="section-title">Target Kelulusan</div>
      <table class="meta-table" style="width:100%;">
        <tr><td>Target IPK (saat lulus)</td><td>${participant.targetIpk !== undefined ? participant.targetIpk.toFixed(2) : '-'}</td></tr>
        <tr><td>Tanggal Lulus Kuliah</td><td>${participant.targetGraduationDate ? escapeHtml(formatDate(participant.targetGraduationDate)) : '-'}</td></tr>
        <tr><td>Tanggal Lulus PPA (Completion Date)</td><td>${participant.ppaCompletionDate ? escapeHtml(formatDate(participant.ppaCompletionDate)) : '-'}</td></tr>
      </table>
    </div>
    <div class="page-break"></div>

    <div class="page">
      <div class="section-title">Pernyataan Partisipan</div>
      ${fullPageImageBlock(participantStmtUri, 'Belum diunggah / bukan gambar.')}
    </div>
    <div class="page-break"></div>

    <div class="page">
      <div class="section-title">Komitmen Orang Tua / Wali</div>
      ${fullPageImageBlock(guardianStmtUri, 'Belum diunggah / bukan gambar.')}
    </div>
    <div class="page-break"></div>

    ${khsPages.join('')}

    <div class="page">
      <div class="section-title">${ACTIVITY_CATEGORY_TITLE.kampus}</div>
      ${buildActivityTableHtml(activitiesByCategory.kampus)}
    </div>
    <div class="page-break"></div>

    <div class="page">
      <div class="section-title">${ACTIVITY_CATEGORY_TITLE.ppa_cluster}</div>
      ${buildActivityTableHtml(activitiesByCategory.ppa_cluster)}
    </div>
    <div class="page-break"></div>

    <div class="page">
      <div class="section-title">${ACTIVITY_CATEGORY_TITLE.mentoring}</div>
      ${buildActivityTableHtml(activitiesByCategory.mentoring)}
    </div>
    <div class="page-break"></div>

    <div class="page">
      <div class="section-title">Lampiran Nota dan Kwitansi Pembayaran</div>
      <table class="doc-table">
        <thead><tr><th>Foto Kwitansi</th><th>Bulan</th></tr></thead>
        <tbody>${kwitansiRows || '<tr><td colspan="2" class="muted">Belum ada kwitansi pada periode ini.</td></tr>'}</tbody>
      </table>
    </div>
    ${docFooter(admin, docNumber)}
  </body>
</html>`;
}

/** Generates, then archives into laporan-cashier/ — same as the other cashier docs. Slower
 * than the others since it may embed a dozen-plus images (commitments + every KHS/KRS +
 * every documentation photo), all fetched up front as base64 data URIs. */
export async function generateFullSemesterReportAdminPdf(
  input: FullSemesterReportAdminPdfInput
): Promise<{ uri: string; name: string }> {
  assertPdfGenerationSupported();
  const docNumber = generateDocNumber('LSL');
  const html = await buildFullSemesterReportAdminHtml(input, docNumber);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'LAPORAN-SEMESTER',
    idNumber: input.participant.idNumber,
    dateIso: input.report.createdAt,
    amount: input.report.totalAmount ?? 0,
  });
}
