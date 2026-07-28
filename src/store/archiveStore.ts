import { create } from 'zustand';
import { secureStorage } from '../lib/secureStorage';

const ARCHIVE_KEY = 'civ_pdf_archive';

export type ArchiveDocType =
  | 'voucher_pencairan'
  | 'bukti_transfer'
  | 'berita_acara_verifikasi'
  | 'laporan_reimbursement'
  | 'laporan_semester_lengkap';

export const ARCHIVE_DOC_TYPE_LABEL: Record<ArchiveDocType, string> = {
  voucher_pencairan: 'Voucher Pencairan',
  bukti_transfer: 'Bukti Transfer',
  berita_acara_verifikasi: 'Berita Acara Verifikasi',
  laporan_reimbursement: 'Laporan Penggunaan Dana',
  laporan_semester_lengkap: 'Laporan Semester Lengkap',
};

export interface ArchiveEntry {
  id: string;
  type: ArchiveDocType;
  fileName: string;
  uri: string;
  participantName: string;
  participantIdNumber: string;
  amount: number;
  createdAt: string;
  shared: boolean;
}

interface ArchiveState {
  entries: ArchiveEntry[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addEntry: (entry: Omit<ArchiveEntry, 'id' | 'createdAt' | 'shared'>) => Promise<ArchiveEntry>;
  markShared: (id: string) => Promise<void>;
}

async function persist(entries: ArchiveEntry[]): Promise<void> {
  await secureStorage.setItemAsync(ARCHIVE_KEY, JSON.stringify(entries));
}

/** Device-local index of generated cashier PDFs (voucher/bukti transfer/berita acara) — the
 * files themselves live in `laporan-cashier/` (see lib/pdf.ts); this just tracks what's there
 * so the Arsip screen can list, re-open, and re-share them without re-scanning the filesystem. */
export const useArchiveStore = create<ArchiveState>((set, get) => ({
  entries: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const raw = await secureStorage.getItemAsync(ARCHIVE_KEY);
      set({ entries: raw ? JSON.parse(raw) : [], hydrated: true });
    } catch {
      set({ entries: [], hydrated: true });
    }
  },

  addEntry: async (input) => {
    const entry: ArchiveEntry = {
      ...input,
      id: `arc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      shared: false,
    };
    const entries = [entry, ...get().entries];
    set({ entries });
    await persist(entries);
    return entry;
  },

  markShared: async (id) => {
    const entries = get().entries.map((e) => (e.id === id ? { ...e, shared: true } : e));
    set({ entries });
    await persist(entries);
  },
}));
