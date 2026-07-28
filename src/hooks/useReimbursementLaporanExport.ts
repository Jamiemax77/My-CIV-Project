import { useState } from 'react';
import { generateReimbursementLaporanPdf, ReimbursementLaporanInput, shareOrDownloadPdf } from '../lib/pdf';
import { useArchiveStore } from '../store/archiveStore';
import { useAuthStore } from '../store/authStore';

type LaporanInput = Omit<ReimbursementLaporanInput, 'admin' | 'token'>;

/** "Export PDF" / "Bagikan" for one reimbursement (Klaim) item — always per-item, one call
 * per ReviewCard, never a bulk export of the whole Klaim list. */
export function useReimbursementLaporanExport() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const addEntry = useArchiveStore((s) => s.addEntry);
  const markShared = useArchiveStore((s) => s.markShared);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, input: LaporanInput, share: boolean) => {
    if (!user) return;
    setError(null);
    setExportingId(id);
    try {
      const { uri, name } = await generateReimbursementLaporanPdf({
        ...input,
        admin: { fullName: user.fullName, idNumber: user.idNumber },
        token,
      });
      const entry = await addEntry({
        type: 'laporan_reimbursement',
        fileName: name,
        uri,
        participantName: input.participant.fullName,
        participantIdNumber: input.participant.idNumber,
        amount: input.amount,
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
    exportPdf: (id: string, input: LaporanInput) => run(id, input, false),
    sharePdf: (id: string, input: LaporanInput) => run(id, input, true),
  };
}
