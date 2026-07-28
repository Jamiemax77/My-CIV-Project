import { useState } from 'react';
import { api } from '../lib/api';
import { generateFullSemesterReportAdminPdf, shareOrDownloadPdf } from '../lib/pdf';
import { useArchiveStore } from '../store/archiveStore';
import { useAuthStore } from '../store/authStore';
import {
  AdminParticipant,
  BudgetItem,
  FullSemesterReport,
  KhsUpload,
  MonthlyReport,
  ReimbursementItem,
} from '../types/models';

/** "Cetak Laporan" for a verified Laporan Semester Lengkap — unlike the generic Berita Acara
 * Verifikasi (useVerificationActExport), this assembles the full combined document (proposal,
 * rincian dana, riwayat akademik, komitmen, KHS/KRS, dokumentasi per kategori, nota/kwitansi), so
 * it needs a lot more than the list-level report data. Those aren't available as list-level data,
 * so they're fetched imperatively here (not via useQuery) only when the admin actually presses
 * the button. */
export function useFullSemesterReportPrintExport() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const addEntry = useArchiveStore((s) => s.addEntry);
  const markShared = useArchiveStore((s) => s.markShared);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (report: FullSemesterReport, share: boolean) => {
    if (!user) return;
    setError(null);
    setExportingId(report.id);
    try {
      const [history, khsUploads, activities, budgetItems, participants, reimbursements] =
        await Promise.all([
          api.get<FullSemesterReport[]>(
            `/admin/participants/${report.participantId}/full-semester-reports`,
            token
          ),
          api.get<KhsUpload[]>(`/admin/participants/${report.participantId}/khs`, token),
          api.get<MonthlyReport[]>(`/admin/full-semester-reports/${report.id}/activities`, token),
          api.get<BudgetItem[]>(`/admin/full-semester-reports/${report.id}/budget-items`, token),
          api.get<AdminParticipant[]>('/admin/participants', token),
          api.get<ReimbursementItem[]>('/admin/reimbursements', token),
        ]);

      const participantProfile = participants.find((p) => p.profile.id === report.participantId)?.profile;

      // Bound the "Lampiran Nota & Kwitansi" to reimbursements approved during this specific
      // semester's reporting window — from the previous report's createdAt (exclusive) up to
      // this report's createdAt — so a participant's whole reimbursement history doesn't pile up
      // on every semester's printout.
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const currentIndex = sortedHistory.findIndex((r) => r.id === report.id);
      const previousReport = currentIndex > 0 ? sortedHistory[currentIndex - 1] : undefined;
      const windowStart = previousReport ? new Date(previousReport.createdAt).getTime() : -Infinity;
      const windowEnd = new Date(report.createdAt).getTime();
      const periodReimbursements = reimbursements.filter((r) => {
        if (r.participantId !== report.participantId || r.status !== 'approved') return false;
        const t = new Date(r.createdAt).getTime();
        return t > windowStart && t <= windowEnd;
      });

      const { uri, name } = await generateFullSemesterReportAdminPdf({
        report,
        history,
        khsUploads,
        activities,
        budgetItems,
        reimbursements: periodReimbursements,
        participant: {
          fullName: report.participantName ?? '-',
          idNumber: report.participantIdNumber ?? '-',
          major: participantProfile?.major,
          university: participantProfile?.university,
          targetIpk: participantProfile?.targetIpk,
          targetGraduationDate: participantProfile?.targetGraduationDate,
          ppaCompletionDate: participantProfile?.ppaCompletionDate,
        },
        admin: { fullName: user.fullName, idNumber: user.idNumber },
        token,
      });
      const entry = await addEntry({
        type: 'laporan_semester_lengkap',
        fileName: name,
        uri,
        participantName: report.participantName ?? '-',
        participantIdNumber: report.participantIdNumber ?? '-',
        amount: report.totalAmount ?? 0,
      });
      if (share) {
        await shareOrDownloadPdf(uri, name);
        await markShared(entry.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat laporan cetak.');
    } finally {
      setExportingId(null);
    }
  };

  return {
    exportingId,
    error,
    cetakLaporan: (report: FullSemesterReport) => run(report, false),
    bagikanLaporan: (report: FullSemesterReport) => run(report, true),
  };
}
