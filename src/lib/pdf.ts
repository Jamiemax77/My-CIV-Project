import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { FullSemesterReport, MonthlyReport, UserProfile } from '../types/models';
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
