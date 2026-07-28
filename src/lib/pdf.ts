import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { DisbursementStatus, FullSemesterReport, MonthlyReport, UserProfile } from '../types/models';
import { buildFileUrl } from './api';
import { formatDate, formatRupiah } from './format';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

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
  const { html } = buildVerificationActHtml(input);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  return archiveGeneratedPdf(uri, {
    jenis: 'BERITAACARA',
    idNumber: input.participant.idNumber,
    dateIso: input.date,
    amount: input.amount ?? 0,
  });
}
