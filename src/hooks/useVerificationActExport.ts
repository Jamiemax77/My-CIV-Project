import { useState } from 'react';
import { generateVerificationActPdf, shareOrDownloadPdf, VerificationActInput } from '../lib/pdf';
import { useArchiveStore } from '../store/archiveStore';
import { useAuthStore } from '../store/authStore';

type ActInput = Omit<VerificationActInput, 'admin'>;

/** Shared "Export PDF" / "Bagikan" behavior for Berita Acara Verifikasi, used identically by
 * VerifyReimbursementScreen, VerifyReportScreen and VerifyFullSemesterReportScreen — only the
 * per-item data going into ActInput differs between them. */
export function useVerificationActExport() {
  const user = useAuthStore((s) => s.user);
  const addEntry = useArchiveStore((s) => s.addEntry);
  const markShared = useArchiveStore((s) => s.markShared);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, input: ActInput, share: boolean) => {
    if (!user) return;
    setError(null);
    setExportingId(id);
    try {
      const { uri, name } = await generateVerificationActPdf({
        ...input,
        admin: { fullName: user.fullName, idNumber: user.idNumber },
      });
      const entry = await addEntry({
        type: 'berita_acara_verifikasi',
        fileName: name,
        uri,
        participantName: input.participant.fullName,
        participantIdNumber: input.participant.idNumber,
        amount: input.amount ?? 0,
      });
      if (share) {
        await shareOrDownloadPdf(uri, name);
        await markShared(entry.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF.');
    } finally {
      setExportingId(null);
    }
  };

  return {
    exportingId,
    error,
    exportPdf: (id: string, input: ActInput) => run(id, input, false),
    sharePdf: (id: string, input: ActInput) => run(id, input, true),
  };
}
